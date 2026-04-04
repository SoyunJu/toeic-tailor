const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const { parseScoreExcel }  = require('../services/excelParser');
const { getLevel }         = require('../services/levelAnalyzer');
const { prisma }           = require('../lib/prisma');

const upload = multer({
storage: multer.memoryStorage(),
limits: { fileSize: 10 * 1024 * 1024 },
fileFilter: (_req, file, cb) => {
const allowed = [
'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
'application/vnd.ms-excel',
];
allowed.includes(file.mimetype)
? cb(null, true)
: cb(new Error('xlsx 또는 xls 파일만 업로드 가능합니다.'));
},
});

// POST /api/upload/scores
router.post('/scores', upload.single('file'), async (req, res) => {
try {
if (!req.file) {
return res.status(400).json({ success: false, message: '파일이 없습니다.' });
}

const source  = req.file.originalname;
const records = await parseScoreExcel(req.file.buffer);

if (records.length === 0) {
return res.status(400).json({ success: false, message: '파싱된 학생 데이터가 없습니다.' });
}

let created = 0, updated = 0, skipped = 0;

for (const record of records) {
const { name, takenAt, totalScore, lcScore, rcScore, ...partScores } = record;
const level = getLevel(totalScore);

let student = await prisma.student.findFirst({ where: { name } });

if (student) {
await prisma.student.update({
where: { id: student.id },
data: { totalScore, lcScore, rcScore, level },
});
updated++;
} else {
student = await prisma.student.create({
data: { name, totalScore, lcScore, rcScore, level },
});
created++;
}

const existing = await prisma.scoreRecord.findFirst({
where: { studentId: student.id, takenAt },
});

if (!existing) {
await prisma.scoreRecord.create({
data: { studentId: student.id, totalScore, lcScore, rcScore, ...partScores, takenAt, source },
});
} else {
skipped++;
}
}

res.json({
success: true,
message: '업로드 완료',
data: { total: records.length, created, updated, skipped },
});
} catch (err) {
res.status(500).json({ success: false, message: err.message });
}
});

const path = require('path');
const ai   = require('../ai/aiProvider');

const pdfUpload = multer({
    storage: multer.memoryStorage(),
    limits:  { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (_req, file, cb) => {
        file.mimetype === 'application/pdf'
            ? cb(null, true)
            : cb(new Error('PDF 파일만 업로드 가능합니다.'));
    },
});


// POST /api/upload/exam  — RC 기출 PDF 업로드 + AI 분석
router.post('/exam', pdfUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: '파일이 없습니다.' });
        }

        const source = req.file.originalname;

        // PDF 텍스트 추출
        const pdfParse = require('pdf-parse');
        const pdfData  = await pdfParse(req.file.buffer);
        const text     = pdfData.text;

        if (!text || text.trim().length < 50) {
            return res.status(400).json({ success: false, message: 'PDF에서 텍스트를 추출할 수 없습니다. 스캔본일 경우 OCR이 필요합니다.' });
        }

        // AI로 문제 추출 + 태깅
        const extracted = await ai.extractQuestionsFromText({ text, source });

        // DB 저장
        let saved = 0;
        for (const q of extracted) {
            try {
                await prisma.question.create({ data: { ...q, source } });
                saved++;
            } catch {
                // 중복 등 무시 TODO: 중복 제거 upsert 필요 여부 확인
            }
        }
        res.json({
            success: true,
            message: `기출 분석 완료`,
            data: { extracted: extracted.length, saved, source },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;