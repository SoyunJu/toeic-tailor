const express = require('express');
const router  = express.Router();
const { prisma } = require('../lib/prisma');

const SETTING_KEYS = [
    'WORKBOOK_DEFAULT_QUESTIONS',
    'WORKBOOK_MAX_QUESTIONS',
    'WORKBOOK_MIN_PAGES',
    'WORKBOOK_QUESTIONS_PER_PAGE',
    'AI_PROVIDER',
];

const DEFAULTS = {
    WORKBOOK_DEFAULT_QUESTIONS:  '20',
    WORKBOOK_MAX_QUESTIONS:      '23',
    WORKBOOK_MIN_PAGES:          '24',
    WORKBOOK_QUESTIONS_PER_PAGE: '3',
    AI_PROVIDER:                 'mock',
};

async function ensureDefaults() {
    for (const key of SETTING_KEYS) {
        await prisma.setting.upsert({
            where:  { key },
            update: {},
            create: { key, value: process.env[key] ?? DEFAULTS[key] },
        });
    }
}

function parseValue(key, value) {
    if (key === 'AI_PROVIDER') return value;
    return parseInt(value) || parseInt(DEFAULTS[key]);
}

// GET /api/settings
router.get('/', async (_req, res) => {
    try {
        await ensureDefaults();
        const rows = await prisma.setting.findMany({ where: { key: { in: SETTING_KEYS } } });
        const data = {};
        for (const row of rows) {
            data[row.key] = parseValue(row.key, row.value);
        }
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/settings  — 런타임 + DB 설정 변경
router.put('/', async (req, res) => {
    try {
        for (const key of SETTING_KEYS) {
            if (req.body[key] != null) {
                const value = String(req.body[key]);
                await prisma.setting.upsert({
                    where:  { key },
                    update: { value },
                    create: { key, value },
                });
                process.env[key] = value;
            }
        }

        const rows = await prisma.setting.findMany({ where: { key: { in: SETTING_KEYS } } });
        const data = {};
        for (const row of rows) {
            data[row.key] = parseValue(row.key, row.value);
        }

        console.log('[SETTINGS] 설정 변경 및 DB 저장:', data);
        res.json({ success: true, message: '설정이 저장되었습니다.', data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
