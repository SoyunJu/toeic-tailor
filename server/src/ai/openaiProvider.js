const OpenAI = require('openai');

const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

// 학생 분석 코멘트 생성
async function analyzeStudent({name, level, totalScore, weakParts}) {
    const weakStr = weakParts
        .slice(0, 3)
        .map(w => `Part ${w.part} (정답률 ${Math.round(w.rate * 100)}%)`)
        .join(', ');

    const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        messages: [
            {
                role: 'system',
                content: `당신은 토익 문제 분석 전문가입니다. 주어진 텍스트에서 토익 문제를 추출하고 JSON 배열로만 반환하세요.

파트 구분 기준 (반드시 준수):
- Part 5: 단문 빈칸 (문법/어휘) — 선택지 4개, 문장 1개에 빈칸
- Part 6: 장문 빈칸 — 지문 안에 빈칸이 있고 4개 선택지로 채우는 형태
- Part 7: 독해 — 지문을 읽고 질문에 답하는 형태 (빈칸 없음)

questionType 기준:
- GRAMMAR: Part 5, 문법 문제
- VOCABULARY: Part 5, 어휘 문제  
- SHORT_PASSAGE_FILL: Part 6
- SINGLE_PASSAGE: Part 7, 단일 지문
- DOUBLE_PASSAGE: Part 7, 두 개 지문 연계
- TRIPLE_PASSAGE: Part 7, 세 개 지문 연계

난이도 기준:
- LOW: 지문에 정답이 직접 언급됨
- MEDIUM: 약간의 추론 필요
- HIGH: 복잡한 추론 또는 여러 지문 연계 필요

각 문제 형식:
{
  "part": 5~7,
  "questionType": "위 기준 중 하나",
  "difficulty": "LOW"|"MEDIUM"|"HIGH",
  "content": "문제 본문 (지문 + 질문)",
  "options": ["A)...", "B)...", "C)...", "D)..."],
  "answer": "A"|"B"|"C"|"D",
  "explanation": "정답 근거 (지문의 어느 부분에서 알 수 있는지)"
}
JSON 배열만 반환. 추출 불가시 빈 배열 [].`,
            },
            {
                role: 'user',
                content: `학생명: ${name}, 레벨: ${level}, 총점: ${totalScore}, 취약파트: ${weakStr}\n위 데이터로 summary(1문장), weakAnalysis(1문장), recommendation(1문장)을 JSON으로만 반환하세요.`,
            },
        ],
    });

    try {
        const text = completion.choices[0].message.content.replace(/```json|```/g, '').trim();
        return JSON.parse(text);
    } catch {
        return {summary: '', weakAnalysis: weakStr, recommendation: ''};
    }
}

// 문제 선별 기준 생성
async function buildSelectionCriteria({level, weakParts}) {
    const weakStr = weakParts.slice(0, 3).map(w => `Part${w.part}`).join(', ');

    const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 200,
        messages: [
            {
                role: 'system',
                content: '토익 문제집 구성 전문가입니다. JSON만 반환하세요.',
            },
            {
                role: 'user',
                content: `레벨: ${level}, 취약파트: ${weakStr}
                다음 JSON 형식으로 문제 선별 기준을 반환하세요:
                    {
                      "weakPartNums": [취약파트 번호 배열],
                      "difficultyRatio": { "LOW": 0.0~1.0, "MEDIUM": 0.0~1.0, "HIGH": 0.0~1.0 },
                      "totalQuestions": ${parseInt(process.env.WORKBOOK_DEFAULT_QUESTIONS) || 20}
                    }
                difficultyRatio 합계는 반드시 1.0이어야 합니다.`,
            },
        ],
    });

    try {
        const text = completion.choices[0].message.content.replace(/```json|```/g, '').trim();
        return JSON.parse(text);
    } catch {
        // 파싱 실패 시 mock fallback
        const mock = require('./mockProvider');
        return mock.buildSelectionCriteria({level, weakParts});
    }
}

// PDF -> 문제 추출
async function extractQuestionsFromText({ text, source }) {
    const completion = await client.chat.completions.create({
        model:      'gpt-4o-mini',
        max_tokens: 2000,
        messages: [
            {
                role:    'system',
                content: `당신은 토익 문제 분석 전문가입니다. 주어진 텍스트에서 토익 문제를 추출하고 JSON 배열로만 반환하세요.
각 문제 형식:
{
  "part": 1~7,
  "questionType": "GRAMMAR"|"VOCABULARY"|"SHORT_RESPONSE"|"SINGLE_PASSAGE"|"SHORT_CONVERSATION"|"LONG_TALK"|"PHOTO_DESCRIPTION"|"SHORT_PASSAGE_FILL"|"DOUBLE_PASSAGE"|"TRIPLE_PASSAGE",
  "difficulty": "LOW"|"MEDIUM"|"HIGH",
  "content": "문제 본문",
  "options": ["A)...", "B)...", "C)...", "D)..."],
  "answer": "A"|"B"|"C"|"D",
  "explanation": "해설"
}
JSON 배열만 반환. 추출 불가시 빈 배열 [].`,
            },
            {
                role:    'user',
                content: `다음 텍스트에서 토익 문제를 추출해주세요:\n\n${text.slice(0, 8000)}`,
            },
        ],
    });

    try {
        const raw = completion.choices[0].message.content.replace(/```json|```/g, '').trim();
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

module.exports = { analyzeStudent, buildSelectionCriteria, extractQuestionsFromText };