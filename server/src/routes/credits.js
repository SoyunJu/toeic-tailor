const express   = require('express');
const router    = express.Router();
const { SweetbookClient } = require('bookprintapi-nodejs-sdk');

const sbClient = new SweetbookClient({
    apiKey:      process.env.SWEETBOOK_API_KEY,
    environment: 'sandbox',
});

// GET /api/credits  — 잔액 + 계정 정보
router.get('/', async (_req, res) => {
    try {
        const balance = await sbClient.credits.getBalance();
        res.json({ success: true, data: balance });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/credits/charge  — 샌드박스 충전
router.post('/charge', async (req, res) => {
    try {
        const { amount = 100000 } = req.body;
        const result = await sbClient.credits.sandboxCharge(amount, '수동 충전 (sandbox)');
        console.log(`[CREDITS] 충전 완료: ${amount}원`);
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;