const express = require('express');
const router  = express.Router();
const { prisma }       = require('../lib/prisma');
const { getWeakParts } = require('../services/levelAnalyzer');

const CLASS_NAME_LABEL = {
    TARGET_600: '600목표반',
    TARGET_800: '800목표반',
    HIGH_SCORE: '고득점반',
};
const CLASS_TYPE_LABEL = {
    WEEKDAY: '평일반',
    WEEKEND: '주말반',
};

// GET /api/students
router.get('/', async (req, res) => {
    try {
        const { level, search, className, classType } = req.query;

        const students = await prisma.student.findMany({
            where: {
                ...(level     ? { level }                           : {}),
                ...(className ? { className }                       : {}),
                ...(classType ? { classType }                       : {}),
                ...(search    ? { name: { contains: search } }      : {}),
            },
            include: {
                scores: { orderBy: { takenAt: 'desc' }, take: 1 },
                _count: { select: { workbooks: true } },
            },
            orderBy: { totalScore: 'desc' },
        });

        const data = students.map(s => {
            const latest    = s.scores[0] ?? null;
            const weakParts = latest ? getWeakParts(latest).slice(0, 3) : [];
            return {
                id:             s.id,
                name:           s.name,
                level:          s.level,
                totalScore:     s.totalScore,
                lcScore:        s.lcScore,
                rcScore:        s.rcScore,
                className:      s.className,
                classNameLabel: CLASS_NAME_LABEL[s.className] ?? null,
                classType:      s.classType,
                classTypeLabel: CLASS_TYPE_LABEL[s.classType] ?? null,
                enrolledAt:     s.enrolledAt,
                expiresAt:      s.expiresAt,
                weakParts,
                workbookCount:  s._count.workbooks,
                lastTakenAt:    latest?.takenAt ?? null,
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
                scores:   { orderBy: { takenAt: 'desc' } },
                workbooks: {
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true, bookUid: true, bookStatus: true,
                        orderStatus: true, createdAt: true,
                        _count: { select: { questions: true } },
                    },
                },
            },
        });

        if (!student) {
            return res.status(404).json({ success: false, message: '학생을 찾을 수 없습니다.' });
        }

        const latest    = student.scores[0] ?? null;
        const weakParts = latest ? getWeakParts(latest) : [];

        res.json({
            success: true,
            data: {
                id:             student.id,
                name:           student.name,
                level:          student.level,
                totalScore:     student.totalScore,
                lcScore:        student.lcScore,
                rcScore:        student.rcScore,
                className:      student.className,
                classNameLabel: CLASS_NAME_LABEL[student.className] ?? null,
                classType:      student.classType,
                classTypeLabel: CLASS_TYPE_LABEL[student.classType] ?? null,
                enrolledAt:     student.enrolledAt,
                expiresAt:      student.expiresAt,
                weakParts,
                scores:         student.scores,
                workbooks:      student.workbooks,
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/students/:id
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, className, classType, enrolledAt, expiresAt } = req.body;

        const student = await prisma.student.update({
            where: { id },
            data: {
                ...(name      ? { name }                          : {}),
                ...(className ? { className }                     : {}),
                ...(classType ? { classType }                     : {}),
                enrolledAt: enrolledAt ? new Date(enrolledAt)     : undefined,
                expiresAt:  expiresAt  ? new Date(expiresAt)      : undefined,
            },
        });

        res.json({ success: true, data: student });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/students/:id
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await prisma.student.delete({ where: { id } });
        res.json({ success: true, message: '삭제 완료' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


// POST /api/students  (수동 등록)
router.post('/', async (req, res) => {
    try {
        const {
            name, totalScore, lcScore, rcScore,
            className, classType, enrolledAt, expiresAt,
            part1Correct, part2Correct, part3Correct, part4Correct,
            part5Correct, part6Correct, part7Correct,
        } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: '이름은 필수입니다.' });
        }

        const { getLevel } = require('../services/levelAnalyzer');
        const lc    = parseInt(lcScore)    || 0;
        const rc    = parseInt(rcScore)    || 0;
        const total = parseInt(totalScore) || (lc + rc);
        const level = getLevel(total);

        const student = await prisma.student.create({
            data: {
                name, level,
                totalScore: total, lcScore: lc, rcScore: rc,
                className:  className  || null,
                classType:  classType  || null,
                enrolledAt: enrolledAt ? new Date(enrolledAt) : null,
                expiresAt:  expiresAt  ? new Date(expiresAt)  : null,
            },
        });

        if (lc || rc) {
            await prisma.scoreRecord.create({
                data: {
                    studentId:    student.id,
                    totalScore:   total, lcScore: lc, rcScore: rc,
                    part1Correct: parseInt(part1Correct) || null,
                    part2Correct: parseInt(part2Correct) || null,
                    part3Correct: parseInt(part3Correct) || null,
                    part4Correct: parseInt(part4Correct) || null,
                    part5Correct: parseInt(part5Correct) || null,
                    part6Correct: parseInt(part6Correct) || null,
                    part7Correct: parseInt(part7Correct) || null,
                    takenAt:      new Date(),
                    source:       'manual',
                },
            });
        }

        res.status(201).json({ success: true, data: student });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;