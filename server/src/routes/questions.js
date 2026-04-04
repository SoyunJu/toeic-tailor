const express = require('express');
const router  = express.Router();
const { prisma } = require('../lib/prisma');

// GET /api/questions
router.get('/', async (req, res) => {
    try {
        const { part, questionType, difficulty, source, search } = req.query;

        const questions = await prisma.question.findMany({
            where: {
                ...(part         ? { part: parseInt(part) }     : {}),
                ...(questionType ? { questionType }              : {}),
                ...(difficulty   ? { difficulty }                : {}),
                ...(source       ? { source: { contains: source } } : {}),
                ...(search       ? { content: { contains: search } } : {}),
            },
            orderBy: [{ part: 'asc' }, { createdAt: 'desc' }],
        });

        res.json({ success: true, data: questions, total: questions.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/questions/:id
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { part, questionType, difficulty, content, options, answer, explanation } = req.body;

        const question = await prisma.question.update({
            where: { id },
            data: {
                ...(part         != null ? { part: parseInt(part) } : {}),
                ...(questionType         ? { questionType }          : {}),
                ...(difficulty           ? { difficulty }            : {}),
                ...(content              ? { content }               : {}),
                ...(options              ? { options }               : {}),
                ...(answer               ? { answer }                : {}),
                ...(explanation != null  ? { explanation }           : {}),
            },
        });

        res.json({ success: true, data: question });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/questions/:id
router.delete('/:id', async (req, res) => {
    try {
        await prisma.question.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ success: true, message: '삭제 완료' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;