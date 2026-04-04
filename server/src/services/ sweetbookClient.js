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

// 전체 플로우: 기출생성 → 표지 → 콘텐츠 반복 → 최종화
async function publishWorkbook({ title, externalRef, questions, studentName = '' }) {
    const { bookUid } = await createBook({ title, externalRef });

    // 표지 추가
    await addCover({ bookUid, title, studentName });

    // 문제 페이지 추가
    for (let i = 0; i < questions.length; i++) {
        const text = formatQuestionText(questions[i], i + 1);
        await addContent({ bookUid, text, studentName, title: `Q${i + 1}` });
    }

    // 최소 페이지 미달 시 패딩
    const currentPages = questions.length + COVER_PAGES; // 문제 + 표지
    const shortage     = MIN_PAGES - currentPages;

    if (shortage > 0) {
        console.log(`[PUBLISH] 페이지 부족: ${shortage}p 패딩 추가`);

        // 단어장 페이지로 우선 채우기
        // TODO : 기출 문제에서 단어 뽑아서 단어장 만들기.
        const vocabPages = Math.min(shortage, VOCAB_LIST.length);
        for (let i = 0; i < vocabPages; i++) {
            await addContent({
                bookUid,
                text:        `[ 토익 필수 어휘 ]\n\n${VOCAB_LIST[i]}`,
                studentName,
                title:       `어휘 ${i + 1}`,
            });
        }

        // 단어장으로도 부족하면 빈 페이지
        const remaining = shortage - vocabPages;
        for (let i = 0; i < remaining; i++) {
            await addContent({ bookUid, text: '', studentName, title: '' });
        }
    }

    const result = await finalizeBook(bookUid);
    return { bookUid, ...result };
}