# API 레퍼런스

베이스 URL: `http://localhost:4000/api`

---

## 학생 (Students)

### GET `/students`

학생 목록 조회 (필터 + 페이지네이션)

**Query Parameters**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `level` | string | `BEGINNER` \| `INTERMEDIATE` \| `ADVANCED` \| `EXPERT` |
| `className` | string | `TARGET_600` \| `TARGET_800` \| `HIGH_SCORE` |
| `classType` | string | `WEEKDAY` \| `WEEKEND` |
| `search` | string | 이름 부분 검색 |
| `page` | number | 페이지 번호 (기본 1) |
| `pageSize` | number | 페이지 크기 (기본 20) |

**Response**
```json
{
  "data": [
    {
      "id": 1,
      "name": "홍길동",
      "level": "INTERMEDIATE",
      "totalScore": 650,
      "lcScore": 330,
      "rcScore": 320,
      "className": "TARGET_800",
      "classNameLabel": "800목표반",
      "classType": "WEEKDAY",
      "enrolledAt": "2025-01-01",
      "expiresAt": "2025-06-30",
      "weakParts": [5, 6, 7],
      "workbookCount": 2
    }
  ],
  "total": 45,
  "page": 1,
  "pageSize": 20
}
```

---

### GET `/students/:id`

학생 상세 조회 (점수 이력 + 문제집 목록 포함)

**Response**
```json
{
  "id": 1,
  "name": "홍길동",
  "level": "INTERMEDIATE",
  "totalScore": 650,
  "weakParts": [
    { "part": 5, "correct": 14, "total": 30, "rate": 0.47 }
  ],
  "scores": [
    {
      "id": 10,
      "takenAt": "2025-03-01",
      "totalScore": 650,
      "lcScore": 330,
      "rcScore": 320,
      "part1Correct": 5, "part2Correct": 20,
      "part3Correct": 28, "part4Correct": 22,
      "part5Correct": 14, "part6Correct": 10,
      "part7Correct": 22
    }
  ],
  "workbooks": [
    {
      "id": 3,
      "createdAt": "2025-03-05",
      "totalQuestions": 20,
      "bookUid": "bk_abc123",
      "bookStatus": "FINALIZED",
      "orderUid": "ord_xyz",
      "orderStatus": "PAID"
    }
  ]
}
```

---

### POST `/students`

학생 수동 등록

**Request Body**
```json
{
  "name": "김영희",
  "className": "TARGET_800",
  "classType": "WEEKDAY",
  "enrolledAt": "2025-01-01",
  "expiresAt": "2025-12-31",
  "lcScore": 390,
  "rcScore": 390,
  "part1Correct": 6, "part2Correct": 23,
  "part3Correct": 35, "part4Correct": 27,
  "part5Correct": 26, "part6Correct": 14,
  "part7Correct": 46
}
```

---

### PUT `/students/:id`

학생 정보 수정

**Request Body** (수정할 필드만)
```json
{
  "name": "김영희",
  "className": "HIGH_SCORE",
  "enrolledAt": "2025-01-01",
  "expiresAt": "2026-01-01"
}
```

---

### DELETE `/students/:id`

학생 삭제 (관련 ScoreRecord, Workbook 포함 cascade 삭제)

---

### DELETE `/students/:id/scores/:scoreId`

특정 점수 기록 삭제. 삭제 후 남은 기록 중 최신 기준으로 학생 레벨·점수 재계산.

---

## 업로드 (Upload)

### POST `/upload/scores`

학생 성적 엑셀 파일 업로드

**Request** `multipart/form-data`

| 필드 | 타입 | 설명 |
|------|------|------|
| `file` | File | `.xlsx` 또는 `.xls` 파일 |

**엑셀 컬럼 형식**

| 이름 | 응시일 | 총점 | LC | RC | Part1 | Part2 | Part3 | Part4 | Part5 | Part6 | Part7 |
|------|--------|------|----|----|-------|-------|-------|-------|-------|-------|-------|

**Response**
```json
{
  "data": {
    "total": 30,
    "created": 25,
    "updated": 5
  }
}
```

---

### POST `/upload/exam`

기출 PDF 업로드 → AI 문제 추출 → DB 저장

**Request** `multipart/form-data`

| 필드 | 타입 | 설명 |
|------|------|------|
| `file` | File | `.pdf` 파일 |

**Response**
```json
{
  "data": {
    "extracted": 15,
    "saved": 12,
    "duplicates": 3,
    "source": "2024_11_TOEIC.pdf",
    "questions": [
      {
        "part": 5,
        "questionType": "GRAMMAR",
        "difficulty": "MEDIUM",
        "content": "------- has been scheduled for next Monday.",
        "options": ["(A) Meeting", "(B) A meeting", "(C) The meeting", "(D) Meetings"],
        "answer": "C",
        "explanation": "관사 the는 이미 언급된 특정 명사 앞에 사용됩니다."
      }
    ]
  }
}
```

---

## 문제집 (Workbooks)

### POST `/workbooks/generate`

단일 학생 문제집 생성

**Request Body**
```json
{ "studentId": 1 }
```

**Response**
```json
{
  "workbookId": 5,
  "bookUid": "bk_abc123",
  "totalQuestions": 20,
  "analysis": {
    "weakParts": [5, 6],
    "questionDistribution": { "5": 8, "6": 6, "7": 6 }
  }
}
```

---

### POST `/workbooks/generate-batch`

다수 학생 문제집 일괄 생성 — **SSE 스트림 응답**

**Request Body**
```json
{ "studentIds": [1, 2, 3, 4, 5] }
```

**Response** `Content-Type: text/event-stream`

```
data: {"type":"start","studentId":1,"name":"홍길동"}

data: {"type":"done","studentId":1,"workbookId":5,"bookUid":"bk_abc","summary":"Part5·6 집중, 20문항"}

data: {"type":"error","studentId":2,"message":"No questions available for level EXPERT"}

data: {"type":"complete","total":5,"succeeded":4,"failed":1}
```

---

### GET `/workbooks/:id/pdf`

문제집 PDF 다운로드

**Response** `Content-Type: application/pdf` (binary)

---

### POST `/workbooks/pdf-zip`

여러 문제집 PDF를 ZIP으로 묶어 다운로드

**Request Body**
```json
{ "workbookIds": [1, 2, 3] }
```

**Response** `Content-Type: application/zip` (binary)

---

### DELETE `/workbooks/:id/book`

SweetBook 등록 취소 (bookUid 삭제, DRAFT 상태로 복원)

---

### POST `/workbooks/:id/regenerate`

문제집 삭제 후 새 문제로 재생성 + SweetBook 재발행

**Response**
```json
{
  "workbookId": 7,
  "bookUid": "bk_new456",
  "totalQuestions": 20
}
```

---

## 주문 (Orders)

### GET `/orders`

주문 목록 조회 (bookUid 기준 그룹핑)

**Response**
```json
{
  "data": [
    {
      "bookUid": "bk_abc123",
      "orderUid": "ord_xyz",
      "orderStatus": "PAID",
      "createdAt": "2025-03-05",
      "students": [
        { "id": 1, "name": "홍길동", "workbookId": 5 }
      ]
    }
  ]
}
```

---

### POST `/orders`

인쇄 주문 생성

**Request Body**
```json
{ "workbookId": 5 }
```

**동작:**
1. SweetBook 잔액 확인 → 부족 시 자동 충전 (샌드박스 100,000원)
2. `sbClient.orders.create()` 호출
3. DB에 `orderUid`, `orderStatus` 저장

---

### POST `/orders/:id/cancel`

주문 취소

**Request Body**
```json
{ "reason": "고객 요청으로 취소" }
```

---

## 문제 (Questions)

### GET `/questions`

문제 목록 조회

**Query Parameters**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `part` | number | 1~7 |
| `questionType` | string | `GRAMMAR` \| `VOCABULARY` \| `SINGLE_PASSAGE` 등 |
| `difficulty` | string | `LOW` \| `MEDIUM` \| `HIGH` |
| `search` | string | 문제 내용 부분 검색 |

**Response**
```json
{
  "data": [
    {
      "id": 101,
      "part": 5,
      "questionType": "GRAMMAR",
      "difficulty": "MEDIUM",
      "content": "------- has been scheduled for next Monday.",
      "options": ["(A) Meeting", "(B) A meeting", "(C) The meeting", "(D) Meetings"],
      "answer": "C",
      "explanation": "...",
      "source": "2024_11_TOEIC.pdf",
      "duplicateCount": 0
    }
  ],
  "total": 250
}
```

---

### PUT `/questions/:id`

문제 수정

**Request Body** (수정할 필드만)
```json
{
  "part": 5,
  "questionType": "GRAMMAR",
  "difficulty": "HIGH",
  "answer": "C"
}
```

---

### DELETE `/questions/:id`

문제 삭제

---

## 설정 (Settings)

### GET `/settings`

현재 설정 조회

**Response**
```json
{
  "WORKBOOK_DEFAULT_QUESTIONS": "20",
  "WORKBOOK_MAX_QUESTIONS": "23",
  "WORKBOOK_MIN_PAGES": "24",
  "WORKBOOK_QUESTIONS_PER_PAGE": "4",
  "AI_PROVIDER": "mock"
}
```

---

### PUT `/settings`

설정 업데이트 (DB 영속 + 즉시 반영)

**Request Body**
```json
{
  "WORKBOOK_DEFAULT_QUESTIONS": "25",
  "AI_PROVIDER": "openai"
}
```

---

## 크레딧 (Credits)

### GET `/credits`

SweetBook 잔액 조회

**Response**
```json
{ "balance": 87500 }
```

---

### POST `/credits/charge`

샌드박스 충전 (테스트 전용)

**Request Body**
```json
{ "amount": 100000 }
```

---

## 기타

### GET `/health`

서버 상태 확인

**Response**
```json
{ "status": "ok", "uptime": 3600 }
```

---

## 에러 응답 형식

모든 에러는 다음 형식으로 반환됩니다:

```json
{
  "message": "학생을 찾을 수 없습니다.",
  "code": "NOT_FOUND"
}
```

| HTTP 코드 | 상황 |
|-----------|------|
| 400 | 잘못된 요청 (필수 파라미터 누락 등) |
| 404 | 리소스를 찾을 수 없음 |
| 500 | 서버 내부 오류 |
