import { useEffect, useState } from 'react';
import { getOrders, cancelOrder } from '../api';

const STATUS_LABEL = {
    PAID:                '결제완료',
    PDF_READY:           'PDF 준비',
    CONFIRMED:           '제작확정',
    IN_PRODUCTION:       '제작중',
    COMPLETED:           '제작완료',
    PRODUCTION_COMPLETE: '제작완료',
    SHIPPED:             '배송중',
    DELIVERED:           '배송완료',
    CANCELLED:           '취소',
    CANCELLED_REFUND:    '취소/환불',
    ERROR:               '오류',
};

const STATUS_COLOR = {
    PAID:             'bg-blue-100 text-blue-700',
    CONFIRMED:        'bg-purple-100 text-purple-700',
    IN_PRODUCTION:    'bg-yellow-100 text-yellow-700',
    SHIPPED:          'bg-green-100 text-green-700',
    DELIVERED:        'bg-green-200 text-green-800',
    CANCELLED:        'bg-red-100 text-red-600',
    CANCELLED_REFUND: 'bg-red-100 text-red-600',
    ERROR:            'bg-gray-100 text-gray-500',
};

export default function Orders() {
    const [orders,  setOrders]  = useState([]);
    const [loading, setLoading] = useState(true);

    async function load() {
        setLoading(true);
        getOrders()
            .then(r => setOrders(r.data.data))
            .finally(() => setLoading(false));
    }

    useEffect(() => { load(); }, []);

    async function handleCancel(workbookId) {
        const reason = prompt('취소 사유를 입력하세요');
        if (!reason) return;
        try {
            await cancelOrder(workbookId, reason);
            load();
        } catch (e) {
            alert(e.response?.data?.message || e.message);
        }
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">📦 주문 목록</h1>
                <button
                    onClick={load}
                    className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50"
                >
                    🔄 새로고침
                </button>
            </div>

            {loading ? (
                <p className="text-gray-400 text-sm">불러오는 중...</p>
            ) : orders.length === 0 ? (
                <p className="text-gray-400 text-sm">주문 내역이 없습니다.</p>
            ) : (
                <div className="bg-white rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>
                            <th className="px-4 py-3 text-left">학생</th>
                            <th className="px-4 py-3 text-left">orderUid</th>
                            <th className="px-4 py-3 text-left">상태</th>
                            <th className="px-4 py-3 text-left">취소</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y">
                        {orders.map(o => (
                            <tr key={o.orderUid}>
                                <td className="px-4 py-3 font-medium">{o.student?.name}</td>
                                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{o.orderUid}</td>
                                <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[o.orderStatus] || 'bg-gray-100'}`}>
                      {STATUS_LABEL[o.orderStatus] || o.orderStatus}
                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    {['PAID', 'PDF_READY'].includes(o.orderStatus) && (
                                        <button
                                            onClick={() => handleCancel(o.workbookId)}
                                            className="text-xs text-red-500 hover:underline"
                                        >
                                            취소
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}