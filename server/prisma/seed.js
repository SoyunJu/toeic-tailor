// ─── Mock use ──────────────────────────────────────────────

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ─── 헬퍼 ──────────────────────────────────────────────
function getLevel(total) {
if (total < 500) return 'BEGINNER';
if (total < 700) return 'INTERMEDIATE';
if (total < 850) return 'ADVANCED';
return 'EXPERT';
}

// 총점/파트점수 기반으로 파트별 정답수 계산 (weakPart는 취약 파트 번호)
function getPartScores(lc, rc, weakPart = null) {
const lr = lc / 495;
const rr = rc / 495;
const s = {
part1Correct: Math.min(6,  Math.round(6  * lr)),
part2Correct: Math.min(25, Math.round(25 * lr)),
part3Correct: Math.min(39, Math.round(39 * lr)),
part4Correct: Math.min(30, Math.round(30 * lr)),
part5Correct: Math.min(30, Math.round(30 * rr)),
part6Correct: Math.min(16, Math.round(16 * rr)),
part7Correct: Math.min(54, Math.round(54 * rr)),
};
if (weakPart) {
const key = `part${weakPart}Correct`;
s[key] = Math.max(0, Math.round(s[key] * 0.55));
}
return s;
}

// ─── 학생 데이터 (30명) ─────────────────────────────────
const RAW_STUDENTS = [
    {
        name: '김민준',
        lc: 150,
        rc: 160,
        weak: 5,
        className: 'TARGET_600',
        classType: 'WEEKDAY',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '이서연',
        lc: 195,
        rc: 225,
        weak: 7,
        className: 'TARGET_600',
        classType: 'WEEKEND',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '박지우',
        lc: 210,
        rc: 240,
        weak: 6,
        className: 'TARGET_600',
        classType: 'WEEKDAY',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '최다은',
        lc: 165,
        rc: 175,
        weak: 5,
        className: 'TARGET_600',
        classType: 'WEEKEND',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '정유진',
        lc: 230,
        rc: 250,
        weak: 7,
        className: 'TARGET_600',
        classType: 'WEEKDAY',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '강민서',
        lc: 245,
        rc: 265,
        weak: 7,
        className: 'TARGET_800',
        classType: 'WEEKDAY',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '윤지호',
        lc: 260,
        rc: 290,
        weak: 5,
        className: 'TARGET_800',
        classType: 'WEEKEND',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '임수빈',
        lc: 275,
        rc: 305,
        weak: 6,
        className: 'TARGET_800',
        classType: 'WEEKDAY',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '조현우',
        lc: 290,
        rc: 320,
        weak: 3,
        className: 'TARGET_800',
        classType: 'WEEKEND',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '한나연',
        lc: 300,
        rc: 330,
        weak: 7,
        className: 'TARGET_800',
        classType: 'WEEKDAY',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '신동현',
        lc: 310,
        rc: 335,
        weak: 5,
        className: 'TARGET_800',
        classType: 'WEEKEND',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '오세린',
        lc: 315,
        rc: 345,
        weak: 6,
        className: 'TARGET_800',
        classType: 'WEEKDAY',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '권민재',
        lc: 320,
        rc: 350,
        weak: 2,
        className: 'TARGET_800',
        classType: 'WEEKEND',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '문채원',
        lc: 250,
        rc: 270,
        weak: 7,
        className: 'TARGET_800',
        classType: 'WEEKDAY',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '노준혁',
        lc: 330,
        rc: 350,
        weak: 5,
        className: 'TARGET_800',
        classType: 'WEEKEND',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '백서윤',
        lc: 350,
        rc: 360,
        weak: 7,
        className: 'HIGH_SCORE',
        classType: 'WEEKDAY',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '허재원',
        lc: 360,
        rc: 370,
        weak: 5,
        className: 'HIGH_SCORE',
        classType: 'WEEKEND',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '남지민',
        lc: 365,
        rc: 385,
        weak: 6,
        className: 'HIGH_SCORE',
        classType: 'WEEKDAY',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '류하은',
        lc: 375,
        rc: 395,
        weak: 7,
        className: 'HIGH_SCORE',
        classType: 'WEEKEND',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '심민호',
        lc: 385,
        rc: 405,
        weak: 3,
        className: 'HIGH_SCORE',
        classType: 'WEEKDAY',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '전은지',
        lc: 390,
        rc: 410,
        weak: 5,
        className: 'HIGH_SCORE',
        classType: 'WEEKEND',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '양준서',
        lc: 400,
        rc: 415,
        weak: 6,
        className: 'HIGH_SCORE',
        classType: 'WEEKDAY',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '송다영',
        lc: 405,
        rc: 420,
        weak: 7,
        className: 'HIGH_SCORE',
        classType: 'WEEKEND',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '구지현',
        lc: 410,
        rc: 420,
        weak: 5,
        className: 'HIGH_SCORE',
        classType: 'WEEKDAY',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '홍세준',
        lc: 415,
        rc: 425,
        weak: 2,
        className: 'HIGH_SCORE',
        classType: 'WEEKEND',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '변지훈',
        lc: 425,
        rc: 435,
        weak: 7,
        className: 'HIGH_SCORE',
        classType: 'WEEKDAY',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '마소연',
        lc: 435,
        rc: 455,
        weak: 6,
        className: 'HIGH_SCORE',
        classType: 'WEEKEND',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '엄태준',
        lc: 450,
        rc: 470,
        weak: 5,
        className: 'HIGH_SCORE',
        classType: 'WEEKDAY',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '진하린',
        lc: 465,
        rc: 485,
        weak: 7,
        className: 'HIGH_SCORE',
        classType: 'WEEKEND',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
    {
        name: '장민수',
        lc: 485,
        rc: 495,
        weak: null,
        className: 'HIGH_SCORE',
        classType: 'WEEKDAY',
        enrolledAt: '2025-03-01',
        expiresAt: '2025-08-31'
    },
];

// ─── 기출문제 데이터 (~52문항) ──────────────────────────
const QUESTIONS = [
// ── PART 1: 사진묘사 ──
{
part: 1, questionType: 'PHOTO_DESCRIPTION', difficulty: 'LOW',
content: '[사진 묘사]\nA man is sitting at a desk in an office.\n\nQ. Which statement best describes the photo?',
options: ['A) The man is standing near the window.', 'B) The man is typing on a computer.', 'C) The man is eating lunch at his desk.', 'D) The man is talking on the phone.'],
answer: 'B', source: '기출 유사',
},
{
part: 1, questionType: 'PHOTO_DESCRIPTION', difficulty: 'LOW',
content: '[사진 묘사]\nWorkers are unloading boxes from a delivery truck.\n\nQ. Which statement best describes the photo?',
options: ['A) The workers are loading boxes onto a shelf.', 'B) The workers are unloading boxes from a truck.', 'C) The workers are driving the truck.', 'D) The workers are counting boxes on the ground.'],
answer: 'B', source: '기출 유사',
},
{
part: 1, questionType: 'PHOTO_DESCRIPTION', difficulty: 'MEDIUM',
content: '[사진 묘사]\nA woman is presenting in a meeting room, pointing at a screen.\n\nQ. Which statement best describes the photo?',
options: ['A) The woman is writing on a whiteboard.', 'B) The woman is seated at the head of the table.', 'C) The woman is pointing at a screen while presenting.', 'D) The woman is distributing handouts to colleagues.'],
answer: 'C', source: '기출 유사',
},
{
part: 1, questionType: 'PHOTO_DESCRIPTION', difficulty: 'LOW',
content: '[사진 묘사]\nPeople are standing in line at a service counter.\n\nQ. Which statement best describes the photo?',
options: ['A) People are seated at tables in a restaurant.', 'B) People are standing in line at a counter.', 'C) People are leaving through the exit.', 'D) People are looking at a display case.'],
answer: 'B', source: '기출 유사',
},
{
part: 1, questionType: 'PHOTO_DESCRIPTION', difficulty: 'MEDIUM',
content: '[사진 묘사]\nPeople are walking along a tree-lined path in a park.\n\nQ. Which statement best describes the photo?',
options: ['A) People are jogging along the path.', 'B) Workers are repairing the path.', 'C) People are walking along a tree-lined path.', 'D) Children are playing on the grass.'],
answer: 'C', source: '기출 유사',
},

// ── PART 2: 질의응답 ──
{
part: 2, questionType: 'SHORT_RESPONSE', difficulty: 'LOW',
content: 'Q. Where is the nearest subway station?',
options: ["A) It's about a 5-minute walk from here.", 'B) Yes, I take the subway every day.', 'C) The train arrives at 9 AM.', "D) No, I don't need directions."],
answer: 'A', source: '기출 유사',
},
{
part: 2, questionType: 'SHORT_RESPONSE', difficulty: 'LOW',
content: 'Q. When will the quarterly report be ready?',
options: ['A) The report is on your desk.', 'B) It should be ready by Friday afternoon.', 'C) Yes, we completed the quarter successfully.', 'D) The meeting room is available.'],
answer: 'B', source: '기출 유사',
},
{
part: 2, questionType: 'SHORT_RESPONSE', difficulty: 'MEDIUM',
content: 'Q. Who is in charge of the new project?',
options: ['A) The project will start next month.', "B) It's a very important project.", 'C) Sarah Kim has been assigned as project manager.', 'D) We need more resources.'],
answer: 'C', source: '기출 유사',
},
{
part: 2, questionType: 'SHORT_RESPONSE', difficulty: 'LOW',
content: 'Q. Could you send me the updated schedule?',
options: ["A) Yes, I'll email it to you right away.", 'B) The schedule is very tight this month.', 'C) We need to reschedule the meeting.', "D) No, the schedule hasn't changed."],
answer: 'A', source: '기출 유사',
},
{
part: 2, questionType: 'SHORT_RESPONSE', difficulty: 'MEDIUM',
content: 'Q. Why was the meeting postponed?',
options: ['A) The meeting will be held in Conference Room B.', 'B) Several key members were traveling on business.', 'C) Yes, we postponed it to next week.', 'D) The meeting lasted about two hours.'],
answer: 'B', source: '기출 유사',
},

// ── PART 3: 짧은대화 ──
{
part: 3, questionType: 'SHORT_CONVERSATION', difficulty: 'LOW',
content: '[대화]\nM: "I\'m calling to confirm my reservation for next Tuesday."\nW: "Could I have your name and reservation number?"\nM: "Sure, it\'s James Park, and the number is 4521."\nW: "I see it here. Your table for four is confirmed at 7 PM."\n\nQ. What is the man calling about?',
options: ['A) To make a new reservation', 'B) To confirm an existing reservation', 'C) To cancel his reservation', 'D) To change the time of his reservation'],
answer: 'B', source: '기출 유사',
},
{
part: 3, questionType: 'SHORT_CONVERSATION', difficulty: 'LOW',
content: '[대화]\nM: "I\'m calling to confirm my reservation for next Tuesday."\nW: "Could I have your name and reservation number?"\nM: "Sure, it\'s James Park, and the number is 4521."\nW: "I see it here. Your table for four is confirmed at 7 PM."\n\nQ. What information did the woman ask for?',
options: ["A) The man's phone number and date", "B) The man's name and reservation number", 'C) The number of guests and time', "D) The restaurant's location and menu"],
answer: 'B', source: '기출 유사',
},
{
part: 3, questionType: 'SHORT_CONVERSATION', difficulty: 'MEDIUM',
content: '[대화]\nW: "The copier on the third floor is broken again."\nM: "I know. I already called the maintenance team."\nW: "When will it be fixed?"\nM: "They said it would take about two hours."\n\nQ. What is the problem?',
options: ['A) The elevator is out of service.', 'B) The copier is not working.', 'C) The maintenance team is unavailable.', 'D) The third floor is under renovation.'],
answer: 'B', source: '기출 유사',
},
{
part: 3, questionType: 'SHORT_CONVERSATION', difficulty: 'MEDIUM',
content: '[대화]\nW: "The copier on the third floor is broken again."\nM: "I know. I already called the maintenance team."\nW: "When will it be fixed?"\nM: "They said it would take about two hours."\n\nQ. What has the man already done?',
options: ['A) Fixed the copier himself', 'B) Written a report about the issue', 'C) Contacted the maintenance team', 'D) Found an alternative copier'],
answer: 'C', source: '기출 유사',
},

// ── PART 4: 설명문 ──
{
part: 4, questionType: 'LONG_TALK', difficulty: 'LOW',
content: '[지문]\n"Attention, all passengers. This is an announcement regarding Flight KE123 to New York. Due to technical issues, the departure has been delayed by approximately 90 minutes. We expect to board at 4:30 PM at Gate 15. We apologize for the inconvenience and thank you for your patience."\n\nQ. What is the main purpose of this announcement?',
options: ['A) To announce a flight cancellation', 'B) To inform passengers of a flight delay', 'C) To change the boarding gate', 'D) To request passengers to check in early'],
answer: 'B', source: '기출 유사',
},
{
part: 4, questionType: 'LONG_TALK', difficulty: 'LOW',
content: '[지문]\n"Attention, all passengers. This is an announcement regarding Flight KE123 to New York. Due to technical issues, the departure has been delayed by approximately 90 minutes. We expect to board at 4:30 PM at Gate 15. We apologize for the inconvenience and thank you for your patience."\n\nQ. When is the new boarding time?',
options: ['A) 3:00 PM', 'B) 3:30 PM', 'C) 4:00 PM', 'D) 4:30 PM'],
answer: 'D', source: '기출 유사',
},
{
part: 4, questionType: 'LONG_TALK', difficulty: 'MEDIUM',
content: '[지문]\n"Welcome to this month\'s employee orientation. Today, we\'ll cover the company\'s core policies, benefits package, and the technology systems you\'ll be using. After lunch, you\'ll have a chance to meet your department managers and tour the facilities. If you have any questions throughout the day, please don\'t hesitate to ask."\n\nQ. What is the purpose of this talk?',
options: ['A) To welcome new employees', 'B) To announce new company policies', 'C) To introduce a new technology system', 'D) To organize a company tour'],
answer: 'A', source: '기출 유사',
},
{
part: 4, questionType: 'LONG_TALK', difficulty: 'MEDIUM',
content: '[지문]\n"Welcome to this month\'s employee orientation. Today, we\'ll cover the company\'s core policies, benefits package, and the technology systems you\'ll be using. After lunch, you\'ll have a chance to meet your department managers and tour the facilities. If you have any questions throughout the day, please don\'t hesitate to ask."\n\nQ. What will happen after lunch?',
options: ['A) A technology training session', 'B) A review of company policies', 'C) Meetings with department managers', 'D) A benefits enrollment session'],
answer: 'C', source: '기출 유사',
},

// ── PART 5: 문법 ──
{
part: 5, questionType: 'GRAMMAR', difficulty: 'LOW',
content: 'The new software ------- by the IT department last month.',
options: ['A) installed', 'B) was installed', 'C) has installed', 'D) installing'],
answer: 'B', explanation: '수동태: be + p.p. (last month → 과거)', source: '기출 유사',
},
{
part: 5, questionType: 'GRAMMAR', difficulty: 'LOW',
content: 'All employees are required to ------- their badges at the entrance.',
options: ['A) shown', 'B) showing', 'C) show', 'D) shows'],
answer: 'C', explanation: 'to 부정사 → 동사원형', source: '기출 유사',
},
{
part: 5, questionType: 'GRAMMAR', difficulty: 'LOW',
content: 'The ------- of the new branch will be announced next week.',
options: ['A) locate', 'B) locating', 'C) located', 'D) location'],
answer: 'D', explanation: '관사 뒤 + 전치사구 앞 → 명사', source: '기출 유사',
},
{
part: 5, questionType: 'GRAMMAR', difficulty: 'MEDIUM',
content: 'The manager asked ------- the report before the deadline.',
options: ['A) submit', 'B) submitted', 'C) submitting', 'D) to submit'],
answer: 'D', explanation: 'ask + 목적어 + to-V', source: '기출 유사',
},
{
part: 5, questionType: 'GRAMMAR', difficulty: 'MEDIUM',
content: 'Sales figures for last quarter were ------- higher than expected.',
options: ['A) consider', 'B) considerable', 'C) considerably', 'D) considering'],
answer: 'C', explanation: '형용사(higher) 수식 → 부사(considerably)', source: '기출 유사',
},
{
part: 5, questionType: 'GRAMMAR', difficulty: 'MEDIUM',
content: 'The conference will be held ------- June 15 ------- June 17.',
options: ['A) from / to', 'B) between / and', 'C) during / until', 'D) from / until'],
answer: 'B', explanation: 'between A and B: 특정 날짜 범위', source: '기출 유사',
},
{
part: 5, questionType: 'GRAMMAR', difficulty: 'MEDIUM',
content: 'It is ------- that all participants register in advance.',
options: ['A) recommend', 'B) recommended', 'C) recommending', 'D) recommendation'],
answer: 'B', explanation: 'It is recommended that ~ (수동태 형용사절)', source: '기출 유사',
},
{
part: 5, questionType: 'GRAMMAR', difficulty: 'HIGH',
content: 'Neither the president nor the board members ------- attended the conference.',
options: ['A) has', 'B) have', 'C) having', 'D) had'],
answer: 'B', explanation: 'Neither A nor B → B에 수 일치 (board members → 복수)', source: '기출 유사',
},
{
part: 5, questionType: 'GRAMMAR', difficulty: 'HIGH',
content: 'The ------- agreement was signed by both parties yesterday.',
options: ['A) merge', 'B) merged', 'C) merging', 'D) merger'],
answer: 'D', explanation: '복합명사: merger agreement (합병 계약)', source: '기출 유사',
},
{
part: 5, questionType: 'GRAMMAR', difficulty: 'HIGH',
content: '------- the heavy traffic, Mr. Kim arrived at the meeting on time.',
options: ['A) Despite', 'B) Although', 'C) However', 'D) Even'],
answer: 'A', explanation: 'Despite + 명사구 (Despite + the heavy traffic)', source: '기출 유사',
},

// ── PART 5: 어휘 ──
{
part: 5, questionType: 'VOCABULARY', difficulty: 'LOW',
content: 'The company decided to ------- its marketing strategy to target younger consumers.',
options: ['A) revise', 'B) refuse', 'C) reserve', 'D) resolve'],
answer: 'A', explanation: 'revise: 수정하다', source: '기출 유사',
},
{
part: 5, questionType: 'VOCABULARY', difficulty: 'LOW',
content: 'Please ------- your email address so we can send you the confirmation.',
options: ['A) provide', 'B) produce', 'C) protect', 'D) promote'],
answer: 'A', explanation: 'provide information: 정보를 제공하다', source: '기출 유사',
},
{
part: 5, questionType: 'VOCABULARY', difficulty: 'LOW',
content: 'All applications must be ------- by the end of this month.',
options: ['A) submitted', 'B) suggested', 'C) substituted', 'D) supervised'],
answer: 'A', explanation: 'submit an application: 지원서를 제출하다', source: '기출 유사',
},
{
part: 5, questionType: 'VOCABULARY', difficulty: 'LOW',
content: 'Our company ------- in providing customized solutions for small businesses.',
options: ['A) specializes', 'B) speculates', 'C) supervises', 'D) sponsors'],
answer: 'A', explanation: 'specialize in: ~을 전문으로 하다', source: '기출 유사',
},
{
part: 5, questionType: 'VOCABULARY', difficulty: 'MEDIUM',
content: 'The new product line has received ------- feedback from customers.',
options: ['A) favorable', 'B) favored', 'C) favorite', 'D) favor'],
answer: 'A', explanation: 'favorable feedback: 긍정적인 피드백', source: '기출 유사',
},
{
part: 5, questionType: 'VOCABULARY', difficulty: 'MEDIUM',
content: 'The CEO made a ------- decision to expand into the Asian market.',
options: ['A) strategic', 'B) strategy', 'C) strategize', 'D) strategically'],
answer: 'A', explanation: '명사(decision) 수식 → 형용사(strategic)', source: '기출 유사',
},
{
part: 5, questionType: 'VOCABULARY', difficulty: 'MEDIUM',
content: 'The project was completed well ------- the scheduled deadline.',
options: ['A) ahead of', 'B) instead of', 'C) in spite of', 'D) according to'],
answer: 'A', explanation: 'ahead of schedule: 예정보다 일찍', source: '기출 유사',
},
{
part: 5, questionType: 'VOCABULARY', difficulty: 'MEDIUM',
content: 'The financial report shows a significant ------- in operating costs this year.',
options: ['A) reduction', 'B) refusal', 'C) reservation', 'D) revision'],
answer: 'A', explanation: 'reduction in costs: 비용 절감', source: '기출 유사',
},
{
part: 5, questionType: 'VOCABULARY', difficulty: 'HIGH',
content: 'We are ------- pleased to announce the opening of our new headquarters.',
options: ['A) extremely', 'B) extensively', 'C) exclusively', 'D) explicitly'],
answer: 'A', explanation: 'extremely pleased: 매우 기쁘게', source: '기출 유사',
},
{
part: 5, questionType: 'VOCABULARY', difficulty: 'HIGH',
content: 'The board of directors ------- the proposed budget for the upcoming fiscal year.',
options: ['A) approved', 'B) approached', 'C) appointed', 'D) appealed'],
answer: 'A', explanation: 'approve the budget: 예산을 승인하다', source: '기출 유사',
},

// ── PART 6: 장문 빈칸 ──
{
part: 6, questionType: 'SHORT_PASSAGE_FILL', difficulty: 'LOW',
content: '[지문]\nDear Mr. Johnson,\nThank you for your interest in the position of Marketing Manager at ABC Corporation. We were ---[1]--- by your impressive background in the field.\n\nQ. 빈칸 [1]에 알맞은 것은?',
options: ['A) impress', 'B) impressed', 'C) impressive', 'D) impressing'],
answer: 'B', explanation: 'We were impressed by: 수동태', source: '기출 유사',
},
{
part: 6, questionType: 'SHORT_PASSAGE_FILL', difficulty: 'LOW',
content: '[지문]\nDear Mr. Johnson,\n...After careful consideration, we would like to ---[2]--- you for an interview at our office next week.\n\nQ. 빈칸 [2]에 알맞은 것은?',
options: ['A) invite', 'B) invest', 'C) involve', 'D) inform'],
answer: 'A', explanation: 'invite someone for an interview: 면접에 초대하다', source: '기출 유사',
},
{
part: 6, questionType: 'SHORT_PASSAGE_FILL', difficulty: 'LOW',
content: '[지문]\nDear Mr. Johnson,\n...Please ---[3]--- us at your earliest convenience to confirm your availability.\n\nQ. 빈칸 [3]에 알맞은 것은?',
options: ['A) contact', 'B) contain', 'C) continue', 'D) contribute'],
answer: 'A', explanation: 'contact us: 저희에게 연락하다', source: '기출 유사',
},
{
part: 6, questionType: 'SHORT_PASSAGE_FILL', difficulty: 'MEDIUM',
content: '[지문]\nTo: All Staff\nRe: Office Renovation\nPlease be ---[4]--- that the third-floor renovation will begin on Monday.\n\nQ. 빈칸 [4]에 알맞은 것은?',
options: ['A) advised', 'B) advice', 'C) advisable', 'D) advisor'],
answer: 'A', explanation: 'Please be advised that: 알려드립니다 (수동태 관용구)', source: '기출 유사',
},
{
part: 6, questionType: 'SHORT_PASSAGE_FILL', difficulty: 'MEDIUM',
content: '[지문]\nTo: All Staff\n...During this period, employees on that floor will be ---[5]--- to temporary workspaces on the second floor.\n\nQ. 빈칸 [5]에 알맞은 것은?',
options: ['A) relocated', 'B) relocation', 'C) relocate', 'D) relocating'],
answer: 'A', explanation: 'be relocated: 이전되다 (수동태)', source: '기출 유사',
},
{
part: 6, questionType: 'SHORT_PASSAGE_FILL', difficulty: 'LOW',
content: '[지문]\nTo: All Staff\n...We apologize for any ---[6]--- this may cause and appreciate your patience.\n\nQ. 빈칸 [6]에 알맞은 것은?',
options: ['A) inconvenience', 'B) convenience', 'C) income', 'D) increase'],
answer: 'A', explanation: 'inconvenience: 불편함', source: '기출 유사',
},

// ── PART 7: 단일 지문 ──
{
part: 7, questionType: 'SINGLE_PASSAGE', difficulty: 'LOW',
content: '[지문]\nGreenLeaf Organic Market — Spring Sale This Weekend Only!\nAll organic produce: 20% off / Fresh bakery: Buy 2 get 1 free / Imported cheese: 15% off\nSale runs Sat Apr 5 ~ Sun Apr 6, 8AM–8PM. Loyalty members get additional 5% off. Sign up at customer service desk.\nCall 555-0123 or visit www.greenleafmarket.com\n\nQ. What type of business is this advertisement for?',
options: ['A) A restaurant', 'B) A grocery store', 'C) A farm', 'D) A bakery'],
answer: 'B', source: '기출 유사',
},
{
part: 7, questionType: 'SINGLE_PASSAGE', difficulty: 'LOW',
content: '[지문]\nGreenLeaf Organic Market — Spring Sale This Weekend Only!\nSale runs Sat Apr 5 ~ Sun Apr 6, 8AM–8PM. Loyalty members get additional 5% off.\n\nQ. How long does the sale last?',
options: ['A) One day', 'B) Two days', 'C) Three days', 'D) One week'],
answer: 'B', source: '기출 유사',
},
{
part: 7, questionType: 'SINGLE_PASSAGE', difficulty: 'MEDIUM',
content: '[지문]\nGreenLeaf Organic Market — Loyalty members get an additional 5% discount on all purchases. Not a member yet? Sign up at the customer service desk.\n\nQ. What additional benefit do loyalty program members receive?',
options: ['A) Free membership', 'B) An extra 5% discount', 'C) Free delivery service', 'D) Double loyalty points'],
answer: 'B', source: '기출 유사',
},
{
part: 7, questionType: 'SINGLE_PASSAGE', difficulty: 'MEDIUM',
content: '[지문]\nGreenLeaf Organic Market — Not a member yet? Sign up at the customer service desk and enjoy the extra savings immediately.\n\nQ. What can customers do at the customer service desk?',
options: ['A) Return items', 'B) Place special orders', 'C) Sign up for the loyalty program', 'D) Apply for a store credit card'],
answer: 'C', source: '기출 유사',
},
{
part: 7, questionType: 'SINGLE_PASSAGE', difficulty: 'LOW',
content: '[지문]\nMemorandum\nTo: All Department Heads / From: HR / Subject: Annual Performance Review\nThe annual performance review period: April 1 ~ April 30. All department heads complete reviews for direct reports. Forms on company intranet under HR section. Submit to HR by May 5. Training sessions on March 20 and 22 (encouraged for new managers).\n\nQ. What is the main purpose of this memo?',
options: ['A) To announce new HR policies', 'B) To inform about the performance review schedule', 'C) To introduce new review forms', 'D) To announce changes to the review process'],
answer: 'B', source: '기출 유사',
},
{
part: 7, questionType: 'SINGLE_PASSAGE', difficulty: 'MEDIUM',
content: '[지문]\n...Completed forms must be submitted to HR no later than May 5.\n\nQ. When is the deadline for submitting completed review forms?',
options: ['A) April 1', 'B) April 30', 'C) May 5', 'D) March 15'],
answer: 'C', source: '기출 유사',
},
{
part: 7, questionType: 'SINGLE_PASSAGE', difficulty: 'MEDIUM',
content: '[지문]\n...Training sessions on how to conduct effective performance reviews will be held on March 20 and March 22. Attendance is strongly encouraged for managers who are new to the review process.\n\nQ. Who should attend the training sessions?',
options: ['A) All employees', 'B) New employees only', 'C) HR staff only', 'D) Managers who are new to the review process'],
answer: 'D', source: '기출 유사',
},
{
part: 7, questionType: 'SINGLE_PASSAGE', difficulty: 'LOW',
content: '[지문]\n...Review forms are available on the company intranet under the HR section.\n\nQ. How can department heads access the review forms?',
options: ['A) By contacting HR directly', 'B) Through the company intranet', 'C) At the training sessions', 'D) By emailing hr@company.com'],
answer: 'B', source: '기출 유사',
},
];

// ─── 메인 ───────────────────────────────────────────────
async function main() {
console.log('🌱 Seeding started...');

// 기존 데이터 초기화
await prisma.workbookQuestion.deleteMany();
await prisma.workbook.deleteMany();
await prisma.scoreRecord.deleteMany();
await prisma.student.deleteMany();
await prisma.question.deleteMany();

// 기출문제 적재
for (const q of QUESTIONS) {
await prisma.question.create({ data: q });
}
console.log(`✅ Questions seeded: ${QUESTIONS.length}개`);

// 학생 + 점수 이력 적재
for (const raw of RAW_STUDENTS) {
const total = raw.lc + raw.rc;
const level = getLevel(total);
const partScores = getPartScores(raw.lc, raw.rc, raw.weak);

    const student = await prisma.student.create({
        data: {
            name: raw.name,
            totalScore: total,
            lcScore: raw.lc,
            rcScore: raw.rc,
            level,
            className: raw.className || null,
            classType: raw.classType || null,
            enrolledAt: raw.enrolledAt ? new Date(raw.enrolledAt) : null,
            expiresAt: raw.expiresAt ? new Date(raw.expiresAt) : null,
        },
    });

await prisma.scoreRecord.create({
data: {
studentId: student.id,
totalScore: total,
lcScore: raw.lc,
rcScore: raw.rc,
...partScores,
takenAt: new Date('2025-01-15'),
source: 'seed_data.xlsx',
},
});
}
console.log(`✅ Students seeded: ${RAW_STUDENTS.length}명`);
console.log('🌱 Seeding complete!');
}

main()
.catch((e) => { console.error(e); process.exit(1); })
.finally(() => prisma.$disconnect());