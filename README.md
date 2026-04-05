# TOEIC Tailor

> 토익 학원을 위한 학생 맞춤 문제집 자동 생성 · 인쇄 주문 SaaS

학생별 성적 데이터를 분석해 취약 파트에 집중한 맞춤 문제집을 AI로 자동 생성하고,  
SweetBook API와 연동해 실물 인쇄 주문 또는 PDF 다운로드까지 원스톱으로 처리합니다.

---

## 목차

- [서비스 소개](#서비스-소개)
- [문서](#문서)
- [주요 기능](#주요-기능)
- [실행 방법](#실행-방법)
- [환경변수](#환경변수)
- [사용한 API](#사용한-api)
- [AI 도구 사용 내역](#ai-도구-사용-내역)
- [설계 의도](#설계-의도)
- [기술 스택](#기술-스택)

---

## 서비스 소개

**TOEIC Tailor**는 토익 학원을 타겟으로 한 B2B 웹 서비스입니다.

기존에는 학생마다 어떤 파트가 약한지 분석하고, 그에 맞는 문제를 골라 프린트하는 작업을 강사가 직접 수행했습니다.  
TOEIC Tailor는 이 과정을 자동화합니다.

1. 학생 성적 엑셀 파일 업로드 → 레벨 자동 분류 + 취약 파트 분석
2. 기출 PDF 업로드 → AI가 문제를 추출해 DB에 누적
3. 학생을 선택하면 취약 파트 맞춤 문제집 자동 생성
4. SweetBook으로 실물 인쇄 주문 또는 PDF 다운로드

**타겟 고객:** 소규모~중규모 토익 전문 학원 (원장, 수업 운영 담당자)

---

## 문서

> 💡 **실행 없이도 기능을 확인할 수 있습니다.**  
> [`docs/features.md`](docs/features.md)에 기능별 스크린샷이 포함되어 있어,  
> 로컬 환경 없이도 각 기능의 UI와 동작 흐름을 바로 확인할 수 있습니다.

| 문서 | 내용 |
|------|------|
| [📸 기능 가이드 (스크린샷)](docs/features.md) | **화면별 스크린샷 포함** — 학생 관리, 문제집 생성, 주문, 설정 등 전체 플로우 |
| [아키텍처](docs/architecture.md) | 시스템 구조, 기술 스택, 데이터 흐름 |
| [API 레퍼런스](docs/api-reference.md) | 전체 REST API 명세 |
| [데이터 모델](docs/data-models.md) | DB 스키마 및 모델 관계 |
| [SweetBook 연동](docs/sweetbook-integration.md) | 인쇄 API 연동 상세 |

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 학생 관리 | 엑셀 일괄 등록, 직접 입력, 레벨 자동 분류 (BEGINNER ~ EXPERT) |
| 기출 문제 DB | RC 기출 PDF 업로드 → GPT-4o-mini가 문제 자동 추출·태깅·저장 |
| 문제 수동 편집 | AI 분류 오류(파트/유형/난이도) 수동 수정, 중복 문제 카운트 |
| 맞춤 문제집 생성 | 취약 파트·난이도 기반 문제 선별, 다수 학생 일괄 생성 (SSE 실시간 진행 표시) |
| SweetBook 연동 | 문제집을 SweetBook에 발행하여 실물 인쇄 주문, 자동 충전(sandbox) |
| PDF 다운로드 | 개별 PDF 또는 ZIP 일괄 다운로드, 한글 폰트(NanumGothic) 지원, 정답 모음 페이지 |
| 주문 관리 | 날짜+인원 기준 그룹 표시, 선택 주문, 주문 취소 |
| 설정 관리 | 문제 수·페이지 수·AI 프로바이더를 UI에서 변경, DB에 영속 저장 |

---

## 실행 방법

### 사전 준비

- Node.js 18+
- Docker (PostgreSQL 컨테이너용)

### 설치 및 실행
```bash
# 1. 저장소 클론
git clone https://github.com/SoyunJu/toeic-tailor.git
cd toeic-tailor

# 2. 의존성 설치 (client + server 한 번에)
npm run install:all

# 3. 환경변수 설정
cp server/.env.example server/.env
# server/.env 를 열어 필수 값 입력 (아래 환경변수 섹션 참고)

# 4. DB 기동 (Docker 필요)
docker-compose up -d

# 5. DB 마이그레이션 + 초기 시드 데이터
cd server
npx prisma migrate dev
node prisma/seed.js
cd ..

# 6. 개발 서버 실행 (client :3000 + server :4000 동시 기동)
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

> **빠른 시작 팁:** `AI_PROVIDER=mock`으로 설정하면 OpenAI API 키 없이도 전체 기능을 테스트할 수 있습니다.

---

## 환경변수

`server/.env.example`을 복사해 수정하세요.
```env
# 데이터베이스
DATABASE_URL="postgresql://root:root@localhost:5432/toeic_tailor"

# 서버
PORT=4000

# SweetBook 인쇄 API
SWEETBOOK_API_KEY=your_sweetbook_api_key
SWEETBOOK_API_BASE_URL=https://api-sandbox.sweetbook.com/v1
SWEETBOOK_BOOK_SPEC_UID=
SWEETBOOK_CONTENT_TEMPLATE_UID=
SWEETBOOK_COVER_TEMPLATE_UID=

# AI 프로바이더: "mock" (API 키 불필요) | "openai"
AI_PROVIDER=mock
OPENAI_API_KEY=your_openai_api_key

# 문제집 기본 설정 (설정 페이지에서 변경 가능)
WORKBOOK_DEFAULT_QUESTIONS=20
WORKBOOK_MAX_QUESTIONS=23
WORKBOOK_MIN_PAGES=24
WORKBOOK_QUESTIONS_PER_PAGE=4
```

---

## 사용한 API

### SweetBook Book Print API

| 메서드 | 엔드포인트 | 용도 |
|--------|-----------|------|
| GET | `/credits/balance` | 충전금 잔액 조회 |
| POST | `/credits/sandbox-charge` | 샌드박스 충전 (테스트용) |
| POST | `/books` | 새 포토북(문제집) 생성 |
| POST | `/books/:bookUid/cover` | 표지 추가 |
| POST | `/books/:bookUid/contents` | 내지 콘텐츠 페이지 추가 |
| POST | `/books/:bookUid/finalize` | 포토북 확정 (인쇄 가능 상태로 전환) |
| POST | `/orders` | 인쇄 주문 생성 |
| GET | `/orders/:orderUid` | 주문 상태 조회 |
| POST | `/orders/:orderUid/cancel` | 주문 취소 |

**연동 설계 포인트:**
- 단일 학생: 책 1권 생성 → 최대 문제 수 채우기 → 부족분은 단어장/빈 페이지 패딩 → finalization
- 다수 학생(배치): 책 1권에 모든 학생 콘텐츠 합산 (학생별 헤더 페이지 포함) → 전체 24p 보장 → finalization 1회

### OpenAI API

| 모델 | 용도 |
|------|------|
| `gpt-4o-mini` | 기출 PDF 텍스트 → TOEIC 문제 (파트·유형·난이도·정답·해설) JSON 구조화 추출 |
| `gpt-4o-mini` | 학생 성적 분석 → 취약 파트 요약 코멘트 생성 |
| `gpt-4o-mini` | 학생 레벨·취약 파트 기반 문제 선별 기준(difficulty ratio) 생성 |

---

## AI 도구 사용 내역

| AI 도구 | 활용 내용 |
|---------|-----------|
| **Claude (claude.ai)** | 전체 프로젝트 아키텍처 설계, Prisma 스키마 설계, 백엔드 API 라우팅 전체 구현, SweetBook SDK 연동 로직 (패딩·배치 합산 설계), React 컴포넌트 구조 설계, SSE 스트리밍 구현, 학생 레벨 분석 서비스, 문제 선별 알고리즘, PDF 생성(pdfkit), 주문 관리 플로우, 디버깅 전 과정 |
| **GPT-4o-mini** (런타임) | 기출 PDF에서 TOEIC 문제 자동 추출 및 파트·유형·난이도 태깅, 학생 취약 파트 분석 코멘트 생성 |

---

## 설계 의도

### 왜 이 서비스를 선택했는가

토익 학원 강사가 매달 반복하는 작업 — 학생별 취약 파트 파악 → 문제 선별 → 인쇄 — 은 시간이 많이 걸리면서도 자동화 가능성이 높습니다.  
AI 문제 추출과 SweetBook 인쇄 API를 결합하면 이 플로우 전체를 소프트웨어로 대체할 수 있다고 판단했습니다.

### 비즈니스 가능성

- **반복 수익 모델:** 학원당 월정액 구독 + 인쇄 주문 수수료
- **확장성:** 토익 외 다른 자격증 시험 (토플, 공무원 영어 등)으로 수평 확장 가능
- **낮은 전환 비용:** 강사가 이미 갖고 있는 성적 엑셀 파일을 그대로 업로드해서 즉시 시작
- **AI 레버리지:** 기출 PDF가 쌓일수록 문제 DB가 풍부해져 서비스 품질 자동 향상

### 더 시간이 있었다면 추가했을 기능

- **학생 앱 (모바일):** 학생이 직접 문제집을 풀고 오답을 기록하는 앱
- **자동 오답 노트:** 틀린 문제 패턴 분석 → 2회차 복습 문제집 자동 생성
- **문제 변형 생성:** AI로 기존 문제를 유사하게 변형해 문제 DB 확장 (RAG 활용)
- **Listening 지원:** Part 1~4 음원 파일 업로드·연동
- **관리자 대시보드:** 학원 전체 성적 트렌드, 문제 사용 통계, 반별 취약 파트 분석
- **다국어 지원:** 일본·베트남 등 토익 수요가 높은 시장 대응

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | React + Vite, Tailwind CSS, React Router |
| 백엔드 | Node.js, Express |
| 데이터베이스 | PostgreSQL (Docker), Prisma 5 ORM |
| AI | OpenAI GPT-4o-mini (mock 모드 지원) |
| 인쇄 | SweetBook Book Print API (bookprintapi-nodejs-sdk) |
| PDF | PDFKit + NanumGothic 폰트, archiver (ZIP) |
| 기타 | ExcelJS (엑셀 파싱), pdfjs-dist (PDF 텍스트 추출), SSE (실시간 진행 스트리밍) |