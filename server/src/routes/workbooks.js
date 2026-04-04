const express     = require('express');
const router      = express.Router();
const { prisma }                          = require('../lib/prisma');
const { generateWorkbook, MIN_PAGES, COVER_PAGES } = require('../services/workbookGenerator');
const { publishWorkbook, publishBatchWorkbook } = require('../services/sweetbookClient');
const PDFDocument = require('pdfkit');
const archiver    = require('archiver');
const path = require('path');
const FONT_REGULAR = path.join(__dirname, '../fonts/NanumGothic.ttf');

// ─── 공통 SweetBook 연동 헬퍼 ───────────────────────────────
async function trySweetBookPublish({ student, workbook }) {
    try {
        console.log(`[SWEETBOOK] 시작: ${student.name} / workbookId=${workbook.id} / 문제수=${workbook.questions.length}`);
        console.log(`[SWEETBOOK] 예상 페이지: 문제${workbook.questions.length} + 표지${COVER_PAGES} = ${workbook.questions.length + COVER_PAGES}p (최소 ${MIN_PAGES}p)`);

        const published = await publishWorkbook({
            title:       `${student.name} 맞춤 문제집`,
            externalRef: `workbook-${workbook.id}`,
            questions:   workbook.questions.map(wq => wq.question),
            studentName: student.name,
        });

        console.log(`[SWEETBOOK] 완료: bookUid=${published.bookUid} / pageCount=${published.pageCount}`);

        await prisma.workbook.update({
            where: { id: workbook.id },
            data:  { bookUid: published.bookUid, bookStatus: 'FINALIZED' },
        });

        return published.bookUid;
    } catch (sbErr) {
        console.error(`[SWEETBOOK] 실패: ${student.name} / workbookId=${workbook.id}`);
        console.error(`[SWEETBOOK] 에러:`, {
            status:  sbErr.statusCode,
            message: sbErr.message,
            details: sbErr.details,
        });
        return null;
    }
}

// ─── POST /api/workbooks/generate ────────────────────────────
// 단일 학생 → singleMode: 최대한 문제 많이 뽑아 24p 채우기
router.post('/generate-batch', async (req, res) => {
    try {
        const { studentIds } = req.body;
        if (!studentIds?.length) {
            return res.status(400).json({ success: false, message: 'studentIds가 필요합니다.' });
        }

        res.setHeader('Content-Type',  'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection',    'keep-alive');
        res.flushHeaders();

        const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

        // 1단계: 각 학생별 문제집 DB 생성
        const workbookResults = [];
        let failed = 0;

        for (const studentId of studentIds) {
            const student = await prisma.student.findUnique({ where: { id: parseInt(studentId) } });
            if (!student) {
                send({ type: 'error', studentId, message: '학생을 찾을 수 없습니다.' });
                failed++;
                continue;
            }

            send({ type: 'start', studentId, name: student.name });
            console.log(`[BATCH] DB 생성: ${student.name}`);

            try {
                const { workbook, analysis } = await generateWorkbook(
                    parseInt(studentId),
                    { singleMode: false },
                );
                workbookResults.push({
                    student,
                    workbook,
                    analysis,
                    questions: workbook.questions.map(wq => wq.question),
                });
                send({ type: 'progress', studentId, name: student.name, message: '문제집 구성 완료' });
            } catch (err) {
                console.error(`[BATCH] DB 생성 실패: ${student.name} /`, err.message);
                send({ type: 'error', studentId, name: student.name, message: err.message });
                failed++;
            }
        }

        // 2단계: SweetBook 배치 발행 (책 1권에 합산)
        let bookUid = null;
        if (workbookResults.length > 0) {
            send({ type: 'sweetbook_start', message: 'SweetBook 발행 시작...' });
            try {
                const published = await publishBatchWorkbook({
                    students: workbookResults.map(r => ({
                        name:      r.student.name,
                        level:     r.student.level,
                        totalScore: r.student.totalScore,
                        questions: r.questions,
                    })),
                });
                bookUid = published.bookUid;
                console.log(`[BATCH] SweetBook 완료: bookUid=${bookUid}`);

                // 모든 workbook에 동일한 bookUid 저장
                for (const r of workbookResults) {
                    await prisma.workbook.update({
                        where: { id: r.workbook.id },
                        data:  { bookUid, bookStatus: 'FINALIZED' },
                    });
                }
            } catch (sbErr) {
                console.error(`[BATCH] SweetBook 실패:`, sbErr.message);
                send({ type: 'sweetbook_error', message: sbErr.message });
            }
        }

        // 3단계: 완료 이벤트
        for (const r of workbookResults) {
            send({
                type:       'done',
                studentId:  r.student.id,
                name:       r.student.name,
                workbookId: r.workbook.id,
                bookUid,
                summary:    r.analysis?.summary,
            });
        }

        send({ type: 'complete', succeeded: workbookResults.length, failed, total: studentIds.length });
        res.end();
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── GET /api/workbooks/:id ───────────────────────────────────
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

// ─── GET /api/workbooks/:id/pdf ───────────────────────────────
router.get('/:id/pdf', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const workbook = await prisma.workbook.findUnique({
            where:   { id },
            include: {
                student:   { select: { name: true, level: true, totalScore: true } },
                questions: {
                    include: { question: true },
                    orderBy: { pageOrder: 'asc' },
                },
            },
        });

        if (!workbook) {
            return res.status(404).json({ success: false, message: '문제집을 찾을 수 없습니다.' });
        }

        const doc      = new PDFDocument({ margin: 50, size: 'A4' });
        const filename = encodeURIComponent(workbook.student.name + '_맞춤문제집.pdf');

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename*=UTF-8\'\'' + filename);
        doc.pipe(res);

        buildWorkbookPdf(doc, {
            studentName: workbook.student.name,
            level: workbook.student.level,
            totalScore: workbook.student.totalScore,
            createdAt: workbook.createdAt,
            questions: workbook.questions,
        });

        doc.end();

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


// ─── POST /api/workbooks/pdf-zip ─────────────────────────────
router.post('/pdf-zip', async (req, res) => {
    try {
        const { workbookIds } = req.body;
        if (!workbookIds?.length) {
            return res.status(400).json({ success: false, message: 'workbookIds가 필요합니다.' });
        }

        const workbooks = await prisma.workbook.findMany({
            where:   { id: { in: workbookIds.map(Number) } },
            include: {
                student:   { select: { name: true, level: true, totalScore: true } },
                questions: {
                    include: { question: true },
                    orderBy: { pageOrder: 'asc' },
                },
            },
        });

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="workbooks.zip"');

        const archive = archiver('zip', { zlib: { level: 6 } });
        archive.pipe(res);

        for (const workbook of workbooks) {
            const pdfBuffer = await new Promise((resolve, reject) => {
                const doc    = new PDFDocument({ margin: 50, size: 'A4' });
                const chunks = [];
                doc.on('data',  chunk => chunks.push(chunk));
                doc.on('end',   ()    => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                buildWorkbookPdf(doc, {
                    studentName: workbook.student.name,
                    level: workbook.student.level,
                    totalScore: workbook.student.totalScore,
                    createdAt: workbook.createdAt,
                    questions: workbook.questions,
                });

                doc.end();
            });

            archive.append(pdfBuffer, { name: `${workbook.student.name}_맞춤기출.pdf` });
        }

        archive.finalize();
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


// PDF 문서 공통 생성 헬퍼
function buildWorkbookPdf(doc, {studentName, level, totalScore, createdAt, questions}) {
    // 폰트 등록
    doc.registerFont('Korean', FONT_REGULAR);

    // ── 표지 ──────────────────────────────────────────
    doc.font('Korean').fontSize(28).text('TOEIC Tailor', {align: 'center'});
    doc.moveDown(0.5);
    doc.fontSize(20).text(studentName + ' 맞춤 문제집', {align: 'center'});
    doc.moveDown(0.5);
    doc.fontSize(13).fillColor('gray')
        .text('Level: ' + level + '  |  Score: ' + totalScore, {align: 'center'});
    doc.moveDown(0.3);
    doc.fontSize(10)
        .text('생성일: ' + new Date(createdAt).toLocaleDateString('ko-KR'), {align: 'center'});

    // ── 문제 페이지 ────────────────────────────────────
    questions.forEach((wq, idx) => {
        const q = wq.question;
        doc.addPage();
        doc.fillColor('black').fontSize(11).font('Korean')
            .text('Q' + (idx + 1) + '.  [Part ' + q.part + ' / ' + q.questionType + ' / ' + q.difficulty + ']');
        doc.moveDown(0.3);
        doc.fontSize(10).text(q.content, {lineGap: 3});

        if (Array.isArray(q.options) && q.options.length) {
            doc.moveDown(0.3);
            q.options.forEach(opt => doc.text(opt, {lineGap: 2}));
        }
    });

    // ── 정답 모음 (마지막 페이지) ──────────────────────
    doc.addPage();
    doc.fillColor('black').fontSize(14).font('Korean')
        .text('[ 정답 모음 ]', {align: 'center'});
    doc.moveDown(1);

    const cols = 5;
    const colW = (doc.page.width - 100) / cols;
    let col = 0;
    let startX = 50;
    let currentY = doc.y;

    questions.forEach((wq, idx) => {
        const q = wq.question;
        const x = startX + (col % cols) * colW;
        const line = 'Q' + (idx + 1) + '. ' + q.answer;

        doc.fontSize(10).text(line, x, currentY, {width: colW, lineBreak: false});

        col++;
        if (col % cols === 0) {
            currentY += 20;
            if (currentY > doc.page.height - 80) {
                doc.addPage();
                currentY = 50;
            }
        }
    });
}


module.exports = router;