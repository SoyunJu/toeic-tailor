📄 README.md
# TOEIC Tailor

토익 학원 학생 맞춤 문제집 자동 생성 SaaS (MVP)

## 개요

학생 성적 데이터를 분석해 개인별 취약 파트/유형에 맞는 문제집을 자동 생성하고,  
SweetBook API를 통해 실물 인쇄 주문/PDF 다운로드 까지 연결하는 B2B 웹 애플리케이션.

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프론트엔드 | React + Vite + Tailwind CSS |
| 백엔드 | Node.js + Express |
| DB | PostgreSQL (Docker) + Prisma 5 ORM |
| AI | OpenAI GPT-4o-mini (mock 모드 지원) |
| 인쇄 API | SweetBook API (Node.js SDK) |

## 실행 방법
```bash
# 1. 의존성 설치
npm run install:all

# 2. 환경변수 설정
cp server/.env.example server/.env
# .env 편집: DB, SweetBook API Key, OpenAI API Key

# 3. DB 기동 (Docker 필요)
docker-compose up -d

# 4. DB 마이그레이션 + 시드
cd server
npx prisma migrate dev
node prisma/seed.js
cd ..

# 5. 개발 서버 기동
npm run dev
```

## 주요 기능

- **엑셀 업로드**: 학생 성적 엑셀 파일 파싱 → DB 저장 → 레벨 자동 분류
- **기출 업로드**: RC 기출 PDF → AI 분석 → 문제 DB 적재
- **문제집 생성**: 학생별 취약 파트/난이도 분석 → 개인 맞춤 문제 선별
- **일괄 생성**: 다수 학생 선택 → 1권으로 합산 생성 → SweetBook 발행
- **주문**: SweetBook 충전금으로 실물 인쇄 주문
- **PDF 다운로드**: 문제집 PDF 개별/ZIP 다운로드

## 환경변수
```
DATABASE_URL=postgresql://...
SWEETBOOK_API_KEY=...
SWEETBOOK_API_BASE_URL=https://api-sandbox.sweetbook.com/v1
SWEETBOOK_BOOK_SPEC_UID=PHOTOBOOK_A4_SC
SWEETBOOK_CONTENT_TEMPLATE_UID=...
SWEETBOOK_COVER_TEMPLATE_UID=...
AI_PROVIDER=mock  # mock | openai
OPENAI_API_KEY=...
WORKBOOK_DEFAULT_QUESTIONS=20
WORKBOOK_MAX_QUESTIONS=23
WORKBOOK_MIN_PAGES=24
```