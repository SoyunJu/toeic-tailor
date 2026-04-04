const express = require('express');
const router = express.Router();
const {prisma} = require('../lib/prisma');
const {createOrder, getOrder, cancelOrder} = require('../services/sweetbookClient');

// POST /api/orders
router.post('/', async (req, res) => {
    try {
        const {workbookId, quantity = 1, shipping} = req.body;

        if (!workbookId || !shipping) {
            return res.status(400).json({success: false, message: 'workbookId, shipping이 필요합니다.'});
        }

        // workbook 조회
        const workbook = await prisma.workbook.findUnique({
            where: {id: parseInt(workbookId)},
            include: {student: true},
        });

        if (!workbook) {
            return res.status(404).json({success: false, message: '문제집을 찾을 수 없습니다.'});
        }
        if (workbook.bookStatus !== 'FINALIZED') {
            return res.status(400).json({success: false, message: '최종화된 문제집만 주문할 수 있습니다.'});
        }
        if (!workbook.bookUid) {
            return res.status(400).json({success: false, message: 'bookUid가 없습니다. 문제집을 다시 생성해주세요.'});
        }

        // SweetBook 주문 생성
        const order = await createOrder({
            bookUid: workbook.bookUid,
            quantity,
            shipping,
            externalRef: `workbook-${workbookId}`,
            idempotencyKey: `order-wb-${workbookId}-${Date.now()}`,
        });

        // DB 저장
        await prisma.workbook.update({
            where: {id: workbook.id},
            data: {
                orderUid: order.orderUid,
                orderStatus: order.orderStatus,
            },
        });

        res.json({success: true, message: '주문 완료', data: order});
    } catch (err) {
        if (err.response) {
            return res.status(err.response.status).json({
                success: false,
                message: err.response.data?.message || '주문 실패',
                errors: err.response.data?.errors,
            });
        }
        res.status(500).json({success: false, message: err.message});
    }
});

// GET /api/orders
router.get('/', async (req, res) => {
    try {
        const workbooks = await prisma.workbook.findMany({
            where: {orderUid: {not: null}},
            include: {student: {select: {id: true, name: true, level: true}}},
            orderBy: {updatedAt: 'desc'},
        });

        // SweetBook 상태 폴링 (최신 상태 반영)
        const data = await Promise.all(
            workbooks.map(async (wb) => {
                try {
                    const latest = await getOrder(wb.orderUid);
                    // 상태 변경 시 DB 업데이트
                    if (latest.orderStatus !== wb.orderStatus) {
                        await prisma.workbook.update({
                            where: {id: wb.id},
                            data: {orderStatus: latest.orderStatus},
                        });
                    }
                    return {
                        workbookId: wb.id,
                        orderUid: wb.orderUid,
                        orderStatus: latest.orderStatus,
                        student: wb.student,
                        bookUid: wb.bookUid,
                    };
                } catch {
                    return {
                        workbookId: wb.id,
                        orderUid: wb.orderUid,
                        orderStatus: wb.orderStatus,
                        student: wb.student,
                        bookUid: wb.bookUid,
                    };
                }
            })
        );

        res.json({success: true, data});
    } catch (err) {
        res.status(500).json({success: false, message: err.message});
    }
});

// POST /api/orders/:id/cancel
router.post('/:id/cancel', async (req, res) => {
    try {
        const workbookId = parseInt(req.params.id);
        const {cancelReason} = req.body;

        if (!cancelReason) {
            return res.status(400).json({success: false, message: 'cancelReason이 필요합니다.'});
        }

        const workbook = await prisma.workbook.findUnique({where: {id: workbookId}});

        if (!workbook?.orderUid) {
            return res.status(404).json({success: false, message: '주문을 찾을 수 없습니다.'});
        }

        const result = await cancelOrder({orderUid: workbook.orderUid, cancelReason});

        await prisma.workbook.update({
            where: {id: workbookId},
            data: {orderStatus: 'CANCELLED'},
        });

        res.json({success: true, message: '주문 취소 완료', data: result});
    } catch (err) {
        if (err.response) {
            return res.status(err.response.status).json({
                success: false,
                message: err.response.data?.message || '취소 실패',
                errors: err.response.data?.errors,
            });
        }
        res.status(500).json({success: false, message: err.message});
    }
});

module.exports = router;