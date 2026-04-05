# 아키텍처

## 시스템 개요

TOEIC Tailor는 3계층(프론트엔드 / 백엔드 API / 데이터베이스)으로 구성된 풀스택 웹 애플리케이션입니다.  
두 개의 외부 서비스(SweetBook 인쇄 API, OpenAI)와 연동합니다.

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (Client)                     │
│         React 19 + Vite + Tailwind CSS                  │
│  ┌─────────┐ ┌────────┐ ┌──────────┐ ┌──────────────┐  │
│  │Students │ │Upload  │ │Generate  │ │   Orders     │  │
│  │Detail   │ │(Excel/ │ │(Batch SSE│ │(PDF Preview/ │  │
│  │Settings │ │ PDF)   │ │Streaming)│ │  SweetBook)  │  │
│  └─────────┘ └────────┘ └──────────┘ └──────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP / SSE
                         ▼
┌─────────────────────────────────────────────────────────┐
│               Express 5 API Server (:4000)               │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌─────────┐  │
│  │/students │ │/workbooks│ │  /upload   │ │/orders  │  │
│  │/questions│ │/settings │ │  /credits  │ │         │  │
│  └──────────┘ └──────────┘ └────────────┘ └─────────┘  │
│  ┌────────────────────┐  ┌───────────────────────────┐  │
│  │ workbookGenerator  │  │     sweetbookClient       │  │
│  │ levelAnalyzer      │  │     aiProvider            │  │
│  │ excelParser        │  │     (openai / mock)       │  │
│  └────────────────────┘  └───────────────────────────┘  │
└──────────────────┬─────────────────┬────────────────────┘
                   │ Prisma ORM      │ HTTPS
                   ▼                 ▼
┌──────────────────────┐   ┌──────────────────────────────┐
│  PostgreSQL (Docker) │   │     External APIs            │
│  - Student           │   │  ┌────────────────────────┐  │
│  - ScoreRecord       │   │  │ SweetBook API (Sandbox) │  │
│  - Question          │   │  │ api-sandbox.sweetbook.  │  │
│  - Workbook          │   │  │ com/v1                  │  │
│  - WorkbookQuestion  │   │  └────────────────────────┘  │
│  - Setting           │   │  ┌────────────────────────┐  │
└──────────────────────┘   │  │  OpenAI API            │  │
                           │  │  gpt-4o-mini           │  │
                           │  └────────────────────────┘  │
                           └──────────────────────────────┘
```

---

## 기술 스택

### 프론트엔드

| 기술 | 버전 | 용도 |
|------|------|------|
| React | 19.2 | UI 프레임워크 |
| Vite | 8.0 | 빌드 도구 |
| Tailwind CSS | 3.4 | 스타일링 (darkMode: class) |
| React Router | 7.14 | 클라이언트 라우팅 |
| Axios | 1.14 | HTTP 클라이언트 |
| SheetJS (xlsx) | 0.18 | 엑셀 파일 파싱 |

### 백엔드

| 기술 | 버전 | 용도 |
|------|------|------|
| Node.js | 18+ | 런타임 |
| Express | 5.2 | HTTP 서버 |
| Prisma | 5.22 | ORM |
| PostgreSQL | - | 데이터베이스 |
| PDFKit | 0.18 | PDF 생성 |
| Multer | 2.1 | 파일 업로드 |
| Archiver | 7.0 | ZIP 생성 |

### 외부 서비스

| 서비스 | SDK | 용도 |
|--------|-----|------|
| SweetBook | `bookprintapi-nodejs-sdk` | 인쇄 주문 |
| OpenAI | `openai@6.33` | 문제 추출 (GPT-4o-mini) |

---

## 핵심 데이터 흐름

### 1. 학생 등록 플로우

```
[강사]
  │ 엑셀 파일 선택
  ▼
[Upload 탭1 - StudentUploadTab]
  │ SheetJS로 파싱 → 미리보기 5행 표시
  │ 업로드 버튼 클릭
  ▼
POST /api/upload/scores
  │ excelParser.parseScoreExcel(buffer)
  │   → 행별로 {name, takenAt, totalScore, lcScore, rcScore, part1~7Correct}
  │ 학생 upsert (이름 기준)
  │ ScoreRecord 생성
  │ levelAnalyzer.getLevel(totalScore) → BEGINNER|INTERMEDIATE|ADVANCED|EXPERT
  │ Student.level, totalScore, lcScore, rcScore 업데이트
  ▼
DB: Student + ScoreRecord 저장
```

### 2. 기출 문제 추출 플로우

```
[강사]
  │ RC 기출 PDF 선택
  ▼
POST /api/upload/exam
  │ multer → PDF 버퍼 수신
  │ pdf-parse로 텍스트 추출
  │ aiProvider.extractQuestions(text)
  │   (openai 모드) → GPT-4o-mini 호출
  │     prompt: "다음 TOEIC RC 지문에서 문제를 JSON으로 추출하시오"
  │     output: [{part, questionType, difficulty, content, options, answer, explanation}]
  │   (mock 모드)  → 더미 데이터 반환
  │ 각 문제: content 기준 중복 체크 → duplicateCount 증가 or 신규 저장
  ▼
DB: Question 저장
```

### 3. 문제집 생성 플로우

```
[강사]
  │ 학생 다중 선택 → "문제집 생성" 클릭
  ▼
POST /api/workbooks/generate-batch
  │ SSE 응답 스트림 시작
  │ 학생별 순차 처리:
  │   workbookGenerator.generateWorkbook(studentId)
  │     1. 최신 ScoreRecord 조회
  │     2. levelAnalyzer.getWeakParts(scoreRecord) → 취약 파트 순위
  │     3. 취약 파트별 Question 쿼리 (count*3 후보 → Fisher-Yates shuffle → slice)
  │     4. Workbook + WorkbookQuestion rows 생성
  │   sweetbookClient.publishBatchWorkbook({students, questions})
  │     1. sbClient.books.create({spec, template, pages})
  │     2. sbClient.books.finalize(bookUid)
  │   SSE 이벤트: {type:'start'|'done'|'error', studentId, ...}
  │ 모든 학생 완료 후 SSE: {type:'complete', total, succeeded, failed}
  ▼
[클라이언트]
  EventSource 수신 → 진행 상태 실시간 업데이트
  complete 이벤트 → 2초 후 /orders로 자동 이동
```

### 4. 인쇄 주문 플로우

```
[강사]
  │ Orders 페이지에서 "주문" 버튼
  ▼
POST /api/orders
  │ GET /credits/balance 잔액 확인
  │   잔액 < 50,000원 → POST /credits/sandbox-charge (100,000원 자동 충전)
  │ sbClient.orders.create({bookUid, idempotencyKey, ...})
  │ DB: Workbook.orderUid, orderStatus 업데이트
  ▼
[주문 완료 표시]
```

---

## 디렉토리 구조

```
toeic-tailor/
├── client/                          # React + Vite 프론트엔드
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Students.jsx         # 학생 목록
│   │   │   ├── StudentDetail.jsx    # 학생 상세 (점수 이력, 취약파트)
│   │   │   ├── Upload.jsx           # 엑셀/PDF 업로드 + 문제 관리
│   │   │   ├── Generate.jsx         # 문제집 일괄 생성
│   │   │   ├── Orders.jsx           # 주문 목록 + PDF 다운로드
│   │   │   └── Settings.jsx         # 설정 (문제 수, AI 프로바이더)
│   │   ├── components/
│   │   │   ├── Pagination.jsx       # 공통 페이지네이션
│   │   │   ├── PdfPreviewModal.jsx  # PDF 인라인 뷰어 (iframe + blob URL)
│   │   │   └── Skeleton.jsx         # 로딩 스켈레톤 (Row/Card/Text/Table)
│   │   ├── context/
│   │   │   └── ToastContext.jsx     # 전역 Toast 알림
│   │   ├── constants/
│   │   │   └── index.js             # 공유 상수 (레벨, 반 이름, 상태 색상 등)
│   │   ├── api/
│   │   │   └── index.js             # Axios API 클라이언트
│   │   └── App.jsx                  # 라우팅 + 다크모드 훅 + Nav
│   └── tailwind.config.js           # darkMode: 'class'
│
├── server/                          # Node.js + Express 백엔드
│   ├── src/
│   │   ├── routes/
│   │   │   ├── students.js          # 학생 CRUD + 점수 삭제
│   │   │   ├── upload.js            # 엑셀/PDF 업로드
│   │   │   ├── workbooks.js         # 생성 / PDF / 재생성
│   │   │   ├── orders.js            # SweetBook 주문
│   │   │   ├── questions.js         # 문제 CRUD
│   │   │   ├── settings.js          # 설정 (DB 영속)
│   │   │   └── credits.js           # 잔액 조회 / 충전
│   │   ├── services/
│   │   │   ├── workbookGenerator.js # 핵심: 문제 선별 + Workbook 생성
│   │   │   ├── sweetbookClient.js   # SweetBook API 래퍼
│   │   │   ├── excelParser.js       # XLSX → 학생 성적 파싱
│   │   │   └── levelAnalyzer.js     # 점수 → 레벨 / 취약 파트 분석
│   │   ├── ai/
│   │   │   ├── aiProvider.js        # AI 프로바이더 라우터 (openai|mock)
│   │   │   ├── openaiProvider.js    # GPT-4o-mini 문제 추출
│   │   │   └── mockProvider.js      # 개발/테스트용 더미 응답
│   │   └── index.js                 # 서버 진입점 + DB 설정 로드
│   └── prisma/
│       ├── schema.prisma            # DB 스키마
│       ├── seed.js                  # 초기 데이터
│       └── migrations/              # 마이그레이션 히스토리
│
└── docs/                            # 프로젝트 문서
```

---

## 설계 결정 사항

### SSE(Server-Sent Events)로 실시간 생성 진행 표시

문제집 배치 생성은 학생 수에 따라 수십 초가 걸릴 수 있습니다.  
WebSocket 대신 SSE를 사용했습니다 — 서버→클라이언트 단방향 스트림으로 충분하며, HTTP 위에서 동작하므로 별도 프로토콜 설정이 불필요합니다.

### Mock AI 프로바이더

`AI_PROVIDER=mock`으로 설정하면 OpenAI를 호출하지 않고 미리 정의된 더미 문제를 반환합니다.  
개발·데모 환경에서 API 비용 없이 전체 플로우를 테스트할 수 있습니다.

### 설정의 DB 영속화

운영 중에 `WORKBOOK_DEFAULT_QUESTIONS` 같은 값을 바꾸면 서버 재시작 없이 즉시 반영되어야 합니다.  
`Setting` 모델에 key-value로 저장하고, 서버 시작 시 DB 값을 `process.env`에 로드합니다.  
UI에서 변경 시 DB upsert + `process.env` 동시 업데이트.

### Fisher-Yates 셔플

같은 학생에게 매번 동일한 문제가 출제되지 않도록, 후보 풀(`count × 3`)을 셔플한 뒤 앞에서 필요한 수만 추출합니다.

### PDF 생성 방식

별도 헤드리스 브라우저 없이 PDFKit으로 서버에서 직접 생성합니다.  
한국어 렌더링을 위해 NanumGothic TTF를 직접 등록했습니다.
