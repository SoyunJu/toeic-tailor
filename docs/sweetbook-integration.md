# SweetBook 연동 가이드

SweetBook은 포토북/문제집 인쇄 주문 API입니다.  
TOEIC Tailor는 SweetBook의 Node.js SDK(`bookprintapi-nodejs-sdk`)를 사용합니다.

---

## 환경 설정

```env
SWEETBOOK_API_KEY=your_api_key
SWEETBOOK_API_BASE_URL=https://api-sandbox.sweetbook.com/v1
SWEETBOOK_BOOK_SPEC_UID=PHOTOBOOK_A4_SC
SWEETBOOK_CONTENT_TEMPLATE_UID=your_content_template_uid
SWEETBOOK_COVER_TEMPLATE_UID=your_cover_template_uid
```

> 현재는 **샌드박스(sandbox)** 환경을 사용합니다.  
> 실서비스 전환 시 `SWEETBOOK_API_BASE_URL`을 프로덕션 URL로 변경하세요.

---

## 문제집 발행 플로우

```
generateWorkbook()
  │ 문제집 생성 + WorkbookQuestion 저장
  ▼
trySweetBookPublish()
  │
  ├── sbClient.books.create({
  │     spec: PHOTOBOOK_A4_SC,
  │     contentTemplate: SWEETBOOK_CONTENT_TEMPLATE_UID,
  │     coverTemplate: SWEETBOOK_COVER_TEMPLATE_UID,
  │     externalRef: workbook.id,
  │     pages: [...]   ← 문제 내용 + 표지
  │   })
  │   → bookUid 반환
  │
  └── sbClient.books.finalize(bookUid)
        → DRAFT → FINALIZED (인쇄 가능 상태)

DB: Workbook.bookUid, bookStatus = 'FINALIZED' 업데이트
```

---

## 페이지 구성 규칙

SweetBook은 **최소 24페이지**를 요구합니다.

| 페이지 | 내용 |
|--------|------|
| 1 | 표지 (학생 이름, 반, 레벨, 생성일) |
| 2 ~ (1 + 문제수/페이지당수) | 문제 페이지 (기본 4문제/페이지) |
| 나머지 | 어휘 목록으로 패딩 (최소 페이지 채우기) |

20문제 기준 예시:
- 표지 1장
- 문제 5장 (4문제 × 5)
- 어휘 패딩 18장
- **합계 24장**

---

## 일괄 생성 (Batch) 특이 사항

`/generate-batch` API는 여러 학생의 문제집을 **하나의 bookUid**로 묶어 발행합니다.

```
학생 A (20문제) ┐
학생 B (20문제) ├─→ SweetBook 1권 (60문제 + 각 학생 섹션 구분)
학생 C (20문제) ┘
```

각 학생 섹션은 이름과 정보가 인쇄된 소제목으로 구분됩니다.

---

## 인쇄 주문 플로우

```
POST /api/orders
  │
  ├── GET /credits/balance
  │     잔액 < 50,000원?
  │     └── POST /credits/sandbox-charge (100,000원 자동 충전)
  │
  └── sbClient.orders.create({
        bookUid,
        idempotencyKey: `order-${workbookId}-${timestamp}`,
        quantity: 1,
        ...
      })
      → orderUid 반환

DB: Workbook.orderUid, orderStatus 업데이트
```

**멱등성 키(idempotencyKey):** 네트워크 오류 등으로 중복 요청이 발생해도 주문이 한 번만 처리되도록 보장합니다.

---

## 크레딧 관리

| 상황 | 동작 |
|------|------|
| 잔액 ≥ 50,000원 | 주문 바로 진행 |
| 잔액 < 50,000원 | 100,000원 자동 샌드박스 충전 후 주문 |
| 수동 충전 | 상단 크레딧 위젯 "충전" 버튼 |

---

## 주문 상태 흐름

```
(없음) → PENDING → PAID → (인쇄 중) → SHIPPED
              └──→ CANCELLED
```

| 상태 | 설명 |
|------|------|
| `PENDING` | 주문 생성됨, 결제 대기 |
| `PAID` | 결제 완료 (샌드박스에서는 즉시) |
| `CANCELLED` | 취소됨 |

---

## 오류 처리

SweetBook API 호출 실패 시:
- `trySweetBookPublish` 함수는 실패해도 워크북 생성 자체는 성공으로 처리됩니다.
- `bookUid`가 없는 워크북은 DRAFT 상태로 남습니다.
- 이후 "재생성" 버튼으로 SweetBook 발행을 재시도할 수 있습니다.

---

## 개발 환경에서 테스트

샌드박스 환경이므로 실제 결제는 발생하지 않습니다.

```bash
# 잔액 확인
curl http://localhost:4000/api/credits

# 충전
curl -X POST http://localhost:4000/api/credits/charge \
  -H "Content-Type: application/json" \
  -d '{"amount": 100000}'
```
