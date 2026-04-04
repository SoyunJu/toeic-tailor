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

module.exports = router;