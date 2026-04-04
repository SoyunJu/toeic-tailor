const axios = require('axios');
const FormData = require('form-data');

const BASE_URL = process.env.SWEETBOOK_API_BASE_URL;
const API_KEY = process.env.SWEETBOOK_API_KEY;
const SPEC_UID = process.env.SWEETBOOK_BOOK_SPEC_UID || 'PHOTOBOOK_A4_SC';
const TPL_UID = process.env.SWEETBOOK_CONTENT_TEMPLATE_UID || '2WUTEnJr37gK';
const COVER_TPL_UID = process.env.SWEETBOOK_COVER_TEMPLATE_UID || '75HruEK3EnG5';

const client = axios.create({
    baseURL: BASE_URL,
    headers: {Authorization: `Bearer ${API_KEY}`},
    timeout: 30000,
});

// 문제 텍스트 포맷
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
    const res = await client.post('/books', {
        title,
        bookSpecUid: SPEC_UID,
        externalRef,
    });
    return res.data.data; // { bookUid }
}

// POST /books/{bookUid}/cover
// { bookUid, title = 'Personal-TOEIC', author = 'TOEIC Tailor' }
async function addCover({bookUid, title = 'TOEIC 맞춤 문제집', studentName = ''}) {
    const form = new FormData();
    form.append('templateUid', COVER_TPL_UID);
    form.append('parameters', JSON.stringify({
        childName: studentName || 'TOEIC 학습자',
        schoolName: title,
        volumeLabel: 'Vol.1',
        periodText: new Date().getFullYear() + '년',
        // 커버 : MVP 기본 이미지 URL 사용
        coverPhoto: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800',
    }));

    const res = await client.post(
        `/books/${bookUid}/cover`,
        form,
        {headers: form.getHeaders()},
    );
    return res.data;
}

// POST /books/{bookUid}/contents
async function addContent({bookUid, text, studentName = '', title = ''}) {
    const form = new FormData();
    form.append('templateUid', TPL_UID);
    form.append('parameters', JSON.stringify({
        Student_Name: studentName,
        '회차 및 Title': title,
        AI_Content: text,
    }));

    const res = await client.post(
        `/books/${bookUid}/contents?breakBefore=page`,
        form,
        {headers: form.getHeaders()},
    );
    return res.data;
}

// POST /books/{bookUid}/finalization
async function finalizeBook(bookUid) {
    const res = await client.post(`/books/${bookUid}/finalization`);
    return res.data.data; // { pageCount, finalizedAt }
}

// 문제집 전체 플로우: 책생성 → 표지 → 콘텐츠 반복 → 최종화
async function publishWorkbook({title, externalRef, questions, studentName = ''}) {
    const MIN_PAGES = 24;
    const {bookUid} = await createBook({title, externalRef});

    await addCover({bookUid, title, studentName});

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


// POST /orders
async function createOrder({ bookUid, quantity = 1, shipping, externalRef, idempotencyKey }) {
    const res = await client.post(
        '/orders',
        {
            items: [{ bookUid, quantity }],
            shipping,
            externalRef,
        },
        {
            headers: { 'Idempotency-Key': idempotencyKey || `order-${bookUid}-${Date.now()}` },
        }
    );
    return res.data.data;
}

// GET /orders/{orderUid}
async function getOrder(orderUid) {
    const res = await client.get(`/orders/${orderUid}`);
    return res.data.data;
}

// POST /orders/{orderUid}/cancel
async function cancelOrder({ orderUid, cancelReason }) {
    const res = await client.post(`/orders/${orderUid}/cancel`, { cancelReason });
    return res.data;
}

module.exports = {
    createBook, addCover, addContent, finalizeBook, publishWorkbook,
    createOrder, getOrder, cancelOrder,
};


module.exports = {createBook, addCover, addContent, finalizeBook, publishWorkbook};