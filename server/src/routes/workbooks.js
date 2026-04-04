const express  = require('express');
const router   = express.Router();
const { prisma }             = require('../lib/prisma');
const {generateWorkbook, MIN_PAGES, COVER_PAGES} = require('../services/workbookGenerator');
const { publishWorkbook }    = require('../services/sweetbookClient');
const PDFDocument = require('pdfkit');
const archiver = require('archiver');

// POST /api/workbooks/generate
router.post('/generate', async (req, res) => {
    try {
        const { studentId } = req.body;

        if (!studentId) {
            return res.status(400).json({ success: false, message: 'studentId가 필요합니다.' });
        }

        // 단일 학생 → singleMode: 최대한 문제 많이 뽑아 24p 채우기
        const {workbook, analysis, criteria} = await generateWorkbook(
            parseInt(studentId),
            {singleMode: true},
        );

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
                // 다수 학생 batch → singleMode: false (기본 문제 수 유지, 부족분 패딩)
                const { workbook, analysis } = await generateWorkbook(
                    parseInt(studentId),
                    { singleMode: false },
                );
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

// GET /api/workbooks/:id/pdf  — 단일 PDF 다운로드
router.get('/:id/pdf', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const workbook = await prisma.workbook.findUnique({
            where: {id},
            include: {
                student: {select: {name: true, level: true, totalScore: true}},
                questions: {
                    include: {question: true},
                    orderBy: {pageOrder: 'asc'},
                },
            },
        });

        if (!workbook) {
            return res.status(404).json({success: false, message: '문제집을 찾을 수 없습니다.'});
        }

        const doc = new PDFDocument({margin: 50, size: 'A4'});
        const filename = encodeURIComponent(`${workbook.student.name}_맞춤문제집.pdf`);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
        doc.pipe(res);

        // 표지
        doc.fontSize(24).font('Helvetica-Bold')
            .text('TOEIC Tailor', {align: 'center'});
        doc.moveDown(0.5);
        doc.fontSize(18).font('Helvetica')
            .text(`${workbook.student.name} 맞춤 문제집`, {align: 'center'});
        doc.moveDown(0.5);
        doc.fontSize(12).fillColor('gray')
            .text(`Level: ${workbook.student.level}  |  Score: ${workbook.student.totalScore}`, {align: 'center'});
        doc.moveDown(0.5);
        doc.fontSize(10)
            .text(`생성일: ${new Date(workbook.createdAt).toLocaleDateString('ko-KR')}`, {align: 'center'});

        // 문제 목록
        workbook.questions.forEach((wq, idx) => {
            const q = wq.question;
            doc.addPage();
            doc.fillColor('black').fontSize(11).font('Helvetica-Bold')
                .text(`Q${idx + 1}.  [Part ${q.part} / ${q.questionType} / ${q.difficulty}]`);
            doc.moveDown(0.3);
            doc.fontSize(10).font('Helvetica')
                .text(q.content, {lineGap: 3});

            if (Array.isArray(q.options) && q.options.length) {
                doc.moveDown(0.3);
                q.options.forEach(opt => {
                    doc.text(opt, {lineGap: 2});
                });
            }

            doc.moveDown(0.5);
            doc.fontSize(10).fillColor('#2563eb')
                .text(`정답: ${q.answer}`);

            if (q.explanation) {
                doc.moveDown(0.2);
                doc.fontSize(9).fillColor('#6b7280')
                    .text(`[해설] ${q.explanation}`);
            }
        });

        doc.end();
    } catch (err) {
        res.status(500).json({success: false, message: err.message});
    }
});

// POST /api/workbooks/pdf-zip
router.post('/pdf-zip', async (req, res) => {
    try {
        const {workbookIds} = req.body;
        if (!workbookIds?.length) {
            return res.status(400).json({success: false, message: 'workbookIds가 필요합니다.'});
        }

        const workbooks = await prisma.workbook.findMany({
            where: {id: {in: workbookIds.map(Number)}},
            include: {
                student: {select: {name: true, level: true, totalScore: true}},
                questions: {
                    include: {question: true},
                    orderBy: {pageOrder: 'asc'},
                },
            },
        });

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="workbooks.zip"');

        const archive = archiver('zip', {zlib: {level: 6}});
        archive.pipe(res);

        for (const workbook of workbooks) {
            // 각 문제집 PDF 버퍼 생성
            const pdfBuffer = await new Promise((resolve, reject) => {
                const doc = new PDFDocument({margin: 50, size: 'A4'});
                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // 표지
                doc.fontSize(24).font('Helvetica-Bold')
                    .text('TOEIC Tailor', {align: 'center'});
                doc.moveDown(0.5);
                doc.fontSize(18).font('Helvetica')
                    .text(`${workbook.student.name} 맞춤 문제집`, {align: 'center'});
                doc.moveDown(0.5);
                doc.fontSize(12).fillColor('gray')
                    .text(`Level: ${workbook.student.level}  |  Score: ${workbook.student.totalScore}`, {align: 'center'});

                workbook.questions.forEach((wq, idx) => {
                    const q = wq.question;
                    doc.addPage();
                    doc.fillColor('black').fontSize(11).font('Helvetica-Bold')
                        .text(`Q${idx + 1}.  [Part ${q.part} / ${q.questionType} / ${q.difficulty}]`);
                    doc.moveDown(0.3);
                    doc.fontSize(10).font('Helvetica').text(q.content, {lineGap: 3});

                    if (Array.isArray(q.options) && q.options.length) {
                        doc.moveDown(0.3);
                        q.options.forEach(opt => doc.text(opt, {lineGap: 2}));
                    }

                    doc.moveDown(0.5);
                    doc.fontSize(10).fillColor('#2563eb').text(`정답: ${q.answer}`);
                    if (q.explanation) {
                        doc.moveDown(0.2);
                        doc.fontSize(9).fillColor('#6b7280').text(`[해설] ${q.explanation}`);
                    }
                });

                doc.end();
            });

            archive.append(pdfBuffer, {name: `${workbook.student.name}_맞춤기출.pdf`});
        }

        archive.finalize();
    } catch (err) {
        res.status(500).json({success: false, message: err.message});
    }
});

module.exports = router;