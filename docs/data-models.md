# 데이터 모델

## 모델 관계도

```
Student ──────────────── ScoreRecord
   │  1                N       │
   │                           │ (취약 파트 분석에 사용)
   │ 1
   │
   ├── Workbook ───────────────── WorkbookQuestion
   │     │  1                 N         │
   │     │                             │
   │     └─ bookUid → SweetBook        │
   │                                   │
   │                              Question
   │
Setting  (key-value, 독립 모델)
```

---

## 모델 상세

### Student

학원 학생 정보. 성적이 업로드될 때마다 `level`, `totalScore` 등이 갱신됩니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | Int (PK) | 자동 증가 |
| `name` | String | 학생 이름 (unique) |
| `level` | Enum | `BEGINNER` \| `INTERMEDIATE` \| `ADVANCED` \| `EXPERT` |
| `totalScore` | Int? | 최신 TOEIC 총점 |
| `lcScore` | Int? | 최신 LC 점수 |
| `rcScore` | Int? | 최신 RC 점수 |
| `className` | Enum? | `TARGET_600` \| `TARGET_800` \| `HIGH_SCORE` |
| `classType` | Enum? | `WEEKDAY` \| `WEEKEND` |
| `enrolledAt` | DateTime? | 수강 등록일 |
| `expiresAt` | DateTime? | 수강 만료일 |
| `createdAt` | DateTime | 생성일 |
| `updatedAt` | DateTime | 수정일 |

**레벨 기준 (levelAnalyzer.js)**

| 레벨 | 점수 범위 |
|------|---------|
| BEGINNER | 0 ~ 499 |
| INTERMEDIATE | 500 ~ 699 |
| ADVANCED | 700 ~ 899 |
| EXPERT | 900 ~ 990 |

---

### ScoreRecord

개별 토익 시험 성적 기록.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | Int (PK) | |
| `studentId` | Int (FK) | Student 참조 |
| `takenAt` | DateTime | 응시일 |
| `totalScore` | Int | 총점 |
| `lcScore` | Int | LC 점수 |
| `rcScore` | Int | RC 점수 |
| `part1Correct` | Int? | Part1 정답 수 (최대 6) |
| `part2Correct` | Int? | Part2 정답 수 (최대 25) |
| `part3Correct` | Int? | Part3 정답 수 (최대 39) |
| `part4Correct` | Int? | Part4 정답 수 (최대 30) |
| `part5Correct` | Int? | Part5 정답 수 (최대 30) |
| `part6Correct` | Int? | Part6 정답 수 (최대 16) |
| `part7Correct` | Int? | Part7 정답 수 (최대 54) |
| `createdAt` | DateTime | |

**취약 파트 계산 방식**

파트별 `(정답 수 / 최대 문항 수)` 비율을 계산해 오름차순 정렬.  
비율이 가장 낮은 파트가 취약 파트로 판단됩니다.

---

### Question

추출·저장된 TOEIC 기출 문제.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | Int (PK) | |
| `part` | Int | 1~7 |
| `questionType` | Enum | 아래 타입 목록 참고 |
| `difficulty` | Enum | `LOW` \| `MEDIUM` \| `HIGH` |
| `content` | String | 문제 본문 |
| `options` | Json? | `["(A)...", "(B)...", "(C)...", "(D)..."]` |
| `answer` | String | 정답 (`A` \| `B` \| `C` \| `D`) |
| `explanation` | String? | 해설 |
| `source` | String? | 출처 파일명 |
| `duplicateCount` | Int | 동일 문제가 중복 업로드된 횟수 |
| `createdAt` | DateTime | |

**questionType 목록**

| 값 | 파트 | 설명 |
|----|------|------|
| `PHOTO_DESCRIPTION` | 1 | 사진 묘사 |
| `SHORT_RESPONSE` | 2 | 짧은 응답 |
| `SHORT_CONVERSATION` | 3 | 짧은 대화 |
| `LONG_TALK` | 4 | 긴 담화 |
| `GRAMMAR` | 5 | 문법 |
| `VOCABULARY` | 5 | 어휘 |
| `SHORT_PASSAGE_FILL` | 6 | 짧은 지문 빈칸 채우기 |
| `SINGLE_PASSAGE` | 7 | 단일 지문 |
| `DOUBLE_PASSAGE` | 7 | 이중 지문 |
| `TRIPLE_PASSAGE` | 7 | 삼중 지문 |

---

### Workbook

생성된 개인 맞춤 문제집.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | Int (PK) | |
| `studentId` | Int (FK) | Student 참조 |
| `bookUid` | String? | SweetBook 도서 UID |
| `bookStatus` | String? | `DRAFT` \| `FINALIZED` |
| `orderUid` | String? | SweetBook 주문 UID |
| `orderStatus` | String? | `PENDING` \| `PAID` \| `CANCELLED` 등 |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

---

### WorkbookQuestion

Workbook과 Question의 다대다 연결 테이블.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | Int (PK) | |
| `workbookId` | Int (FK) | Workbook 참조 |
| `questionId` | Int (FK) | Question 참조 |
| `pageOrder` | Int | 문제집 내 순서 |

---

### Setting

UI에서 변경 가능한 런타임 설정. key-value 형태로 저장.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | Int (PK) | |
| `key` | String (unique) | 설정 키 |
| `value` | String | 설정 값 |

**기본 설정 키**

| 키 | 기본값 | 설명 |
|----|--------|------|
| `WORKBOOK_DEFAULT_QUESTIONS` | `20` | 기본 문제 수 |
| `WORKBOOK_MAX_QUESTIONS` | `23` | 최대 문제 수 |
| `WORKBOOK_MIN_PAGES` | `24` | 최소 페이지 수 |
| `WORKBOOK_QUESTIONS_PER_PAGE` | `4` | 페이지당 문제 수 |
| `AI_PROVIDER` | `mock` | AI 프로바이더 (`mock` \| `openai`) |

---

## Cascade 삭제 규칙

| 삭제 대상 | 함께 삭제되는 데이터 |
|-----------|---------------------|
| Student | ScoreRecord, Workbook, WorkbookQuestion |
| Workbook | WorkbookQuestion |
| Question | WorkbookQuestion |
