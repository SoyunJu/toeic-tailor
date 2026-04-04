const express = require('express');
const router  = express.Router();
const { prisma }                             = require('../lib/prisma');
const { createOrder, getOrder, cancelOrder } = require('../services/sweetbookClient');
const { SweetbookClient }                    = require('bookprintapi-nodejs-sdk');

const sbClient = new SweetbookClient({
    apiKey:      process.env.SWEETBOOK_API_KEY,
    environment: 'sandbox',
});

// POST /api/orders  — 주문 생성 (테스트 자동 충전)
router.post('/', async (req, res) => {
    try {
        const { workbookId, quantity = 1, shipping } = req.body;

        if (!workbookId || !shipping) {
            return res.status(400).json({ success: false, message: 'workbookId, shipping이 필요합니다.' });
        }

        const workbook = await prisma.workbook.findUnique({
            where:   { id: parseInt(workbookId) },
            include: { student: true },
        });

        if (!workbook) {
            return res.status(404).json({ success: false, message: '문제집을 찾을 수 없습니다.' });
        }
        if (!workbook.bookUid) {
            return res.status(400).json({ success: false, message: 'bookUid가 없습니다. 문제집을 먼저 생성해주세요.' });
        }

        // 샌드박스 충전금 확인 후 부족하면 자동 충전
        try {
            const balance = await sbClient.credits.getBalance();
            console.log(`[ORDER] 충전금 잔액: ${balance.balance}`);
            if ((balance.balance || 0) < 50000) {
                await sbClient.credits.sandboxCharge(100000, '자동 충전 (sandbox)');
                console.log(`[ORDER] 샌드박스 충전 완료: 100,000원`);
            }
        } catch (creditErr) {
            console.error(`[ORDER] 충전금 확인 실패:`, creditErr.message);
        }

        // 주문 생성
        const order = await createOrder({
            bookUid:        workbook.bookUid,
            quantity,
            shipping,
            externalRef:    `workbook-${workbookId}-${Date.now()}`,
            idempotencyKey: `order-wb-${workbookId}-${Date.now()}`,
        });

        await prisma.workbook.update({
            where: { id: workbook.id },
            data:  {
                orderUid:    order.orderUid,
                orderStatus: String(order.orderStatus),  // Int → String 변환
            },
        });

        res.json({ success: true, message: '주문 완료', data: order });
    } catch (err) {
        if (err.response) {
            return res.status(err.response.status).json({
                success: false,
                message: err.response.data?.message || '주문 실패',
                errors:  err.response.data?.errors,
            });
        }
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/orders  — bookUid 있는 것 전부 반환
router.get('/', async (req, res) => {
    try {
        const workbooks = await prisma.workbook.findMany({
            where:   { bookUid: { not: null } },
            include: {
                student: {select: {id: true, name: true, level: true}},
                _count: {select: {questions: true}},
            },
            orderBy: { updatedAt: 'desc' },
        });

        const data = await Promise.all(
            workbooks.map(async (wb) => {
                let latestStatus = wb.orderStatus;
                if (wb.orderUid) {
                    try {
                        const latest = await getOrder(wb.orderUid);
                        latestStatus = String(latest.orderStatus);
                        if (String(latest.orderStatus) !== wb.orderStatus) {
                            await prisma.workbook.update({
                                where: { id: wb.id },
                                data:  { orderStatus: String(latest.orderStatus) },
                            });
                        }
                    } catch {}
                }
                return {
                    workbookId:  wb.id,
                    bookUid:     wb.bookUid,
                    bookStatus:  wb.bookStatus,
                    orderUid:    wb.orderUid,
                    orderStatus: latestStatus,
                    student:     wb.student,
                    createdAt:   wb.createdAt,
                    totalQuestions: wb._count?.questions ?? null,
                };
            })
        );

        const grouped = {};
        for (const item of data) {
            const key = item.bookUid || ('single-' + item.workbookId);
            if (!grouped[key]) {
                const date = new Date(item.createdAt).toLocaleDateString('ko-KR');
                grouped[key] = {
                    groupKey: key,
                    bookUid: item.bookUid,
                    orderUid: null,
                    orderStatus: item.orderStatus,
                    date,
                    members: [],
                };
            }
            grouped[key].members.push(item);
            if (item.orderUid) {
                grouped[key].orderUid    = item.orderUid;
                grouped[key].orderStatus = item.orderStatus;
            }
        }

        const groupedData = Object.values(grouped).map(g => ({
            ...g,
            title: g.date + ' / ' + g.members.length + '명',
            workbookIds: g.members.map(m => m.workbookId),
        }));

        res.json({success: true, data: groupedData, flat: data});
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/orders/:id/cancel
router.post('/:id/cancel', async (req, res) => {
    try {
        const workbookId       = parseInt(req.params.id);
        const { cancelReason } = req.body;

        if (!cancelReason) {
            return res.status(400).json({ success: false, message: 'cancelReason이 필요합니다.' });
        }

        const workbook = await prisma.workbook.findUnique({ where: { id: workbookId } });
        if (!workbook?.orderUid) {
            return res.status(404).json({ success: false, message: '주문을 찾을 수 없습니다.' });
        }

        const result = await cancelOrder({ orderUid: workbook.orderUid, cancelReason });
        await prisma.workbook.update({
            where: { id: workbookId },
            data:  { orderStatus: 'CANCELLED' },
        });

        res.json({ success: true, message: '주문 취소 완료', data: result });
    } catch (err) {
        if (err.response) {
            return res.status(err.response.status).json({
                success: false,
                message: err.response.data?.message || '취소 실패',
            });
        }
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;