require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { createBook, addCover, addContent, finalizeBook } = require('../services/sweetbookClient');

async function run() {
    console.log('=== SweetBook Client Test ===');
    console.log('API_BASE:', process.env.SWEETBOOK_API_BASE_URL);
    console.log('API_KEY:', process.env.SWEETBOOK_API_KEY ? '--- 설정됨 ---' : '❌ 미설정');

    try {
        console.log('\n[1] POST /books');
        const book = await createBook({
            title: 'TEST 문제집',
            externalRef: 'test-001',
        });
        console.log('bookUid:', book.bookUid);

        console.log('\n[2] POST /books/{bookUid}/cover');
        const cover = await addCover({
            bookUid: book.bookUid,
            title: 'TEST 문제집',
            studentName: '테스트 학생',
        });
        console.log('cover result:', cover);

        console.log('\n[3] POST /books/{bookUid}/contents (문제 페이지 x24)');
        for (let i = 1; i <= 24; i++) {
            await addContent({
                bookUid: book.bookUid,
                text: `[Part 5 - GRAMMAR]\nQ${i}. The new software _____ by the IT department.\nA) installed  B) was installed\nC) has installed  D) installing\n정답: B`,
                studentName: '테스트 학생',
                title: `Q${i}`,
            });
            process.stdout.write(`  페이지 ${i}/24 추가\r`);
        }
        console.log('\n  완료');

        console.log('\n[4] POST /books/{bookUid}/finalization');
        const final = await finalizeBook(book.bookUid);
        console.log('finalized:', final);

    } catch (err) {
        if (err.response) {
            console.error('❌ 에러 status:', err.response.status);
            console.error('❌ 에러 body:', JSON.stringify(err.response.data, null, 2));
        } else {
            console.error('❌ 에러:', err.message);
        }
    }
}


run().catch(console.error);