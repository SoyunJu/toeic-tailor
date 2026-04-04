const {SweetbookClient} = require('bookprintapi-nodejs-sdk');

const sbClient = new SweetbookClient({
    apiKey: process.env.SWEETBOOK_API_KEY,
    environment: 'sandbox',
});

const SPEC_UID = process.env.SWEETBOOK_BOOK_SPEC_UID || 'PHOTOBOOK_A4_SC';
const TPL_UID = process.env.SWEETBOOK_CONTENT_TEMPLATE_UID || '5tlNCJyTlfiE';
const COVER_TPL_UID = process.env.SWEETBOOK_COVER_TEMPLATE_UID || '75HruEK3EnG5';

// 토익 문제 텍스트 포맷
function formatQuestionText(q, index) {
    const options = Array.isArray(q.options) ? q.options.join('\n') : '';
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
async function createBook({title, externalRef}) {
    return await sbClient.books.create({
        title,
        bookSpecUid: SPEC_UID,
        externalRef,
    });
}

// POST /books/{bookUid}/cover
async function addCover({bookUid, title = 'TOEIC-tailor', studentName = ''}) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    return await sbClient.covers.create(
        bookUid,
        COVER_TPL_UID,
        {
            childName: studentName || 'TOEIC 학습자',
            schoolName: title,
            volumeLabel: 'Vol.1',
            periodText: `${year}년 ${month}월`,
            coverPhoto: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800',
        },
        null, // files
    );
}

// POST /books/{bookUid}/contents
async function addContent({bookUid, text, studentName = '', title = ''}) {
    try {
        return await sbClient.contents.insert(
            bookUid,
            TPL_UID,
            {
                Student_Name: studentName,
                '회차 및 Title': title,
                AI_Content: text,
            },
            {breakBefore: 'page'},
        );
    } catch (err) {
        // 상세 에러 로깅
        console.error('[addContent] 실패:', {
            status: err.statusCode,
            message: err.message,
            details: err.details,
            bookUid,
            title,
            textLength: text?.length,
        });
        throw err;
    }
}


// POST /books/{bookUid}/finalization
async function finalizeBook(bookUid) {
    return await sbClient.books.finalize(bookUid);
}

// POST /orders
async function createOrder({bookUid, quantity = 1, shipping, externalRef, idempotencyKey}) {
    return await sbClient.orders.create({
        items: [{bookUid, quantity}],
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
async function cancelOrder({orderUid, cancelReason}) {
    return await sbClient.orders.cancel(orderUid, cancelReason);
}

// 전체 플로우: 책생성 → 표지 → 콘텐츠 반복 → 최종화
async function publishWorkbook({title, externalRef, questions, studentName = ''}) {
    const MIN_PAGES = 24;

    const book = await createBook({title, externalRef});
    const bookUid = book.bookUid;

    await addCover({bookUid, title, studentName});

    for (let i = 0; i < questions.length; i++) {
        const text = formatQuestionText(questions[i], i + 1);
        await addContent({bookUid, text, studentName, title: `Q${i + 1}`});
    }

    // 최소 페이지 미달 시 빈 페이지 패딩
    const currentPages = questions.length + 1;
    if (currentPages < MIN_PAGES) {
        const padCount = MIN_PAGES - currentPages;
        for (let i = 0; i < padCount; i++) {
            await addContent({bookUid, text: '', studentName, title: ''});
        }
    }

    const result = await finalizeBook(bookUid);
    return {bookUid, ...result};
}

module.exports = {
    createBook, addCover, addContent, finalizeBook, publishWorkbook,
    createOrder, getOrder, cancelOrder,
};