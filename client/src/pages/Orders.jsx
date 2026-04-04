import { useEffect, useState }                              from 'react';
import { getOrders, cancelOrder, createOrder,
    downloadWorkbookPdf, downloadWorkbooksZip }        from '../api';

const TABS = ['전체 목록', 'PDF 다운로드'];

const STATUS_LABEL = {
    PAID: '결제완료', PDF_READY: 'PDF준비', CONFIRMED: '제작확정',
    IN_PRODUCTION: '제작중', COMPLETED: '제작완료',
    PRODUCTION_COMPLETE: '제작완료', SHIPPED: '배송중',
    DELIVERED: '배송완료', CANCELLED: '취소', CANCELLED_REFUND: '취소/환불', ERROR: '오류',
};
const STATUS_COLOR = {
    PAID: 'bg-blue-100 text-blue-700', CONFIRMED: 'bg-purple-100 text-purple-700',
    IN_PRODUCTION: 'bg-yellow-100 text-yellow-700', SHIPPED: 'bg-green-100 text-green-700',
    DELIVERED: 'bg-green-200 text-green-800', CANCELLED: 'bg-red-100 text-red-600',
    CANCELLED_REFUND: 'bg-red-100 text-red-600', ERROR: 'bg-gray-100 text-gray-500',
};

const SHIPPING_DEFAULT = {
    recipientName: '', recipientPhone: '', postalCode: '', address1: '', address2: '',
};

function triggerDownload(blob, filename) {
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.click();
    URL.revokeObjectURL(url);
}

// ── 주문하기 모달 ────────────────────────────────────
function OrderModal({ workbookId, studentName, onClose, onSuccess }) {
    const [shipping, setShipping] = useState(SHIPPING_DEFAULT);
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState(null);

    async function handleOrder() {
        setLoading(true); setError(null);
        try {
            await createOrder({ workbookId, quantity: 1, shipping });
            onSuccess();
            onClose();
        } catch (e) {
            setError(e.response?.data?.message || e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
                <h2 className="text-lg font-bold">주문하기 — {studentName}</h2>
                <p className="text-xs text-gray-400">샌드박스 환경에서는 충전금이 자동 충전됩니다.</p>

                <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                        { key: 'recipientName',  label: '수령인',   span: 1 },
                        { key: 'recipientPhone', label: '전화번호', span: 1 },
                        { key: 'postalCode',     label: '우편번호', span: 1 },
                        { key: 'address1',       label: '주소',     span: 2 },
                        { key: 'address2',       label: '상세주소', span: 2 },
                    ].map(({ key, label, span }) => (
                        <div key={key} className={span === 2 ? 'col-span-2' : ''}>
                            <label className="block text-gray-600 mb-1">{label}</label>
                            <input type="text" value={shipping[key]}
                                   onChange={e => setShipping(p => ({ ...p, [key]: e.target.value }))}
                                   className="border rounded px-3 py-2 w-full text-sm" />
                        </div>
                    ))}
                </div>

                {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">❌ {error}</p>
                )}

                <div className="flex gap-2 pt-1">
                    <button onClick={handleOrder} disabled={loading}
                            className="flex-1 py-2 bg-green-600 text-white rounded font-medium
              hover:bg-green-700 disabled:opacity-40 transition text-sm">
                        {loading ? '주문 중...' : '주문하기'}
                    </button>
                    <button onClick={onClose}
                            className="flex-1 py-2 border rounded text-sm hover:bg-gray-50">
                        취소
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── 탭1: 전체 목록 ───────────────────────────────────
function AllOrdersTab({ orders, onRefresh }) {
    const [orderTarget, setOrderTarget] = useState(null);

    async function handleCancel(workbookId) {
        const reason = prompt('취소 사유를 입력하세요');
        if (!reason) return;
        try {
            await cancelOrder(workbookId, reason);
            onRefresh();
        } catch (e) {
            alert(e.response?.data?.message || e.message);
        }
    }

    return (
        <>
            {orderTarget && (
                <OrderModal
                    workbookId={orderTarget.workbookId}
                    studentName={orderTarget.studentName}
                    onClose={() => setOrderTarget(null)}
                    onSuccess={onRefresh}
                />
            )}

            <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b">
                    <tr>
                        <th className="px-4 py-3 text-left">학생</th>
                        <th className="px-4 py-3 text-left">레벨</th>
                        <th className="px-4 py-3 text-left">bookUid</th>
                        <th className="px-4 py-3 text-left">주문상태</th>
                        <th className="px-4 py-3 text-left">생성일</th>
                        <th className="px-4 py-3 text-left">액션</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y">
                    {orders.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                                생성된 문제집이 없습니다.
                            </td>
                        </tr>
                    ) : orders.map(o => (
                        <tr key={o.workbookId} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{o.student?.name}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{o.student?.level}</td>
                            <td className="px-4 py-3 text-gray-400 font-mono text-xs truncate max-w-xs">{o.bookUid}</td>
                            <td className="px-4 py-3">
                                {o.orderUid ? (
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[o.orderStatus] || 'bg-gray-100'}`}>
                      {STATUS_LABEL[o.orderStatus] || o.orderStatus}
                    </span>
                                ) : (
                                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">미주문</span>
                                )}
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-xs">
                                {o.createdAt ? new Date(o.createdAt).toLocaleDateString('ko-KR') : '-'}
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex gap-1">
                                    {!o.orderUid && (
                                        <button
                                            onClick={() => setOrderTarget({ workbookId: o.workbookId, studentName: o.student?.name })}
                                            className="px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100">
                                            주문하기
                                        </button>
                                    )}
                                    {['PAID', 'PDF_READY'].includes(o.orderStatus) && (
                                        <button onClick={() => handleCancel(o.workbookId)}
                                                className="px-2 py-1 text-xs border border-red-200 text-red-500 rounded hover:bg-red-50">
                                            취소
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

// ── 탭2: PDF 다운로드 ────────────────────────────────
function PdfDownloadTab({ orders }) {
    const [selected,    setSelected]    = useState(new Set());
    const [downloading, setDownloading] = useState(false);

    const pdfOrders = orders.filter(o => o.bookUid);

    function toggleAll() {
        selected.size === pdfOrders.length
            ? setSelected(new Set())
            : setSelected(new Set(pdfOrders.map(o => o.workbookId)));
    }

    function toggleOne(id) {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    async function handleSingleDownload(workbookId, studentName) {
        try {
            const res = await downloadWorkbookPdf(workbookId);
            triggerDownload(res.data, studentName + '_맞춤문제집.pdf');
        } catch (e) {
            alert('PDF 생성 실패: ' + e.message);
        }
    }

    async function handleZipDownload() {
        if (!selected.size) return;
        setDownloading(true);
        try {
            const res = await downloadWorkbooksZip([...selected]);
            triggerDownload(res.data, 'workbooks.zip');
        } catch (e) {
            alert('ZIP 생성 실패: ' + e.message);
        } finally {
            setDownloading(false);
        }
    }

    if (pdfOrders.length === 0) {
        return <p className="text-gray-400 text-sm mt-4">생성된 문제집이 없습니다.</p>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{selected.size}개 선택됨</span>
                <button onClick={handleZipDownload}
                        disabled={!selected.size || downloading}
                        className="px-4 py-2 bg-purple-600 text-white text-sm rounded
            hover:bg-purple-700 disabled:opacity-40 transition">
                    {downloading ? '생성 중...' : `ZIP 다운로드 (${selected.size}개)`}
                </button>
            </div>

            <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b">
                    <tr>
                        <th className="px-4 py-3">
                            <input type="checkbox"
                                   checked={selected.size === pdfOrders.length && pdfOrders.length > 0}
                                   onChange={toggleAll}
                                   className="w-4 h-4 accent-purple-600" />
                        </th>
                        <th className="px-4 py-3 text-left">학생</th>
                        <th className="px-4 py-3 text-left">레벨</th>
                        <th className="px-4 py-3 text-left">주문상태</th>
                        <th className="px-4 py-3 text-left">생성일</th>
                        <th className="px-4 py-3 text-left">개별 다운로드</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y">
                    {pdfOrders.map(o => (
                        <tr key={o.workbookId} className="hover:bg-purple-50">
                            <td className="px-4 py-3 text-center">
                                <input type="checkbox"
                                       checked={selected.has(o.workbookId)}
                                       onChange={() => toggleOne(o.workbookId)}
                                       className="w-4 h-4 accent-purple-600" />
                            </td>
                            <td className="px-4 py-3 font-medium">{o.student?.name}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{o.student?.level}</td>
                            <td className="px-4 py-3">
                                {o.orderUid ? (
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[o.orderStatus] || 'bg-gray-100'}`}>
                      {STATUS_LABEL[o.orderStatus] || o.orderStatus}
                    </span>
                                ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                )}
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-xs">
                                {o.createdAt ? new Date(o.createdAt).toLocaleDateString('ko-KR') : '-'}
                            </td>
                            <td className="px-4 py-3">
                                <button onClick={() => handleSingleDownload(o.workbookId, o.student?.name)}
                                        className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition">
                                    📄 PDF
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── 메인 ─────────────────────────────────────────────
export default function Orders() {
    const [tab,     setTab]     = useState(0);
    const [orders,  setOrders]  = useState([]);
    const [loading, setLoading] = useState(true);

    async function load() {
        setLoading(true);
        try {
            const r = await getOrders();
            setOrders(r.data.data);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">주문 목록</h1>
                <button onClick={load}
                        className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50">
                    🔄 새로고침
                </button>
            </div>

            <div className="flex gap-1 mb-6 border-b">
                {TABS.map((t, i) => (
                    <button key={i} onClick={() => setTab(i)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition
              ${tab === i ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        {t}
                    </button>
                ))}
            </div>

            {loading ? (
                <p className="text-gray-400 text-sm">불러오는 중...</p>
            ) : (
                <>
                    {tab === 0 && <AllOrdersTab orders={orders} onRefresh={load} />}
                    {tab === 1 && <PdfDownloadTab orders={orders} />}
                </>
            )}
        </div>
    );
}