const express = require('express');
const router  = express.Router();
const { prisma }      = require('../lib/prisma');
const { getWeakParts } = require('../services/levelAnalyzer');

// GET /api/students
router.get('/', async (req, res) => {
try {
const { level, search } = req.query;

const students = await prisma.student.findMany({
where: {
...(level  ? { level }                                  : {}),
...(search ? { name: { contains: search } }             : {}),
},
include: {
scores: {
orderBy: { takenAt: 'desc' },
take: 1, // 가장 최근 점수 1개만
},
_count: { select: { workbooks: true } },
},
orderBy: { totalScore: 'desc' },
});

const data = students.map(s => {
const latest = s.scores[0] ?? null;
const weakParts = latest ? getWeakParts(latest).slice(0, 3) : [];
return {
id:            s.id,
name:          s.name,
level:         s.level,
totalScore:    s.totalScore,
lcScore:       s.lcScore,
rcScore:       s.rcScore,
weakParts,                    // 취약파트 상위 3개
workbookCount: s._count.workbooks,
lastTakenAt:   latest?.takenAt ?? null,
};
});

res.json({ success: true, data });
} catch (err) {
res.status(500).json({ success: false, message: err.message });
}
});

// GET /api/students/:id
router.get('/:id', async (req, res) => {
try {
const id = parseInt(req.params.id);

const student = await prisma.student.findUnique({
where: { id },
include: {
scores: { orderBy: { takenAt: 'desc' } },
workbooks: {
orderBy: { createdAt: 'desc' },
select: {
id: true,
bookUid: true,
bookStatus: true,
orderStatus: true,
createdAt: true,
_count: { select: { questions: true } },
},
},
},
});

if (!student) {
return res.status(404).json({ success: false, message: '학생을 찾을 수 없습니다.' });
}

// 점수 이력 전체로 취약파트 분석
const latest    = student.scores[0] ?? null;
const weakParts = latest ? getWeakParts(latest) : [];

res.json({
success: true,
data: {
id:         student.id,
name:       student.name,
level:      student.level,
totalScore: student.totalScore,
lcScore:    student.lcScore,
rcScore:    student.rcScore,
weakParts,
scores:     student.scores,
workbooks:  student.workbooks,
},
});
} catch (err) {
res.status(500).json({ success: false, message: err.message });
}
});

module.exports = router;