const express  = require('express');
const router   = express.Router();
const { prisma }           = require('../lib/prisma');
const { generateWorkbook } = require('../services/workbookGenerator');

// POST /api/workbooks/generate
router.post('/generate', async (req, res) => {
    try {
        const { studentId } = req.body;

        if (!studentId) {
            return res.status(400).json({ success: false, message: 'studentId가 필요합니다.' });
        }

        const { workbook, analysis, criteria } = await generateWorkbook(parseInt(studentId));

        res.json({
            success: true,
            message: '문제집 생성 완료',
            data: {
                workbookId:   workbook.id,
                studentId,
                totalQuestions: workbook.questions.length,
                weakPartNums:   criteria.weakPartNums,
                difficultyRatio: criteria.difficultyRatio,
                analysis,
                questions: workbook.questions.map(wq => ({
                    pageOrder:    wq.pageOrder,
                    part:         wq.question.part,
                    questionType: wq.question.questionType,
                    difficulty:   wq.question.difficulty,
                    content:      wq.question.content,
                    options:      wq.question.options,
                    answer:       wq.question.answer,
                    explanation:  wq.question.explanation,
                })),
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/workbooks/:id
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const workbook = await prisma.workbook.findUnique({
            where: { id },
            include: {
                student: { select: { id: true, name: true, level: true, totalScore: true } },
                questions: {
                    include: { question: true },
                    orderBy: { pageOrder: 'asc' },
                },
            },
        });

        if (!workbook) {
            return res.status(404).json({ success: false, message: '문제집을 찾을 수 없습니다.' });
        }

        res.json({
            success: true,
            data: {
                id:           workbook.id,
                bookUid:      workbook.bookUid,
                bookStatus:   workbook.bookStatus,
                orderStatus:  workbook.orderStatus,
                student:      workbook.student,
                totalQuestions: workbook.questions.length,
                questions: workbook.questions.map(wq => ({
                    pageOrder:    wq.pageOrder,
                    part:         wq.question.part,
                    questionType: wq.question.questionType,
                    difficulty:   wq.question.difficulty,
                    content:      wq.question.content,
                    options:      wq.question.options,
                    answer:       wq.question.answer,
                    explanation:  wq.question.explanation,
                })),
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;