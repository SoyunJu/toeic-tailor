import { useEffect, useState } from 'react';
import { useParams }           from 'react-router-dom';
import { getStudent, generateWorkbook, createOrder } from '../api';

const SHIPPING_DEFAULT = {
    recipientName:  '',
    recipientPhone: '',
    postalCode:     '',
    address1:       '',
    address2:       '',
};

export default function Student() {
    const { id } = useParams();
    const [student,  setStudent]  = useState(null);
    const [loading,  setLoading]  = useState(true);
    const [genLoading, setGenLoading] = useState(false);
    const [genResult,  setGenResult]  = useState(null);
    const [shipping,   setShipping]   = useState(SHIPPING_DEFAULT);
    const [orderLoading, setOrderLoading] = useState(false);
    const [orderResult,  setOrderResult]  = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        getStudent(id)
            .then(r => setStudent(r.data.data))
            .finally(() => setLoading(false));
    }, [id]);

    async function handleGenerate() {
        setGenLoading(true); setError(null); setGenResult(null); setOrderResult(null);
        try {
            const res = await generateWorkbook(parseInt(id));
            setGenResult(res.data.data);
        } catch (e) {
            setError(e.response?.data?.message || e.message);
        } finally {
            setGenLoading(false);
        }
    }

    async function handleOrder() {
        if (!genResult?.workbookId) return;
        setOrderLoading(true); setError(null);
        try {
            const res = await createOrder({
                workbookId: genResult.workbookId,
                quantity: 1,
                shipping,
            });
            setOrderResult(res.data.data);
        } catch (e) {
            setError(e.response?.data?.message || e.message);
        } finally {
            setOrderLoading(false);
        }
    }

    if (loading) return <p className="text-gray-400 text-sm mt-10">불러오는 중...</p>;
    if (!student) return <p className="text-red-500 mt-10">학생을 찾을 수 없습니다.</p>;

    return (
        <div className="space-y-6">
            {/* 학생 정보 */}
            <div className="bg-white rounded-xl border p-6">
                <h1 className="text-2xl font-bold mb-1">{student.name}</h1>
                <p className="text-gray-500 text-sm mb-4">
                    {student.level} · 총점 {student.totalScore} (LC {student.lcScore} / RC {student.rcScore})
                </p>
                <div className="text-sm text-gray-600">
                    <span className="font-medium">취약 파트: </span>
                    {student.weakParts.map(w =>
                        `Part ${w.part} (${Math.round(w.rate * 100)}%)`
                    ).join(' · ')}
                </div>
            </div>

            {/* 문제집 생성 */}
            <div className="bg-white rounded-xl border p-6 space-y-4">
                <h2 className="text-lg font-semibold">📝 문제집 생성</h2>
                <button
                    onClick={handleGenerate}
                    disabled={genLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded font-medium
                     hover:bg-blue-700 disabled:opacity-40 transition"
                >
                    {genLoading ? 'AI 분석 중...' : '맞춤 문제집 생성'}
                </button>

                {genResult && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm space-y-1">
                        <p className="font-medium text-blue-700">✅ 문제집 생성 완료</p>
                        <p>문제집 ID: {genResult.workbookId} · bookUid: {genResult.bookUid}</p>
                        <p>총 문제수: {genResult.totalQuestions}문항</p>
                        <p>취약파트: {genResult.weakPartNums?.map(p => `Part ${p}`).join(', ')}</p>
                        <p className="text-gray-600 mt-2">{genResult.analysis?.summary}</p>
                        <p className="text-gray-600">{genResult.analysis?.weakAnalysis}</p>
                        <p className="text-gray-600">{genResult.analysis?.recommendation}</p>
                    </div>
                )}
            </div>

            {/* 주문 */}
            {genResult && (
                <div className="bg-white rounded-xl border p-6 space-y-4">
                    <h2 className="text-lg font-semibold">🚚 실물 주문</h2>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        {[
                            { key: 'recipientName',  label: '수령인' },
                            { key: 'recipientPhone', label: '전화번호' },
                            { key: 'postalCode',     label: '우편번호' },
                            { key: 'address1',       label: '주소' },
                            { key: 'address2',       label: '상세주소' },
                        ].map(({ key, label }) => (
                            <div key={key} className={key === 'address1' ? 'col-span-2' : ''}>
                                <label className="block text-gray-600 mb-1">{label}</label>
                                <input
                                    type="text"
                                    value={shipping[key]}
                                    onChange={e => setShipping(p => ({ ...p, [key]: e.target.value }))}
                                    className="border rounded px-3 py-2 w-full"
                                />
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={handleOrder}
                        disabled={orderLoading}
                        className="px-6 py-2 bg-green-600 text-white rounded font-medium
                       hover:bg-green-700 disabled:opacity-40 transition"
                    >
                        {orderLoading ? '주문 중...' : '주문하기'}
                    </button>

                    {orderResult && (
                        <div className="bg-green-50 border border-green-200 rounded p-4 text-sm">
                            <p className="font-medium text-green-700">✅ 주문 완료</p>
                            <p>orderUid: {orderResult.orderUid}</p>
                            <p>상태: {orderResult.orderStatus}</p>
                            <p>결제금액: {orderResult.totalAmount?.toLocaleString()}원</p>
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-700">
                    ❌ {error}
                </div>
            )}
        </div>
    );
}