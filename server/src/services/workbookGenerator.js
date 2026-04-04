const {prisma} = require('../lib/prisma');
const ai = require('../ai/aiProvider');
const {getWeakParts} = require('./levelAnalyzer');


// TODO : 오답 이력 쌓이면 유형별 데이터로 GRAMMAR/VOCABULARY 재구성 (유사/동의/반어 등)
function getPart5TypeWeights(scoreRecord, level) {
    const part5Rate = scoreRecord.part5Correct != null
        ? scoreRecord.part5Correct / 30
        : null;

    // part5 정답률이 낮을수록 GRAMMAR 비중 UP
    if (part5Rate === null) return {GRAMMAR: 0.5, VOCABULARY: 0.5};

    if (level === 'BEGINNER' || level === 'INTERMEDIATE') {
        return part5Rate < 0.5
            ? {GRAMMAR: 0.65, VOCABULARY: 0.35} // 문법 집중
            : {GRAMMAR: 0.5, VOCABULARY: 0.5};
    } else {
        return part5Rate < 0.7
            ? {GRAMMAR: 0.35, VOCABULARY: 0.65} // 어휘 집중
            : {GRAMMAR: 0.4, VOCABULARY: 0.6};
    }
}

// 파트별 문제 수 배분
function calcPartDistribution({weakPartNums, totalQuestions, allParts}) {
    const WEIGHT_WEAK = 3; // 취약파트 가중치
    const WEIGHT_NORMAL = 1;

    const weights = {};
    for (const p of allParts) {
        weights[p] = weakPartNums.includes(p) ? WEIGHT_WEAK : WEIGHT_NORMAL;
    }

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const distribution = {};
    let assigned = 0;

    const entries = Object.entries(weights);
    entries.forEach(([part, w], idx) => {
        const isLast = idx === entries.length - 1;
        const count = isLast
            ? totalQuestions - assigned
            : Math.round((w / totalWeight) * totalQuestions);
        distribution[parseInt(part)] = Math.max(1, count);
        assigned += distribution[parseInt(part)];
    });

    return distribution;
}


// 난이도 → 문제 수
function ratioToCount(total, ratio) {
    return {
        LOW: Math.round(total * ratio.LOW),
        MEDIUM: Math.round(total * ratio.MEDIUM),
        HIGH: Math.round(total * ratio.HIGH),
    };
}


// 파트 + 난이도 + 유형 조건 GET
async function fetchQuestions({part, difficulty, count, excludeIds, questionType}) {
    if (count <= 0) return [];

    const where = {
        part,
        difficulty,
        id: {notIn: excludeIds.length ? excludeIds : [0]},
        ...(questionType ? {questionType} : {}),
    };

    const questions = await prisma.question.findMany({
        where,
        take: count,
        orderBy: {id: 'asc'},
    });

    return questions;
}

// 학생 ID → 개인화
async function generateWorkbook(studentId) {
    // 1. 학생 + 최신 점수 조회
    const student = await prisma.student.findUnique({
        where: {id: studentId},
        include: {
            scores: {orderBy: {takenAt: 'desc'}, take: 1},
        },
    });

    if (!student) throw new Error('학생을 찾을 수 없습니다.');
    if (!student.level) throw new Error('학생 레벨 정보가 없습니다. 점수를 먼저 입력하세요.');

    const latestScore = student.scores[0] ?? null;
    const weakParts = latestScore ? getWeakParts(latestScore) : [];

    // 2. AI로 선별 기준 생성
    const criteria = await ai.buildSelectionCriteria({
        level: student.level,
        weakParts,
    });

    const {weakPartNums, difficultyRatio, totalQuestions} = criteria;

    // 3. 사용 가능한 파트 목록 (DB에 있는 파트만)
    // TODO : DB 데이터 늘리고(RAG) + ai로 유사 문장 재구성해서 문제 변형
    const availableParts = await prisma.question.groupBy({
        by: ['part'],
        orderBy: {part: 'asc'},
    });
    const allParts = availableParts.map(p => p.part);

    // 4. 파트별 문제 수 배분
    const partDist = calcPartDistribution({weakPartNums, totalQuestions, allParts});

    // 5. 파트별 문제 뽑기
    const selectedQuestions = [];
    const usedIds = [];

    for (const [partStr, partCount] of Object.entries(partDist)) {
        const part = parseInt(partStr);
        const diffCounts = ratioToCount(partCount, difficultyRatio);

        if (part === 5 && latestScore) {
            // 파트5: GRAMMAR / VOCABULARY 유형 분리 배분
            const typeWeights = getPart5TypeWeights(latestScore, student.level);

            for (const difficulty of ['LOW', 'MEDIUM', 'HIGH']) {
                const total = diffCounts[difficulty];
                if (total <= 0) continue;

                const grammarCount = Math.round(total * typeWeights.GRAMMAR);
                const vocabCount = total - grammarCount;

                const [grammarQs, vocabQs] = await Promise.all([
                    fetchQuestions({
                        part,
                        difficulty,
                        count: grammarCount,
                        excludeIds: usedIds,
                        questionType: 'GRAMMAR'
                    }),
                    fetchQuestions({
                        part,
                        difficulty,
                        count: vocabCount,
                        excludeIds: usedIds,
                        questionType: 'VOCABULARY'
                    }),
                ]);

                [...grammarQs, ...vocabQs].forEach(q => {
                    selectedQuestions.push(q);
                    usedIds.push(q.id);
                });
            }
        } else {
            // 그 외 파트: 난이도별로 구성
            for (const difficulty of ['LOW', 'MEDIUM', 'HIGH']) {
                const count = diffCounts[difficulty];
                if (count <= 0) continue;

                const questions = await fetchQuestions({part, difficulty, count, excludeIds: usedIds});
                questions.forEach(q => {
                    selectedQuestions.push(q);
                    usedIds.push(q.id);
                });
            }
        }
    }

    if (selectedQuestions.length === 0) {
        throw new Error('선별된 문제가 없습니다. 문제 DB를 확인하세요.');
    }

    // 6. AI 학생 분석 코멘트 생성
    const analysis = await ai.analyzeStudent({
        name: student.name,
        level: student.level,
        totalScore: student.totalScore,
        weakParts,
    });

    // 7. Workbook + WorkbookQuestion DB 저장
    const workbook = await prisma.workbook.create({
        data: {
            studentId,
            questions: {
                create: selectedQuestions.map((q, idx) => ({
                    questionId: q.id,
                    pageOrder: idx + 1,
                })),
            },
        },
        include: {
            questions: {
                include: {question: true},
                orderBy: {pageOrder: 'asc'},
            },
        },
    });

    return {workbook, analysis, criteria};
}



module.exports = {generateWorkbook};