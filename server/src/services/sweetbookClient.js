console.log("!!! CHECKING FILE LOADED AT:", __filename);

const { SweetbookClient } = require('bookprintapi-nodejs-sdk');

const sbClient = new SweetbookClient({
    apiKey:      process.env.SWEETBOOK_API_KEY,
    environment: 'sandbox',
});

const SPEC_UID      = process.env.SWEETBOOK_BOOK_SPEC_UID          || 'PHOTOBOOK_A4_SC';
const TPL_UID       = process.env.SWEETBOOK_CONTENT_TEMPLATE_UID   || '5tlNCJyTlfiE';
const COVER_TPL_UID = process.env.SWEETBOOK_COVER_TEMPLATE_UID     || '75HruEK3EnG5';

// 환경변수 기준
const MIN_PAGES   = parseInt(process.env.WORKBOOK_MIN_PAGES) || 24;
const COVER_PAGES = 1;


// 패딩용 토익 필수 어휘
const VOCAB_LIST = [
    'accomplish: 달성하다 / accumulate: 축적하다 / acknowledge: 인정하다',
    'adequate: 적절한 / adjacent: 인접한 / administration: 관리, 행정',
    'allocate: 할당하다 / anticipate: 예상하다 / approximately: 대략',
    'authorization: 승인 / beneficial: 유익한 / budget: 예산',
    'candidate: 후보자 / collaborate: 협력하다 / compensation: 보상',
    'comprehensive: 포괄적인 / confidential: 기밀의 / consecutive: 연속적인',
    'deadline: 마감 기한 / deteriorate: 악화되다 / distribute: 배포하다',
    'efficient: 효율적인 / eligible: 자격이 있는 / enhance: 향상시키다',
    'establish: 설립하다 / evaluate: 평가하다 / facilitate: 촉진하다',
    'headquarters: 본사 / implement: 실행하다 / inventory: 재고',
    'negotiate: 협상하다 / objective: 목표 / personnel: 직원',
    'preliminary: 예비의 / productive: 생산적인 / proficiency: 숙련도',
    'quarterly: 분기별 / regarding: ~에 관하여 / reimbursement: 환급',
    'renovate: 개조하다 / revenue: 수익 / sufficient: 충분한',
    'terminate: 종료하다 / thorough: 철저한 / versatile: 다재다능한',
];

// 문제 텍스트 포맷
function formatQuestionText(q, index) {
    const options     = Array.isArray(q.options) ? q.options.join('\n') : '';
    const explanation = q.explanation ? `\n[해설] ${q.explanation}` : '';
    return [
        `Q${index}. [Part ${q.part} / ${q.questionType} / ${q.difficulty}]`,
        '',
        q.content,
        '',
        options,
        '',
        `정답: ${q.answer}${explanation}`,
    ].join('\n');
}

// POST /books
async function createBook({ title, externalRef }) {
    return await sbClient.books.create({
        title,
        bookSpecUid: SPEC_UID,
        externalRef,
    });
}

// POST /books/{bookUid}/cover
async function addCover({ bookUid, title = 'TOEIC-tailor', studentName = '' }) {
    return await sbClient.covers.create(
        bookUid,
        COVER_TPL_UID,
        {
            childName:   studentName || 'TOEIC Student',
            schoolName:  title,
            volumeLabel: 'Vol.1',
            periodText:  `${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월`,
            coverPhoto:  'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800',
        },
        null,studentName
    );
}

// POST /books/{bookUid}/contents
async function addContent({ bookUid, text, studentName = '', title = '' }) {
    return await sbClient.contents.insert(
        bookUid,
        TPL_UID,
        {
            Student_Name:    studentName,
            '회차 및 Title': title,
            AI_Content:      text,
        },
        { breakBefore: 'page' },
    );
}

// POST /books/{bookUid}/finalization
async function finalizeBook(bookUid) {
    return await sbClient.books.finalize(bookUid);
}

// POST /orders
async function createOrder({ bookUid, quantity = 1, shipping, externalRef, idempotencyKey }) {
    return await sbClient.orders.create({
        items:          [{ bookUid, quantity }],
        shipping,
        externalRef,
        idempotencyKey: idempotencyKey || `order-${bookUid}-${Date.now()}`,
    });
}

// GET /orders/{orderUid}
async function getOrder(orderUid) {
    return await sbClient.orders.get(orderUid);
}

// POST /orders/{orderUid}/cancel
async function cancelOrder({ orderUid, cancelReason }) {
    return await sbClient.orders.cancel(orderUid, cancelReason);
}

// ─── 단일 학생용: 책 1권, 24p 보장 ────────────────────────────
async function publishWorkbook({ title, externalRef, questions, studentName = '' }) {
    const ref         = `${externalRef}-${Date.now()}`; // 중복 방지
    const { bookUid } = await createBook({ title, externalRef: ref });
    console.log(`[PUBLISH] 책 생성: bookUid=${bookUid}`);

    await addCover({ bookUid, title, studentName });
    console.log(`[PUBLISH] 표지 추가 완료`);

    const QUESTIONS_PER_PAGE = 3; // 한 페이지당 문제 수
    for (let i = 0; i < questions.length; i += QUESTIONS_PER_PAGE) {
        const chunk = questions.slice(i, i + QUESTIONS_PER_PAGE);
        const text  = chunk.map((q, j) => formatQuestionText(q, i + j + 1)).join('\n\n---\n\n');
        await addContent({ bookUid, text, studentName, title: `Q${i + 1}~Q${Math.min(i + QUESTIONS_PER_PAGE, questions.length)}` });
        process.stdout.write(`\r[PUBLISH] 페이지 추가: ${Math.ceil((i + QUESTIONS_PER_PAGE) / QUESTIONS_PER_PAGE)}/${Math.ceil(questions.length / QUESTIONS_PER_PAGE)}`);
    }
    console.log('');

    // 패딩
    const shortage = MIN_PAGES - (questions.length + COVER_PAGES);
    console.log(`[PUBLISH] 페이지 체크: ${questions.length + COVER_PAGES}p / 최소 ${MIN_PAGES}p / 부족 ${shortage}p`);

    if (shortage > 0) {
        const vocabPages = Math.min(shortage, VOCAB_LIST.length);
        for (let i = 0; i < vocabPages; i++) {
            await addContent({
                bookUid,
                text:        `[ 토익 필수 어휘 ]\n\n${VOCAB_LIST[i]}`,
                studentName,
                title:       `어휘 ${i + 1}`,
            });
            console.log(`[PUBLISH] 단어장 ${i + 1}/${vocabPages} 추가`);
        }
        const remaining = shortage - vocabPages;
        for (let i = 0; i < remaining; i++) {
            await addContent({ bookUid, text: ' ', studentName, title: ' ' });
            console.log(`[PUBLISH] 빈 페이지 ${i + 1}/${remaining} 추가`);
        }
    }

    console.log(`[PUBLISH] 최종화 시작`);
    const result = await finalizeBook(bookUid);
    console.log(`[PUBLISH] 최종화 완료: pageCount=${result.pageCount}`);
    return { bookUid, ...result };
}

// ─── 다수 학생 배치용: 책 1권에 전체 합산 후 finalization 1번 ──
async function publishBatchWorkbook({ students }) {
    const title       = `TOEIC 맞춤 문제집 (${students.length}명)`;
    const externalRef = `batch-${Date.now()}`;

    const { bookUid } = await createBook({ title, externalRef });
    console.log(`[BATCH_PUBLISH] 책 생성: bookUid=${bookUid}`);

    await addCover({ bookUid, title, studentName: students.map(s => s.name).join(', ') });
    console.log(`[BATCH_PUBLISH] 표지 추가 완료`);

    let totalContentPages = 0;

    for (const student of students) {
        // 학생 구분 헤더 페이지 (새 페이지에서 시작)
        await addContent({
            bookUid,
            text:        `[ ${student.name} 맞춤 문제 ]\nLevel: ${student.level}  |  Score: ${student.totalScore}`,
            studentName: student.name,
            title:       student.name,
        });
        totalContentPages++;
        console.log(`[BATCH_PUBLISH] ${student.name} 헤더 추가`);

        const QUESTIONS_PER_PAGE = 3;
        for (let i = 0; i < student.questions.length; i += QUESTIONS_PER_PAGE) {
            const chunk = student.questions.slice(i, i + QUESTIONS_PER_PAGE);
            const text  = chunk.map((q, j) => formatQuestionText(q, i + j + 1)).join('\n\n---\n\n');
            await addContent({ bookUid, text, studentName: student.name, title: `Q${i + 1}~Q${Math.min(i + QUESTIONS_PER_PAGE, student.questions.length)}` });
            totalContentPages++;
            process.stdout.write(`\r[BATCH_PUBLISH] ${student.name} 페이지 ${Math.ceil((i + QUESTIONS_PER_PAGE) / QUESTIONS_PER_PAGE)}/${Math.ceil(student.questions.length / QUESTIONS_PER_PAGE)}`);
        }
        console.log('');
    }

    // 패딩
    const shortage = MIN_PAGES - (totalContentPages + COVER_PAGES);
    console.log(`[BATCH_PUBLISH] 페이지 체크: ${totalContentPages + COVER_PAGES}p / 최소 ${MIN_PAGES}p / 부족 ${shortage}p`);

    if (shortage > 0) {
        const vocabPages = Math.min(shortage, VOCAB_LIST.length);
        for (let i = 0; i < vocabPages; i++) {
            await addContent({
                bookUid,
                text:        `[ 토익 필수 어휘 ]\n\n${VOCAB_LIST[i]}`,
                studentName: '',
                title:       `어휘 ${i + 1}`,
            });
            console.log(`[BATCH_PUBLISH] 단어장 ${i + 1}/${vocabPages} 추가`);
        }
        const remaining = shortage - vocabPages;
        for (let i = 0; i < remaining; i++) {
            await addContent({ bookUid, text: ' ', studentName: '', title: ' ' });
        }
    }

    console.log(`[BATCH_PUBLISH] 최종화 시작`);
    const result = await finalizeBook(bookUid);
    console.log(`[BATCH_PUBLISH] 최종화 완료: pageCount=${result.pageCount}`);
    return { bookUid, ...result };
}

module.exports = {
    createBook, addCover, addContent, finalizeBook,
    publishWorkbook, publishBatchWorkbook,
    createOrder, getOrder, cancelOrder,
};