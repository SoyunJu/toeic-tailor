# TOEIC Tailor

> 토익 학원을 위한 학생 맞춤 문제집 자동 생성 · 인쇄 주문 SaaS

학생별 성적 데이터를 분석해 취약 파트에 집중한 맞춤 문제집을 AI로 자동 생성하고,  
SweetBook API와 연동해 실물 인쇄 주문 또는 PDF 다운로드까지 원스톱으로 처리합니다.

![대시보드 메인 화면](docs/screenshots/dashboard-main.png)
<!-- 스크린샷 필요: 학생 목록 페이지 전체 화면 (학생 테이블 + 레벨 뱃지 + 취약파트 표시) -->

---

## 목차

- [서비스 소개](#서비스-소개)
- [주요 기능](#주요-기능)
- [실행 방법](#실행-방법)
- [환경변수](#환경변수)
- [사용한 API](#사용한-api)
- [AI 도구 사용 내역](#ai-도구-사용-내역)
- [설계 의도](#설계-의도)
- [문서](#문서)

---

## 서비스 소개

**TOEIC Tailor**는 토익 학원 원장·강사를 위한 B2B 웹 서비스입니다.

기존에는 학생마다 어떤 파트가 약한지 분석하고, 그에 맞는 문제를 골라 프린트하는 작업을 강사가 직접 했습니다.  
TOEIC Tailor는 이 과정을 자동화합니다.

1. 학생 성적 엑셀 파일 업로드 → 레벨 자동 분류 + 취약 파트 분석
2. 기출 PDF 업로드 → AI가 문제를 추출해 DB에 누적
3. 학생을 선택하면 취약 파트 맞춤 문제집 자동 생성
4. SweetBook으로 실물 인쇄 주문 또는 PDF 다운로드

**타겟 고객:** 소규모~중규모 토익 전문 학원 (원장, 수업 운영 담당자)

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 학생 관리 | 엑셀 일괄 등록, 직접 입력, 레벨 자동 분류 (BEGINNER ~ EXPERT) |
| 기출 문제 DB | RC 기출 PDF 업로드 → GPT-4o-mini가 문제 자동 추출·저장 |
| 맞춤 문제집 생성 | 취약 파트·난이도 기반 문제 선별, 다수 학생 일괄 생성 (실시간 진행 표시) |
| SweetBook 연동 | 문제집을 SweetBook에 발행하여 실물 인쇄 주문 |
| PDF 다운로드 | 개별 PDF 또는 ZIP 일괄 다운로드, 인라인 미리보기 |
| 설정 관리 | 문제 수·페이지 수·AI 프로바이더를 UI에서 변경, DB에 영속 저장 |
| 다크모드 | 시스템 설정과 독립적으로 토글, localStorage에 저장 |

---

## 실행 방법

### 사전 준비

- Node.js 18+
- Docker (PostgreSQL 컨테이너용)

### 설치 및 실행

```bash
# 1. 저장소 클론
git clone https://github.com/soyunju/toeic-tailor.git
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

# 6. 개발 서버 실행 (client :5173 + server :4000 동시 기동)
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

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
SWEETBOOK_BOOK_SPEC_UID=PHOTOBOOK_A4_SC
SWEETBOOK_CONTENT_TEMPLATE_UID=your_content_template_uid
SWEETBOOK_COVER_TEMPLATE_UID=your_cover_template_uid

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
| GET | `/credits/balance` | 잔액 조회 |
| POST | `/credits/sandbox-charge` | 샌드박스 충전 (테스트용) |
| POST | `/books` | 새 포토북(문제집) 생성 |
| POST | `/books/:bookUid/finalize` | 포토북 확정 (인쇄 가능 상태) |
| POST | `/orders` | 인쇄 주문 생성 |
| GET | `/orders/:orderUid` | 주문 상태 조회 |
| DELETE | `/orders/:orderUid` | 주문 취소 |

> 상세 연동 방식은 [`docs/sweetbook-integration.md`](docs/sweetbook-integration.md) 참고

### OpenAI API

| 모델 | 용도 |
|------|------|
| `gpt-4o-mini` | RC 기출 PDF 텍스트 → TOEIC 문제 JSON 구조화 추출 |

---

## AI 도구 사용 내역

| AI 도구 | 활용 내용 |
|---------|-----------|
| **Claude Code** | 전체 프로젝트 아키텍처 설계, 백엔드 API 라우팅 구조, Prisma 스키마 설계, React 컴포넌트 구조, SSE 스트리밍 구현, 페이지네이션·선택 UI, Toast/Skeleton/다크모드 시스템, 학생 상세 페이지, PDF 인라인 뷰어, 설정 DB 영속화, 문제 랜덤화 로직, 워크북 재생성 API |
| **GPT-4o-mini** (런타임) | 기출 PDF 텍스트에서 TOEIC 문제 (파트·유형·난이도·정답·해설) 구조화 추출 |

---

## 설계 의도

### 왜 이 서비스를 선택했는가

토익 학원 강사가 매달 반복적으로 수행하는 작업 — 학생별 취약 파트 파악 → 문제 선별 → 인쇄 — 은 시간이 많이 걸리면서도 자동화 가능성이 높습니다.  
AI 문제 추출과 SweetBook 인쇄 API를 결합하면 이 플로우 전체를 소프트웨어로 대체할 수 있다고 판단했습니다.

### 비즈니스 가능성

- **반복 수익 모델:** 학원당 월정액 구독 + 인쇄 주문 수수료
- **확장성:** 토익 외 다른 자격증 시험(토플, 공무원 영어 등)으로 수평 확장 가능
- **낮은 전환 비용:** 강사가 이미 갖고 있는 성적 엑셀 파일을 그대로 업로드해서 시작 가능
- **AI 레버리지:** 기출 PDF가 쌓일수록 문제 DB가 풍부해져 서비스 품질 자동 향상

### 더 시간이 있었다면 추가했을 기능

- **학생 앱 (모바일):** 학생이 직접 문제집을 풀고 결과를 기록하는 앱
- **자동 오답 노트 생성:** 틀린 문제 패턴 분석 → 2회차 복습 문제집 자동 생성
- **Listening 지원:** Part 1~4 음원 파일 연동
- **다국어 지원:** 일본·베트남 등 토익 수요가 높은 시장 대응
- **관리자 대시보드:** 학원 전체 성적 트렌드, 문제 사용 통계

---

## 문서

자세한 내용은 [`docs/`](docs/) 디렉토리를 참고하세요.

| 문서 | 내용 |
|------|------|
| [아키텍처](docs/architecture.md) | 시스템 구조, 기술 스택, 데이터 흐름 |
| [API 레퍼런스](docs/api-reference.md) | 전체 REST API 명세 |
| [데이터 모델](docs/data-models.md) | DB 스키마 및 모델 관계 |
| [기능 가이드](docs/features.md) | 화면별 기능 사용 방법 (스크린샷 포함) |
| [SweetBook 연동](docs/sweetbook-integration.md) | 인쇄 API 연동 상세 |

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | React 19, Vite, Tailwind CSS, React Router |
| 백엔드 | Node.js, Express 5 |
| 데이터베이스 | PostgreSQL, Prisma ORM |
| AI | OpenAI GPT-4o-mini (mock 모드 지원) |
| 인쇄 | SweetBook Book Print API SDK |
| PDF | PDFKit (생성), iframe + blob URL (미리보기) |
