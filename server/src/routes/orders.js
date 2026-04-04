const express = require('express');
const router = express.Router();

router.post('/', async (_req, res) => {
res.json({ message: 'TODO: 주문 생성' });
});

router.get('/', async (_req, res) => {
res.json({ message: 'TODO: 주문 목록' });
});

router.post('/:id/cancel', async (req, res) => {
res.json({ message: `TODO: 주문 취소 id=${req.params.id}` });
});

module.exports = router;