// ── 수강생 분류 ──────────────────────────────────────────────
export const CLASS_NAME_OPTIONS = [
    { value: '',           label: '전체 반' },
    { value: 'TARGET_600', label: '600목표반' },
    { value: 'TARGET_800', label: '800목표반' },
    { value: 'HIGH_SCORE', label: '고득점반' },
];

export const CLASS_TYPE_OPTIONS = [
    { value: '',        label: '전체' },
    { value: 'WEEKDAY', label: '평일반' },
    { value: 'WEEKEND', label: '주말반' },
];

export const LEVEL_OPTIONS = [
    { value: '',             label: '전체 레벨' },
    { value: 'BEGINNER',     label: 'BEGINNER' },
    { value: 'INTERMEDIATE', label: 'INTERMEDIATE' },
    { value: 'ADVANCED',     label: 'ADVANCED' },
    { value: 'EXPERT',       label: 'EXPERT' },
];

export const LEVEL_COLOR = {
    BEGINNER:     'bg-gray-100 text-gray-600',
    INTERMEDIATE: 'bg-blue-100 text-blue-700',
    ADVANCED:     'bg-purple-100 text-purple-700',
    EXPERT:       'bg-green-100 text-green-700',
};

// ── 문제 분류 ──────────────────────────────────────────────
export const QUESTION_TYPES = [
    'PHOTO_DESCRIPTION', 'SHORT_RESPONSE', 'SHORT_CONVERSATION', 'LONG_TALK',
    'GRAMMAR', 'VOCABULARY', 'SHORT_PASSAGE_FILL',
    'SINGLE_PASSAGE', 'DOUBLE_PASSAGE', 'TRIPLE_PASSAGE',
];

export const DIFFICULTIES = ['LOW', 'MEDIUM', 'HIGH'];

// ── 주문 상태 ──────────────────────────────────────────────
export const STATUS_LABEL = {
    PAID: '결제완료', PDF_READY: 'PDF준비', CONFIRMED: '제작확정',
    IN_PRODUCTION: '제작중', COMPLETED: '제작완료',
    PRODUCTION_COMPLETE: '제작완료', SHIPPED: '배송중',
    DELIVERED: '배송완료', CANCELLED: '취소', CANCELLED_REFUND: '취소/환불', ERROR: '오류',
    '20': '결제완료', '25': 'PDF준비', '30': '제작확정',
    '40': '제작중',   '45': '제작완료', '50': '제작완료',
    '60': '배송중',   '70': '배송완료', '80': '취소',
    '81': '취소/환불','90': '오류',
};

export const STATUS_COLOR = {
    PAID: 'bg-blue-100 text-blue-700', CONFIRMED: 'bg-purple-100 text-purple-700',
    IN_PRODUCTION: 'bg-yellow-100 text-yellow-700', SHIPPED: 'bg-green-100 text-green-700',
    DELIVERED: 'bg-green-200 text-green-800', CANCELLED: 'bg-red-100 text-red-600',
    CANCELLED_REFUND: 'bg-red-100 text-red-600', ERROR: 'bg-gray-100 text-gray-500',
};
