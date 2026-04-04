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

        const source = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

        // PDF 텍스트 추출
        const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
        pdfjsLib.GlobalWorkerOptions.workerSrc = false;

        const loadingTask = pdfjsLib.getDocument({data: new Uint8Array(req.file.buffer)});
        const pdfDoc = await loadingTask.promise;

        console.log(`[EXAM UPLOAD] 파일명: ${source}`);
        console.log(`[EXAM UPLOAD] 총 페이지 수: ${pdfDoc.numPages}`);

        let text = '';
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ') + '\n';
            text += pageText;

            // 페이지별 텍스트 길이 로깅 (처음 5페이지만)
            if (i <= 5) {
                console.log(`[EXAM UPLOAD] 페이지 ${i} 텍스트 길이: ${pageText.length}자`);
                console.log(`[EXAM UPLOAD] 페이지 ${i} 미리보기: ${pageText.slice(0, 100)}`);
            }
        }

        console.log(`[EXAM UPLOAD] 전체 추출 텍스트 길이: ${text.length}자`);
        console.log(`[EXAM UPLOAD] 텍스트 앞 500자:\n${text.slice(0, 500)}`);

        if (!text || text.trim().length < 50) {
            return res.status(400).json({ success: false, message: 'PDF에서 텍스트를 추출할 수 없습니다. 스캔본일 경우 OCR이 필요합니다.' });
        }

        // AI로 문제 추출 + 태깅
        console.log(`[EXAM UPLOAD] AI 분석 시작 (provider: ${process.env.AI_PROVIDER})`);
        const extracted = await ai.extractQuestionsFromText({ text, source });
        console.log(`[EXAM UPLOAD] AI 추출 완료: ${extracted.length}개`);
        if (extracted.length > 0) {
            console.log(`[EXAM UPLOAD] 첫 번째 추출 문제:`, JSON.stringify(extracted[0], null, 2));
        }

        // DB 저장
        let saved = 0;
        let duplicated = 0;

        for (const q of extracted) {
            try {
                // 동일 content로 기존 데이터 검색
                const existing = await prisma.question.findFirst({
                    where: {content: q.content},
                });

                if (existing) {
                    // 중복 -> duplicateCount 1 증가
                    await prisma.question.update({
                        where: {id: existing.id},
                        data: {
                            ...q,               // 최신화
                            duplicateCount: {increment: 1},
                            source,
                        },
                    });
                    duplicated++;
                    console.log(`[EXAM UPLOAD] 데이터 업데이트 및 카운트 증가: id=${existing.id}`);
                } else {
                    // 신규 등록
                    await prisma.question.create({
                        data: {...q, source},
                    });
                    saved++;
                }
            } catch (e) {
                console.error(`[EXAM UPLOAD] 저장 실패 (content 일부: ${q.content?.slice(0, 20)}):`, e.message);
            }
        }

        console.log(`[EXAM UPLOAD] DB 저장 완료: 신규 ${saved}개 / 중복 ${duplicated}개`);

        res.json({
            success: true,
            message: `기출 분석 완료`,
            data: {extracted: extracted.length, saved, duplicated, source, questions: extracted},
        });
    } catch (err) {
        console.error(`[EXAM UPLOAD] 에러:`, err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;