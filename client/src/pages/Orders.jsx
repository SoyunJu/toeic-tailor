import {useEffect, useState} from 'react';
import {cancelOrder, createOrder, downloadWorkbookPdf, downloadWorkbooksZip, getOrders} from '../api';
import Pagination from '../components/Pagination';
import { SkeletonCard } from '../components/Skeleton';
import PdfPreviewModal from '../components/PdfPreviewModal';
import { useToast } from '../context/ToastContext';
import { STATUS_LABEL, STATUS_COLOR } from '../constants';

const TABS = ['전체 목록', 'PDF 다운로드'];
const ORDER_PAGE_SIZE = 10;
const PDF_PAGE_SIZE   = 15;

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
    const { addToast } = useToast();

    async function handleOrder() {
        setLoading(true);
        try {
            await createOrder({ workbookId, quantity: 1, shipping });
            addToast('success', '주문이 완료되었습니다.');
            onSuccess();
            onClose();
        } catch (e) {
            addToast('error', e.response?.data?.message || e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6 space-y-4">
                <h2 className="text-lg font-bold dark:text-gray-100">주문하기 — {studentName}</h2>
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
                            <label className="block text-gray-600 dark:text-gray-400 mb-1">{label}</label>
                            <input type="text" value={shipping[key]}
                                   onChange={e => setShipping(p => ({ ...p, [key]: e.target.value }))}
                                   className="border dark:border-gray-600 rounded px-3 py-2 w-full text-sm
                                       dark:bg-gray-700 dark:text-gray-100" />
                        </div>
                    ))}
                </div>

                <div className="flex gap-2 pt-1">
                    <button onClick={handleOrder} disabled={loading}
                            className="flex-1 py-2 bg-green-600 text-white rounded font-medium
                                hover:bg-green-700 disabled:opacity-40 transition text-sm">
                        {loading ? '주문 중...' : '주문하기'}
                    </button>
                    <button onClick={onClose}
                            className="flex-1 py-2 border dark:border-gray-600 rounded text-sm
                                hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">
                        취소
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── 탭1: 전체 목록 ───────────────────────────────────
function AllOrdersTab({orders, onRefresh}) {
    const [selected,    setSelected]    = useState(new Set());
    const [orderTarget, setOrderTarget] = useState(null);
    const [page,        setPage]        = useState(1);
    const [filterStatus, setFilterStatus] = useState('');
    const { addToast } = useToast();

    const filteredOrders = filterStatus
        ? orders.filter(g => {
            if (filterStatus === 'unordered') return !g.orderUid;
            return g.orderStatus === filterStatus || STATUS_LABEL[g.orderStatus] === STATUS_LABEL[filterStatus];
        })
        : orders;

    const totalPages  = Math.max(1, Math.ceil(filteredOrders.length / ORDER_PAGE_SIZE));
    const pagedOrders = filteredOrders.slice((page - 1) * ORDER_PAGE_SIZE, page * ORDER_PAGE_SIZE);

    function toggleGroup(key) {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    }

    function toggleAll() {
        const unordered = orders.filter(g => !g.orderUid).map(g => g.groupKey);
        selected.size === unordered.length
            ? setSelected(new Set())
            : setSelected(new Set(unordered));
    }

    async function handleBulkOrder() {
        const targets = orders.filter(g => selected.has(g.groupKey) && !g.orderUid);
        if (!targets.length) return;
        setOrderTarget({
            workbookId:  targets[0].members[0]?.workbookId,
            studentName: targets.map(g => g.title).join(', '),
        });
    }

    async function handleCancel(group) {
        if (!confirm(`"${group.title}" 주문을 취소하시겠습니까?`)) return;
        try {
            await cancelOrder(group.members[0]?.workbookId, '사용자 취소');
            addToast('success', '주문이 취소되었습니다.');
            onRefresh();
        } catch (e) {
            addToast('error', e.response?.data?.message || e.message);
        }
    }

    const unorderedCount = orders.filter(g => !g.orderUid).length;

    const statusOptions = [
        { value: '',          label: '전체 상태' },
        { value: 'unordered', label: '미주문' },
        { value: 'PAID',      label: '결제완료' },
        { value: 'IN_PRODUCTION', label: '제작중' },
        { value: 'SHIPPED',   label: '배송중' },
        { value: 'DELIVERED', label: '배송완료' },
        { value: 'CANCELLED', label: '취소' },
    ];

    return (
        <>
            {orderTarget && (
                <OrderModal
                    workbookId={orderTarget.workbookId}
                    studentName={orderTarget.studentName}
                    onClose={() => setOrderTarget(null)}
                    onSuccess={() => { setSelected(new Set()); onRefresh(); }}
                />
            )}

            {/* 상단 액션 바 */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                    <input type="checkbox"
                           checked={selected.size === unorderedCount && unorderedCount > 0}
                           onChange={toggleAll}
                           className="w-4 h-4 accent-blue-600"/>
                    전체 선택 (미주문)
                </label>
                <button onClick={handleBulkOrder}
                        disabled={!selected.size}
                        className="px-4 py-1.5 text-sm bg-green-600 text-white rounded
                            hover:bg-green-700 disabled:opacity-40 transition">
                    🛒 선택 주문하기 ({selected.size}건)
                </button>
                <div className="ml-auto">
                    <select value={filterStatus}
                            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                            className="border dark:border-gray-600 rounded px-3 py-1.5 text-sm
                                dark:bg-gray-800 dark:text-gray-100">
                        {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            {filteredOrders.length === 0 ? (
                <p className="text-gray-400 text-sm">생성된 문제집이 없습니다.</p>
            ) : (
                <>
                    <div className="space-y-4">
                        {pagedOrders.map(group => (
                            <div key={group.groupKey}
                                 className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
                                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700
                                    flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-3">
                                        {!group.orderUid && (
                                            <input type="checkbox"
                                                   checked={selected.has(group.groupKey)}
                                                   onChange={() => toggleGroup(group.groupKey)}
                                                   className="w-4 h-4 accent-blue-600"/>
                                        )}
                                        <div>
                                            <span className="font-medium text-sm dark:text-gray-100">{group.title}</span>
                                            {group.bookUid && (
                                                <span className="ml-2 text-xs text-gray-400">
                                                    BookUID: {group.bookUid.slice(0, 8)}…
                                                </span>
                                            )}
                                        </div>
                                        {group.orderUid ? (
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[group.orderStatus] || 'bg-gray-100'}`}>
                                                {STATUS_LABEL[group.orderStatus] || group.orderStatus}
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                                                미주문
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex gap-2 items-center">
                                        <span className="text-xs text-gray-400">{group.members.length}명</span>
                                        {group.orderUid && ['20', 'PAID', 'PDF_READY'].includes(group.orderStatus) && (
                                            <button onClick={() => handleCancel(group)}
                                                    className="px-3 py-1 text-xs border border-red-200 text-red-500 rounded hover:bg-red-50">
                                                주문 취소
                                            </button>
                                        )}
                                        {!group.orderUid && (
                                            <button onClick={() => setOrderTarget({ workbookId: group.members[0]?.workbookId, studentName: group.title })}
                                                    className="px-3 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100">
                                                🛒 주문하기
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <table className="w-full text-sm">
                                    <thead className="text-gray-400 text-xs border-b dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 py-2 text-left">학생</th>
                                        <th className="px-4 py-2 text-left">레벨</th>
                                        <th className="px-4 py-2 text-right">문제수</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y dark:divide-gray-700">
                                    {group.members.map(m => (
                                        <tr key={m.workbookId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                            <td className="px-4 py-2 font-medium dark:text-gray-100">{m.student?.name}</td>
                                            <td className="px-4 py-2 text-gray-500 dark:text-gray-400 text-xs">{m.student?.level}</td>
                                            <td className="px-4 py-2 text-right text-gray-400 text-xs">{m.totalQuestions ?? '-'}문항</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                    <Pagination page={page} totalPages={totalPages} totalItems={filteredOrders.length}
                                pageSize={ORDER_PAGE_SIZE} onChange={setPage} />
                </>
            )}
        </>
    );
}

// ── 탭2: PDF 다운로드 ────────────────────────────────
function PdfDownloadTab({ orders, groupedOrders }) {
    const [selected,         setSelected]         = useState(new Set());
    const [downloading,      setDownloading]      = useState(false);
    const [groupDownloading, setGroupDownloading] = useState(new Set());
    const [viewMode,         setViewMode]         = useState('grouped');
    const [page,             setPage]             = useState(1);
    const [preview,          setPreview]          = useState(null); // { workbookId, studentName }

    const pdfGroups = groupedOrders.filter(g => g.bookUid);
    const pdfOrders = orders.filter(o => o.bookUid);

    const flatTotalPages = Math.max(1, Math.ceil(pdfOrders.length / PDF_PAGE_SIZE));
    const pagedFlat      = pdfOrders.slice((page - 1) * PDF_PAGE_SIZE, page * PDF_PAGE_SIZE);

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

    function toggleGroup(members) {
        const ids = members.map(m => m.workbookId);
        setSelected(prev => {
            const next = new Set(prev);
            const allIn = ids.every(id => next.has(id));
            allIn ? ids.forEach(id => next.delete(id)) : ids.forEach(id => next.add(id));
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

    async function handleGroupDownload(group) {
        const ids = group.members.map(m => m.workbookId);
        setGroupDownloading(prev => new Set([...prev, group.bookUid]));
        try {
            const res = await downloadWorkbooksZip(ids);
            const title = (group.title || group.bookUid || 'group').replace(/\//g, '-').replace(/\s/g, '_');
            triggerDownload(res.data, `주문_${title}.zip`);
        } catch (e) {
            alert('ZIP 생성 실패: ' + e.message);
        } finally {
            setGroupDownloading(prev => { const next = new Set(prev); next.delete(group.bookUid); return next; });
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
            {preview && (
                <PdfPreviewModal
                    workbookId={preview.workbookId}
                    studentName={preview.studentName}
                    onClose={() => setPreview(null)}
                />
            )}

            {/* 뷰 모드 + 액션 바 */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex border dark:border-gray-600 rounded overflow-hidden text-sm">
                    {['grouped', 'flat'].map((mode, i) => (
                        <button key={mode}
                                onClick={() => { setViewMode(mode); setPage(1); }}
                                className={`px-3 py-1.5 transition ${i > 0 ? 'border-l dark:border-gray-600' : ''}
                                    ${viewMode === mode
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                            {mode === 'grouped' ? '주문별 보기' : '전체 목록'}
                        </button>
                    ))}
                </div>

                {viewMode === 'flat' && (
                    <>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{selected.size}개 선택됨</span>
                        <button onClick={handleZipDownload}
                                disabled={!selected.size || downloading}
                                className="px-4 py-2 bg-purple-600 text-white text-sm rounded
                                    hover:bg-purple-700 disabled:opacity-40 transition">
                            {downloading ? '생성 중...' : `ZIP 다운로드 (${selected.size}개)`}
                        </button>
                    </>
                )}
            </div>

            {/* ── 주문별 보기 ── */}
            {viewMode === 'grouped' && (
                <div className="space-y-4">
                    {pdfGroups.map(group => {
                        const groupIds    = group.members.map(m => m.workbookId);
                        const allChecked  = groupIds.every(id => selected.has(id));
                        const someChecked = groupIds.some(id => selected.has(id));
                        const isGroupDl   = groupDownloading.has(group.bookUid);

                        return (
                            <div key={group.groupKey}
                                 className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
                                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700
                                    flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox"
                                               checked={allChecked}
                                               ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
                                               onChange={() => toggleGroup(group.members)}
                                               className="w-4 h-4 accent-purple-600" />
                                        <div>
                                            <span className="font-medium text-sm dark:text-gray-100">{group.title}</span>
                                            <span className="ml-2 text-xs text-gray-400">{group.members.length}명</span>
                                        </div>
                                        {group.orderUid ? (
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[group.orderStatus] || 'bg-gray-100'}`}>
                                                {STATUS_LABEL[group.orderStatus] || group.orderStatus}
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-400">미주문</span>
                                        )}
                                    </div>
                                    <button onClick={() => handleGroupDownload(group)}
                                            disabled={isGroupDl}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs
                                                bg-purple-50 text-purple-700 border border-purple-200
                                                rounded hover:bg-purple-100 disabled:opacity-40 transition">
                                        {isGroupDl ? '생성 중...' : `📦 ZIP (${group.members.length}개)`}
                                    </button>
                                </div>

                                <table className="w-full text-sm">
                                    <thead className="text-gray-400 text-xs border-b dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 py-2 w-10"></th>
                                        <th className="px-4 py-2 text-left">학생</th>
                                        <th className="px-4 py-2 text-left">레벨</th>
                                        <th className="px-4 py-2 text-left hidden sm:table-cell">생성일</th>
                                        <th className="px-4 py-2 text-right">다운로드</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y dark:divide-gray-700">
                                    {group.members.map(m => (
                                        <tr key={m.workbookId} className="hover:bg-purple-50 dark:hover:bg-purple-900/20">
                                            <td className="px-4 py-2 text-center">
                                                <input type="checkbox"
                                                       checked={selected.has(m.workbookId)}
                                                       onChange={() => toggleOne(m.workbookId)}
                                                       className="w-4 h-4 accent-purple-600" />
                                            </td>
                                            <td className="px-4 py-2 font-medium dark:text-gray-100">{m.student?.name}</td>
                                            <td className="px-4 py-2 text-gray-500 dark:text-gray-400 text-xs">{m.student?.level}</td>
                                            <td className="px-4 py-2 text-gray-400 text-xs hidden sm:table-cell">
                                                {m.createdAt ? new Date(m.createdAt).toLocaleDateString('ko-KR') : '-'}
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="flex gap-1 justify-end">
                                                    <button onClick={() => setPreview({ workbookId: m.workbookId, studentName: m.student?.name })}
                                                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
                                                        👁 미리보기
                                                    </button>
                                                    <button onClick={() => handleSingleDownload(m.workbookId, m.student?.name)}
                                                            className="text-xs px-2 py-1 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-600">
                                                        📄 PDF
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })}

                    {selected.size > 0 && (
                        <div className="flex items-center justify-between bg-purple-50 dark:bg-purple-900/20
                            border border-purple-200 dark:border-purple-700 rounded-lg px-4 py-3">
                            <span className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                                {selected.size}개 선택됨
                            </span>
                            <button onClick={handleZipDownload} disabled={downloading}
                                    className="px-4 py-2 bg-purple-600 text-white text-sm rounded
                                        hover:bg-purple-700 disabled:opacity-40 transition">
                                {downloading ? '생성 중...' : `ZIP 다운로드 (${selected.size}개)`}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── 전체 목록 ── */}
            {viewMode === 'flat' && (
                <>
                    <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-x-auto">
                        <table className="w-full text-sm min-w-[620px]">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase border-b dark:border-gray-700">
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
                                <th className="px-4 py-3 text-left">다운로드</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-gray-700">
                            {pagedFlat.map(o => (
                                <tr key={o.workbookId} className="hover:bg-purple-50 dark:hover:bg-purple-900/20">
                                    <td className="px-4 py-3 text-center">
                                        <input type="checkbox"
                                               checked={selected.has(o.workbookId)}
                                               onChange={() => toggleOne(o.workbookId)}
                                               className="w-4 h-4 accent-purple-600" />
                                    </td>
                                    <td className="px-4 py-3 font-medium dark:text-gray-100">{o.student?.name}</td>
                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{o.student?.level}</td>
                                    <td className="px-4 py-3">
                                        {o.orderUid
                                            ? <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[o.orderStatus] || 'bg-gray-100'}`}>
                                                {STATUS_LABEL[o.orderStatus] || o.orderStatus}
                                              </span>
                                            : <span className="text-xs text-gray-400">-</span>}
                                    </td>
                                    <td className="px-4 py-3 text-gray-400 text-xs">
                                        {o.createdAt ? new Date(o.createdAt).toLocaleDateString('ko-KR') : '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-1">
                                            <button onClick={() => setPreview({ workbookId: o.workbookId, studentName: o.student?.name })}
                                                    className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
                                                👁 미리보기
                                            </button>
                                            <button onClick={() => handleSingleDownload(o.workbookId, o.student?.name)}
                                                    className="text-xs px-2 py-1 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100">
                                                📄 PDF
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination page={page} totalPages={flatTotalPages} totalItems={pdfOrders.length}
                                pageSize={PDF_PAGE_SIZE} onChange={setPage} />
                </>
            )}
        </div>
    );
}

// ── 메인 ─────────────────────────────────────────────
export default function Orders() {
    const [tab,     setTab]     = useState(0);
    const [loading, setLoading] = useState(true);
    const [orders,  setOrders]  = useState([]);
    const [flat,    setFlat]    = useState([]);

    async function load() {
        setLoading(true);
        try {
            const r = await getOrders();
            setOrders(r.data.data);
            setFlat(r.data.flat || []);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold dark:text-gray-100">주문 목록</h1>
                <button onClick={load}
                        className="text-sm px-3 py-1.5 border dark:border-gray-600 rounded
                            hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">
                    🔄 새로고침
                </button>
            </div>

            <div className="flex gap-1 mb-6 border-b dark:border-gray-700">
                {TABS.map((t, i) => (
                    <button key={i} onClick={() => setTab(i)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition
                                ${tab === i
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                        {t}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
            ) : (
                <>
                    {tab === 0 && <AllOrdersTab orders={orders} flat={flat} onRefresh={load} />}
                    {tab === 1 && <PdfDownloadTab orders={flat} groupedOrders={orders} />}
                </>
            )}
        </div>
    );
}
