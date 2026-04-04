const express = require('express');
const router  = express.Router();

// GET /api/settings
router.get('/', (_req, res) => {
    res.json({
        success: true,
        data: {
            WORKBOOK_DEFAULT_QUESTIONS: parseInt(process.env.WORKBOOK_DEFAULT_QUESTIONS) || 20,
            WORKBOOK_MAX_QUESTIONS:     parseInt(process.env.WORKBOOK_MAX_QUESTIONS)     || 23,
            WORKBOOK_MIN_PAGES:         parseInt(process.env.WORKBOOK_MIN_PAGES)         || 24,
            WORKBOOK_QUESTIONS_PER_PAGE: parseInt(process.env.WORKBOOK_QUESTIONS_PER_PAGE) || 3,
            AI_PROVIDER:                process.env.AI_PROVIDER || 'mock',
        },
    });
});

// PUT /api/settings  — 런타임 설정 변경
router.put('/', (req, res) => {
    const { WORKBOOK_DEFAULT_QUESTIONS, WORKBOOK_MAX_QUESTIONS, WORKBOOK_MIN_PAGES, AI_PROVIDER } = req.body;

    if (WORKBOOK_DEFAULT_QUESTIONS != null) {
        process.env.WORKBOOK_DEFAULT_QUESTIONS = String(parseInt(WORKBOOK_DEFAULT_QUESTIONS));
    }
    if (WORKBOOK_MAX_QUESTIONS != null) {
        process.env.WORKBOOK_MAX_QUESTIONS = String(parseInt(WORKBOOK_MAX_QUESTIONS));
    }
    if (WORKBOOK_MIN_PAGES != null) {
        process.env.WORKBOOK_MIN_PAGES = String(parseInt(WORKBOOK_MIN_PAGES));
    }
    if (WORKBOOK_QUESTIONS_PER_PAGE != null) {
        process.env.WORKBOOK_QUESTIONS_PER_PAGE = String(parseInt(WORKBOOK_QUESTIONS_PER_PAGE));
    }
    if (AI_PROVIDER != null) {
        process.env.AI_PROVIDER = AI_PROVIDER;
    }

    console.log('[SETTINGS] 설정 변경:', req.body);

    res.json({
        success: true,
        message: '설정이 변경되었습니다. (서버 재시작 전까지 유지)',
        data: {
            WORKBOOK_DEFAULT_QUESTIONS: parseInt(process.env.WORKBOOK_DEFAULT_QUESTIONS),
            WORKBOOK_MAX_QUESTIONS:     parseInt(process.env.WORKBOOK_MAX_QUESTIONS),
            WORKBOOK_MIN_PAGES:         parseInt(process.env.WORKBOOK_MIN_PAGES),
            AI_PROVIDER:                process.env.AI_PROVIDER,
        },
    });
});

module.exports = router;