import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../api';

export default function Settings() {
    const [form,    setForm]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving,  setSaving]  = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        getSettings()
            .then(r => setForm(r.data.data))
            .finally(() => setLoading(false));
    }, []);

    async function handleSave() {
        setSaving(true); setMessage(null);
        try {
            const res = await updateSettings(form);
            setForm(res.data.data);
            setMessage({ type: 'success', text: '설정이 저장되었습니다.' });
        } catch (e) {
            setMessage({ type: 'error', text: e.response?.data?.message || e.message });
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <p className="text-gray-400 text-sm mt-10">불러오는 중...</p>;

    return (
        <div className="max-w-lg mx-auto">
            <h1 className="text-2xl font-bold mb-6"> 설정</h1>

            <div className="bg-white rounded-xl border p-6 space-y-5">
                {/* 기출 설정 */}
                <div>
                    <h2 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">
                         기출 설정
                    </h2>
                    <div className="space-y-4">
                        {[
                            {
                                key:   'WORKBOOK_DEFAULT_QUESTIONS',
                                label: '기본 문제 수',
                                desc:  '각 기출별 기본 문제 수 (다수 학생)',
                                min:   5, max: 50,
                            },
                            {
                                key:   'WORKBOOK_MAX_QUESTIONS',
                                label: '최대 문제 수 (단일 학생)',
                                desc:  '학생 1명 단독 생성 시 최대 문제 수',
                                min:   5, max: 50,
                            },
                            {
                                key:   'WORKBOOK_MIN_PAGES',
                                label: '최소 페이지 수',
                                desc:  'SweetBook 인쇄 최소 페이지 (수정x)',
                                min:   24, max: 100,
                            },
                            {
                                key:   'WORKBOOK_QUESTIONS_PER_PAGE',
                                label: '페이지당 문제 수',
                                desc:  '한 페이지에 묶어서 표시할 문제 수',
                                min:   1, max: 10,
                            },
                        ].map(({ key, label, desc, min, max }) => (
                            <div key={key}>
                                <label className="block text-sm font-medium text-gray-700 mb-0.5">{label}</label>
                                <p className="text-xs text-gray-400 mb-1">{desc}</p>
                                <input
                                    type="number" min={min} max={max}
                                    value={form[key]}
                                    onChange={e => setForm(p => ({ ...p, [key]: parseInt(e.target.value) }))}
                                    className="border rounded px-3 py-2 w-32 text-sm"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* AI 설정 */}
                <div>
                    <h2 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">
                        AI 설정
                    </h2>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">AI Provider</label>
                        <select
                            value={form.AI_PROVIDER}
                            onChange={e => setForm(p => ({ ...p, AI_PROVIDER: e.target.value }))}
                            className="border rounded px-3 py-2 text-sm w-40"
                        >
                            <option value="mock">mock (테스트용)</option>
                            <option value="openai">openai (GPT-4o-mini)</option>
                        </select>
                        <p className="text-xs text-gray-400 mt-1">
                            * 서버 재시작 전까지만 유지. 영구 변경은 .env 수정 필요.
                        </p>
                    </div>
                </div>

                <button onClick={handleSave} disabled={saving}
                        className="w-full py-2 bg-blue-600 text-white rounded font-medium
            hover:bg-blue-700 disabled:opacity-40 transition">
                    {saving ? '저장 중...' : '설정 저장'}
                </button>

                {message && (
                    <div className={`rounded p-3 text-sm ${
                        message.type === 'success'
                            ? 'bg-green-50 border border-green-200 text-green-700'
                            : 'bg-red-50 border border-red-200 text-red-700'
                    }`}>
                        {message.text}
                    </div>
                )}
            </div>
        </div>
    );
}