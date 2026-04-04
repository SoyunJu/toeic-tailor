const express  = require('express');
const router   = express.Router();
const { prisma }             = require('../lib/prisma');
const { generateWorkbook }   = require('../services/workbookGenerator');
const { publishWorkbook }    = require('../services/sweetbookClient');

// POST /api/workbooks/generate
router.post('/generate', async (req, res) => {
    try {
        const { studentId } = req.body;

        if (!studentId) {
            return res.status(400).json({ success: false, message: 'studentId가 필요합니다.' });
        }

        const { workbook, analysis, criteria } = await generateWorkbook(parseInt(studentId));

        // SweetBook 책 생성 + 최종화
        let bookUid = null;
        try {
            const student = await prisma.student.findUnique({ where: { id: parseInt(studentId) } });
            const published = await publishWorkbook({
                title:       `${student.name} 맞춤 문제집`,
                externalRef: `workbook-${workbook.id}`,
                questions:   workbook.questions.map(wq => wq.question),
            });
            bookUid = published.bookUid;

            await prisma.workbook.update({
                where: { id: workbook.id },
                data:  { bookUid, bookStatus: 'FINALIZED' },
            });
        } catch (sweetbookErr) {
            // SweetBook 실패해도 문제집 생성 자체는 성공 처리
            console.error('SweetBook 연동 실패:', sweetbookErr.message);
        }

        res.json({
            success: true,
            message: '문제집 생성 완료',
            data: {
                workbookId:      workbook.id,
                bookUid,
                studentId,
                totalQuestions:  workbook.questions.length,
                weakPartNums:    criteria.weakPartNums,
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
                student:   { select: { id: true, name: true, level: true, totalScore: true } },
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
                id:             workbook.id,
                bookUid:        workbook.bookUid,
                bookStatus:     workbook.bookStatus,
                orderStatus:    workbook.orderStatus,
                student:        workbook.student,
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


// POST /api/workbooks/generate-batch
router.post('/generate-batch', async (req, res) => {
    try {
        const { studentIds } = req.body;
        if (!studentIds?.length) {
            return res.status(400).json({ success: false, message: 'studentIds가 필요합니다.' });
        }
        // SSE로 진행상태 실시간 전송
        res.setHeader('Content-Type',  'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection',    'keep-alive');
        res.flushHeaders();

        const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

        let succeeded = 0, failed = 0;

        for (const studentId of studentIds) {
            const student = await prisma.student.findUnique({ where: { id: parseInt(studentId) } });
            if (!student) {
                send({ type: 'error', studentId, message: '학생을 찾을 수 없습니다.' });
                failed++;
                continue;
            }

            send({ type: 'start', studentId, name: student.name });

            try {
                const { workbook, analysis } = await generateWorkbook(parseInt(studentId));
                // SweetBook 연동
                const { publishWorkbook } = require('../services/sweetbookClient');
                let bookUid = null;
                try {
                    const published = await publishWorkbook({
                        title:       `${student.name} 맞춤 문제집`,
                        externalRef: `workbook-${workbook.id}`,
                        questions:   workbook.questions.map(wq => wq.question),
                        studentName: student.name,
                    });
                    bookUid = published.bookUid;
                    await prisma.workbook.update({
                        where: { id: workbook.id },
                        data:  { bookUid, bookStatus: 'FINALIZED' },
                    });
                } catch (sbErr) {
                    console.error('SweetBook 실패:', sbErr.message);
                }
                send({
                    type:       'done',
                    studentId,
                    name:       student.name,
                    workbookId: workbook.id,
                    bookUid,
                    summary:    analysis?.summary,
                });
                succeeded++;
            } catch (err) {
                send({ type: 'error', studentId, name: student.name, message: err.message });
                failed++;
            }
        }
        send({ type: 'complete', succeeded, failed, total: studentIds.length });
        res.end();
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;