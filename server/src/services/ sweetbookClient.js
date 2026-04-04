const { SweetbookClient } = require('bookprintapi-nodejs-sdk');

const sbClient = new SweetbookClient({
    apiKey:      process.env.SWEETBOOK_API_KEY,
    environment: 'sandbox',
});

const SPEC_UID      = process.env.SWEETBOOK_BOOK_SPEC_UID      || 'PHOTOBOOK_A4_SC';
const TPL_UID       = process.env.SWEETBOOK_CONTENT_TEMPLATE_UID || '5tlNCJyTlfiE';
const COVER_TPL_UID = process.env.SWEETBOOK_COVER_TEMPLATE_UID || '75HruEK3EnG5';

// 환경변수
const MIN_PAGES   = parseInt(process.env.WORKBOOK_MIN_PAGES) || 24;
const COVER_PAGES = 1;

// 토익 필수 어휘
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
            childName:   studentName || 'TOEIC 수강생',
            schoolName:  title,
            volumeLabel: 'Vol.1',
            periodText:  `${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월`,
            coverPhoto:  'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800',
        },
        null,
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

// 전체 플로우: 책생성 → 표지 → 콘텐츠 반복 → 최종화
async function publishWorkbook({ title, externalRef, questions, studentName = '' }) {
    const { bookUid } = await createBook({ title, externalRef });
    console.log(`[PUBLISH] 책 생성: bookUid=${bookUid} / 문제수=${questions.length}`);

    // 표지 추가
    await addCover({ bookUid, title, studentName });
    console.log(`[PUBLISH] 표지 추가 완료`);

    // 문제 페이지 추가
    for (let i = 0; i < questions.length; i++) {
        const text = formatQuestionText(questions[i], i + 1);
        await addContent({ bookUid, text, studentName, title: `Q${i + 1}` });
        process.stdout.write(`\r[PUBLISH] 문제 추가: ${i + 1}/${questions.length}`);
    }
    console.log('');

    // 최소 페이지 미달 시 패딩
    const currentPages = questions.length + COVER_PAGES;
    const shortage     = MIN_PAGES - currentPages;
    console.log(`[PUBLISH] 페이지 체크: currentPages=${currentPages} / MIN_PAGES=${MIN_PAGES} / shortage=${shortage}`);

    if (shortage > 0) {
        console.log(`[PUBLISH] 패딩 시작: ${shortage}p 추가`);

        const vocabPages = Math.min(shortage, VOCAB_LIST.length);
        for (let i = 0; i < vocabPages; i++) {
            await addContent({
                bookUid,
                text:        `[ 토익 필수 어휘 ]\n\n${VOCAB_LIST[i]}`,
                studentName,
                title:       `어휘 ${i + 1}`,
            });
            console.log(`[PUBLISH] 단어장 페이지 ${i + 1}/${vocabPages} 추가`);
        }

        const remaining = shortage - vocabPages;
        for (let i = 0; i < remaining; i++) {
            await addContent({ bookUid, text: ' ', studentName, title: ' ' });
            console.log(`[PUBLISH] 빈 페이지 ${i + 1}/${remaining} 추가`);
        }
    }

    console.log(`[PUBLISH] 최종화 시작: bookUid=${bookUid}`);
    const result = await finalizeBook(bookUid);
    console.log(`[PUBLISH] 최종화 완료: pageCount=${result.pageCount}`);
    return { bookUid, ...result };
}

module.exports = {
    createBook, addCover, addContent, finalizeBook, publishWorkbook,
    createOrder, getOrder, cancelOrder,
};