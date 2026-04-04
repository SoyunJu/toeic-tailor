import { useEffect, useState } from 'react';
import { getStudents } from '../api';
import { generateBatch } from '../api';

const CLASS_NAME_OPTIONS = [
    { value: '',           label: '전체 반' },
    { value: 'TARGET_600', label: '600목표반' },
    { value: 'TARGET_800', label: '800목표반' },
    { value: 'HIGH_SCORE', label: '고득점반' },
];
const LEVEL_OPTIONS = [
    { value: '',             label: '전체 레벨' },
    { value: 'BEGINNER',     label: 'BEGINNER' },
    { value: 'INTERMEDIATE', label: 'INTERMEDIATE' },
    { value: 'ADVANCED',     label: 'ADVANCED' },
    { value: 'EXPERT',       label: 'EXPERT' },
];

const STATUS_ICON = {
    idle:    '⬜',
    start:   '⏳',
    done:    '✅',
    error:   '❌',
};

export default function Generate() {
    const [students,  setStudents]  = useState([]);
    const [selected,  setSelected]  = useState(new Set());
    const [className, setClassName] = useState('');
    const [level,     setLevel]     = useState('');
    const [loading,   setLoading]   = useState(false);
    const [progress,  setProgress]  = useState({}); // { [studentId]: { status, message } }
    const [summary,   setSummary]   = useState(null);

    useEffect(() => {
        getStudents({ className, level })
            .then(r => {
                setStudents(r.data.data);
                setSelected(new Set());
            });
    }, [className, level]);

    function toggleAll() {
        if (selected.size === students.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(students.map(s => s.id)));
        }
    }

    function toggleOne(id) {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    async function handleGenerate() {
        if (!selected.size) return;
        setLoading(true);
        setSummary(null);

        // 초기 상태 설정
        const init = {};
        selected.forEach(id => { init[id] = { status: 'idle', name: students.find(s => s.id === id)?.name }; });
        setProgress(init);

        await generateBatch([...selected], (event) => {
            if (event.type === 'start') {
                setProgress(p => ({ ...p, [event.studentId]: { ...p[event.studentId], status: 'start' } }));
            } else if (event.type === 'done') {
                setProgress(p => ({ ...p, [event.studentId]: {
                        ...p[event.studentId],
                        status:     'done',
                        workbookId: event.workbookId,
                        bookUid:    event.bookUid,
                        summary:    event.summary,
                    }}));
            } else if (event.type === 'error') {
                setProgress(p => ({ ...p, [event.studentId]: {
                        ...p[event.studentId],
                        status:  'error',
                        message: event.message,
                    }}));
            } else if (event.type === 'complete') {
                setSummary(event);
                setLoading(false);
            }
        });
    }

    const allSelected = selected.size === students.length && students.length > 0;

    return (
        <div>
            <h1 className="text-2xl font-bold mb-2"> 기출 생성</h1>
            <p className="text-sm text-gray-500 mb-6">
                학생을 선택하면 AI가 개인 맞춤 문제집을 자동 생성합니다.
            </p>

            {/* 필터 */}
            <div className="flex flex-wrap gap-2 mb-4">
                <select value={className} onChange={e => setClassName(e.target.value)}
                        className="border rounded px-3 py-2 text-sm">
                    {CLASS_NAME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select value={level} onChange={e => setLevel(e.target.value)}
                        className="border rounded px-3 py-2 text-sm">
                    {LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <span className="px-3 py-2 text-sm text-gray-500">
          {selected.size}명 선택
        </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 학생 선택 */}
                <div className="bg-white rounded-xl border overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b flex items-center gap-2">
                        <input type="checkbox"
                               checked={allSelected}
                               onChange={toggleAll}
                               className="w-4 h-4 accent-blue-600" />
                        <span className="text-sm font-medium text-gray-700">
              전체 선택 ({students.length}명)
            </span>
                    </div>
                    <div className="divide-y max-h-[480px] overflow-y-auto">
                        {students.map(s => (
                            <label key={s.id}
                                   className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer">
                                <input type="checkbox"
                                       checked={selected.has(s.id)}
                                       onChange={() => toggleOne(s.id)}
                                       className="w-4 h-4 accent-blue-600" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{s.name}</p>
                                    <p className="text-xs text-gray-400">
                                        {s.classNameLabel} · {s.level} · {s.totalScore}점
                                    </p>
                                </div>
                                {progress[s.id] && (
                                    <span className="text-lg">{STATUS_ICON[progress[s.id].status]}</span>
                                )}
                            </label>
                        ))}
                    </div>
                </div>

                {/* 진행 상태 + 결과 */}
                <div className="space-y-4">
                    <button
                        onClick={handleGenerate}
                        disabled={!selected.size || loading}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold
              hover:bg-blue-700 disabled:opacity-40 transition text-sm">
                        {loading
                            ? `생성 중... (${Object.values(progress).filter(p => p.status === 'done').length}/${selected.size})`
                            : `선택한 ${selected.size}명 문제집 생성`}
                    </button>

                    {/* 요약 */}
                    {summary && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
                            <p className="font-semibold text-blue-700 mb-1">생성 완료</p>
                            <p>성공 {summary.succeeded}명 · 실패 {summary.failed}명 · 전체 {summary.total}명</p>
                        </div>
                    )}

                    {/* 개별 진행 상태 */}
                    {Object.entries(progress).length > 0 && (
                        <div className="bg-white rounded-xl border overflow-hidden">
                            <div className="px-4 py-3 bg-gray-50 border-b">
                                <p className="text-sm font-medium text-gray-700">진행 상태</p>
                            </div>
                            <div className="divide-y max-h-[360px] overflow-y-auto">
                                {Object.entries(progress).map(([id, p]) => (
                                    <div key={id} className="px-4 py-3 flex items-start gap-3">
                                        <span className="text-lg mt-0.5">{STATUS_ICON[p.status]}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium">{p.name}</p>
                                            {p.status === 'start' && (
                                                <p className="text-xs text-blue-500 animate-pulse">AI 분석 중...</p>
                                            )}
                                            {p.status === 'done' && (
                                                <p className="text-xs text-gray-500 truncate">{p.summary}</p>
                                            )}
                                            {p.status === 'error' && (
                                                <p className="text-xs text-red-500">{p.message}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}