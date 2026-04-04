import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudents, deleteStudent, updateStudent } from '../api';

const LEVEL_COLOR = {
    BEGINNER:     'bg-gray-100 text-gray-600',
    INTERMEDIATE: 'bg-blue-100 text-blue-700',
    ADVANCED:     'bg-purple-100 text-purple-700',
    EXPERT:       'bg-green-100 text-green-700',
};

const CLASS_NAME_OPTIONS = [
    { value: '',           label: '전체 반' },
    { value: 'TARGET_600', label: '600목표반' },
    { value: 'TARGET_800', label: '800목표반' },
    { value: 'HIGH_SCORE', label: '고득점반' },
];
const CLASS_TYPE_OPTIONS = [
    { value: '',        label: '전체' },
    { value: 'WEEKDAY', label: '평일반' },
    { value: 'WEEKEND', label: '주말반' },
];

// 편집 모달
function EditModal({ student, onClose, onSave }) {
    const [form, setForm] = useState({
        name:      student.name,
        className: student.className  || '',
        classType: student.classType  || '',
        enrolledAt: student.enrolledAt ? student.enrolledAt.slice(0, 10) : '',
        expiresAt:  student.expiresAt  ? student.expiresAt.slice(0, 10)  : '',
    });

    async function handleSave() {
        await updateStudent(student.id, form);
        onSave();
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
                <h2 className="text-lg font-bold">학생 정보 편집</h2>

                {[
                    { key: 'name', label: '이름', type: 'text' },
                    { key: 'enrolledAt', label: '수강등록일', type: 'date' },
                    { key: 'expiresAt',  label: '수강만료일', type: 'date' },
                ].map(({ key, label, type }) => (
                    <div key={key}>
                        <label className="block text-sm text-gray-600 mb-1">{label}</label>
                        <input
                            type={type}
                            value={form[key]}
                            onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                            className="border rounded px-3 py-2 w-full text-sm"
                        />
                    </div>
                ))}

                <div>
                    <label className="block text-sm text-gray-600 mb-1">반</label>
                    <select
                        value={form.className}
                        onChange={e => setForm(p => ({ ...p, className: e.target.value }))}
                        className="border rounded px-3 py-2 w-full text-sm"
                    >
                        {CLASS_NAME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm text-gray-600 mb-1">수업 유형</label>
                    <select
                        value={form.classType}
                        onChange={e => setForm(p => ({ ...p, classType: e.target.value }))}
                        className="border rounded px-3 py-2 w-full text-sm"
                    >
                        {CLASS_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>

                <div className="flex gap-2 pt-2">
                    <button onClick={handleSave}
                            className="flex-1 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700">
                        저장
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

export default function Students() {
    const [students,  setStudents]  = useState([]);
    const [search,    setSearch]    = useState('');
    const [level,     setLevel]     = useState('');
    const [className, setClassName] = useState('');
    const [classType, setClassType] = useState('');
    const [loading,   setLoading]   = useState(true);
    const [editTarget, setEditTarget] = useState(null);
    const navigate = useNavigate();

    async function load() {
        setLoading(true);
        try {
            const r = await getStudents({ search, level, className, classType });
            setStudents(r.data.data);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, [search, level, className, classType]);

    async function handleDelete(e, id) {
        e.stopPropagation();
        if (!confirm('삭제하시겠습니까?')) return;
        await deleteStudent(id);
        load();
    }

    return (
        <div>
            {editTarget && (
                <EditModal
                    student={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSave={() => { setEditTarget(null); load(); }}
                />
            )}

            <h1 className="text-2xl font-bold mb-4"> 수강생 목록</h1>

            {/* 필터 */}
            <div className="flex flex-wrap gap-2 mb-4">
                <input
                    type="text" placeholder="이름 검색"
                    value={search} onChange={e => setSearch(e.target.value)}
                    className="border rounded px-3 py-2 text-sm w-36"
                />
                <select value={level} onChange={e => setLevel(e.target.value)}
                        className="border rounded px-3 py-2 text-sm">
                    <option value="">전체 레벨</option>
                    {['BEGINNER','INTERMEDIATE','ADVANCED','EXPERT'].map(l =>
                        <option key={l} value={l}>{l}</option>)}
                </select>
                <select value={className} onChange={e => setClassName(e.target.value)}
                        className="border rounded px-3 py-2 text-sm">
                    {CLASS_NAME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select value={classType} onChange={e => setClassType(e.target.value)}
                        className="border rounded px-3 py-2 text-sm">
                    {CLASS_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>

            {loading ? (
                <p className="text-gray-400 text-sm">불러오는 중...</p>
            ) : (
                <div className="bg-white rounded-xl border overflow-x-auto">
                    <table className="w-full text-sm min-w-[700px]">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>
                            <th className="px-4 py-3 text-left">이름</th>
                            <th className="px-4 py-3 text-left">반</th>
                            <th className="px-4 py-3 text-left">레벨</th>
                            <th className="px-4 py-3 text-right">총점</th>
                            <th className="px-4 py-3 text-right">LC/RC</th>
                            <th className="px-4 py-3 text-left">취약파트</th>
                            <th className="px-4 py-3 text-left">수강만료</th>
                            <th className="px-4 py-3 text-right">문제집</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                        </thead>
                        <tbody className="divide-y">
                        {students.map(s => (
                            <tr key={s.id}
                                onClick={() => navigate(`/students/${s.id}`)}
                                className="hover:bg-blue-50 cursor-pointer transition">
                                <td className="px-4 py-3 font-medium">{s.name}</td>
                                <td className="px-4 py-3 text-gray-500 text-xs">
                                    {s.classNameLabel && <span className="block">{s.classNameLabel}</span>}
                                    {s.classTypeLabel && <span className="text-gray-400">{s.classTypeLabel}</span>}
                                </td>
                                <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${LEVEL_COLOR[s.level] || ''}`}>
                      {s.level}
                    </span>
                                </td>
                                <td className="px-4 py-3 text-right font-medium">{s.totalScore}</td>
                                <td className="px-4 py-3 text-right text-gray-500">{s.lcScore}/{s.rcScore}</td>
                                <td className="px-4 py-3 text-gray-500 text-xs">
                                    {s.weakParts.map(w => `P${w.part}(${Math.round(w.rate * 100)}%)`).join(' · ')}
                                </td>
                                <td className="px-4 py-3 text-gray-400 text-xs">
                                    {s.expiresAt ? new Date(s.expiresAt).toLocaleDateString('ko-KR') : '-'}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-500">{s.workbookCount}</td>
                                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                    <div className="flex gap-1 justify-end">
                                        <button
                                            onClick={() => setEditTarget(s)}
                                            className="px-2 py-1 text-xs border rounded hover:bg-gray-50">
                                            편집
                                        </button>
                                        <button
                                            onClick={e => handleDelete(e, s.id)}
                                            className="px-2 py-1 text-xs border border-red-200 text-red-500 rounded hover:bg-red-50">
                                            삭제
                                        </button>
                                    </div>
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