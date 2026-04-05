import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../api';
import { useToast } from '../context/ToastContext';
import { SkeletonText } from '../components/Skeleton';

export default function Settings() {
    const [form,    setForm]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving,  setSaving]  = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        getSettings()
            .then(r => setForm(r.data.data))
            .catch(e => addToast('error', '설정 로드 실패: ' + e.message))
            .finally(() => setLoading(false));
    }, []);

    async function handleSave() {
        setSaving(true);
        try {
            const res = await updateSettings(form);
            setForm(res.data.data);
            addToast('success', '설정이 저장되었습니다.');
        } catch (e) {
            addToast('error', e.response?.data?.message || e.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="max-w-lg mx-auto space-y-4">
                <SkeletonText width="30%" height="h-7" />
                <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <SkeletonText key={i} width={`${50 + i * 10}%`} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto">
            <h1 className="text-2xl font-bold mb-6 dark:text-gray-100"> 설정</h1>

            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 space-y-5">
                {/* 기출 설정 */}
                <div>
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 pb-2 border-b dark:border-gray-700">
                         기출 설정
                    </h2>
                    <div className="space-y-4">
                        {[
                            { key: 'WORKBOOK_DEFAULT_QUESTIONS', label: '기본 문제 수',           desc: '각 기출별 기본 문제 수 (다수 학생)',        min: 5,  max: 50  },
                            { key: 'WORKBOOK_MAX_QUESTIONS',     label: '최대 문제 수 (단일 학생)', desc: '학생 1명 단독 생성 시 최대 문제 수',         min: 5,  max: 50  },
                            { key: 'WORKBOOK_MIN_PAGES',         label: '최소 페이지 수',           desc: 'SweetBook 인쇄 최소 페이지 (수정 비권장)', min: 24, max: 100 },
                            { key: 'WORKBOOK_QUESTIONS_PER_PAGE',label: '페이지당 문제 수',         desc: '한 페이지에 묶어서 표시할 문제 수',         min: 1,  max: 10  },
                        ].map(({ key, label, desc, min, max }) => (
                            <div key={key}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-0.5">{label}</label>
                                <p className="text-xs text-gray-400 mb-1">{desc}</p>
                                <input
                                    type="number" min={min} max={max}
                                    value={form[key]}
                                    onChange={e => setForm(p => ({ ...p, [key]: parseInt(e.target.value) }))}
                                    className="border dark:border-gray-600 rounded px-3 py-2 w-32 text-sm
                                        dark:bg-gray-700 dark:text-gray-100"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* AI 설정 */}
                <div>
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 pb-2 border-b dark:border-gray-700">
                        AI 설정
                    </h2>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">AI Provider</label>
                        <select
                            value={form.AI_PROVIDER}
                            onChange={e => setForm(p => ({ ...p, AI_PROVIDER: e.target.value }))}
                            className="border dark:border-gray-600 rounded px-3 py-2 text-sm w-40
                                dark:bg-gray-700 dark:text-gray-100">
                            <option value="mock">mock (테스트용)</option>
                            <option value="openai">openai (GPT-4o-mini)</option>
                        </select>
                    </div>
                </div>

                <button onClick={handleSave} disabled={saving}
                        className="w-full py-2 bg-blue-600 text-white rounded font-medium
                            hover:bg-blue-700 disabled:opacity-40 transition">
                    {saving ? '저장 중...' : '설정 저장'}
                </button>
            </div>
        </div>
    );
}
