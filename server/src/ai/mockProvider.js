
// 학생 분석 코멘트 생성 (mock)
async function analyzeStudent({ name, level, totalScore, weakParts }) {
    const weakStr = weakParts
        .slice(0, 3)
        .map(w => `Part ${w.part} (정답률 ${Math.round(w.rate * 100)}%)`)
        .join(', ');

    return {
        summary: `${name} 학생은 현재 ${level} 레벨(${totalScore}점)입니다.`,
        weakAnalysis: `취약 파트: ${weakStr}`,
        recommendation: '취약 파트 집중 학습과 함께 난이도별 단계적 접근을 권장합니다.',
    };
}

// 문제 선별 기준 생성 (mock)
async function buildSelectionCriteria({ level, weakParts }) {
    // 취약 파트 상위 3개에 문제를 집중 배분
    const weakPartNums = weakParts.slice(0, 3).map(w => w.part);

    // 레벨별 난이도 배분
    const difficultyMap = {
        BEGINNER:     { LOW: 0.6, MEDIUM: 0.3, HIGH: 0.1 },
        INTERMEDIATE: { LOW: 0.3, MEDIUM: 0.5, HIGH: 0.2 },
        ADVANCED:     { LOW: 0.1, MEDIUM: 0.4, HIGH: 0.5 },
        EXPERT:       { LOW: 0.0, MEDIUM: 0.3, HIGH: 0.7 },
    };

    return {
        weakPartNums,                          // 집중할 파트 번호 배열
        difficultyRatio: difficultyMap[level], // 난이도 비율
        totalQuestions: 20,                    // 문제집 총 문제수
    };
}

module.exports = { analyzeStudent, buildSelectionCriteria };