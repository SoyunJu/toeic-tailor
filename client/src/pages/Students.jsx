import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {deleteStudent, getStudents, updateStudent} from '../api';
import Pagination from '../components/Pagination';
import { SkeletonRow } from '../components/Skeleton';
import { CLASS_NAME_OPTIONS, CLASS_TYPE_OPTIONS, LEVEL_COLOR } from '../constants';

const PAGE_SIZE = 20;

// 편집 모달 (StudentDetail에서도 재사용 가능하도록 export)
export function EditModal({ student, onClose, onSave }) {
    const [form, setForm] = useState({
        name:      student.name,
        className: student.className  || '',
        classType: student.classType  || '',
        enrolledAt: student.enrolledAt ? student.enrolledAt.slice(0, 10) : '',
        expiresAt:  student.expiresAt  ? student.expiresAt.slice(0, 10)  : '',
    });
    const [saving, setSaving] = useState(false);

    async function handleSave() {
        setSaving(true);
        try {
            await updateStudent(student.id, form);
            onSave();
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6 space-y-4">
                <h2 className="text-lg font-bold dark:text-gray-100">학생 정보 편집</h2>

                {[
                    { key: 'name', label: '이름', type: 'text' },
                    { key: 'enrolledAt', label: '수강등록일', type: 'date' },
                    { key: 'expiresAt',  label: '수강만료일', type: 'date' },
                ].map(({ key, label, type }) => (
                    <div key={key}>
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</label>
                        <input
                            type={type}
                            value={form[key]}
                            onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                            className="border dark:border-gray-600 rounded px-3 py-2 w-full text-sm
                                dark:bg-gray-700 dark:text-gray-100"
                        />
                    </div>
                ))}

                <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">반</label>
                    <select
                        value={form.className}
                        onChange={e => setForm(p => ({ ...p, className: e.target.value }))}
                        className="border dark:border-gray-600 rounded px-3 py-2 w-full text-sm
                            dark:bg-gray-700 dark:text-gray-100">
                        {CLASS_NAME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">수업 유형</label>
                    <select
                        value={form.classType}
                        onChange={e => setForm(p => ({ ...p, classType: e.target.value }))}
                        className="border dark:border-gray-600 rounded px-3 py-2 w-full text-sm
                            dark:bg-gray-700 dark:text-gray-100">
                        {CLASS_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>

                <div className="flex gap-2 pt-2">
                    <button onClick={handleSave} disabled={saving}
                            className="flex-1 py-2 bg-blue-600 text-white rounded text-sm font-medium
                                hover:bg-blue-700 disabled:opacity-40">
                        {saving ? '저장 중...' : '저장'}
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

export default function Students() {
    const [students,  setStudents]  = useState([]);
    const [search,    setSearch]    = useState('');
    const [level,     setLevel]     = useState('');
    const [className, setClassName] = useState('');
    const [classType, setClassType] = useState('');
    const [loading,   setLoading]   = useState(true);
    const [editTarget, setEditTarget] = useState(null);
    const [page, setPage] = useState(1);
    const navigate = useNavigate();

    async function load() {
        setLoading(true);
        try {
            const r = await getStudents({ search, level, className, classType });
            setStudents(r.data.data);
            setPage(1);
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

    const totalPages    = Math.max(1, Math.ceil(students.length / PAGE_SIZE));
    const pagedStudents = students.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div>
            {editTarget && (
                <EditModal
                    student={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSave={() => { setEditTarget(null); load(); }}
                />
            )}

            <h1 className="text-2xl font-bold mb-4 dark:text-gray-100"> 수강생 목록</h1>

            {/* 필터 */}
            <div className="flex flex-wrap gap-2 mb-4">
                <input
                    type="text" placeholder="이름 검색"
                    value={search} onChange={e => setSearch(e.target.value)}
                    className="border dark:border-gray-600 rounded px-3 py-2 text-sm w-36
                        dark:bg-gray-800 dark:text-gray-100"
                />
                <select value={level} onChange={e => setLevel(e.target.value)}
                        className="border dark:border-gray-600 rounded px-3 py-2 text-sm
                            dark:bg-gray-800 dark:text-gray-100">
                    <option value="">전체 레벨</option>
                    {['BEGINNER','INTERMEDIATE','ADVANCED','EXPERT'].map(l =>
                        <option key={l} value={l}>{l}</option>)}
                </select>
                <select value={className} onChange={e => setClassName(e.target.value)}
                        className="border dark:border-gray-600 rounded px-3 py-2 text-sm
                            dark:bg-gray-800 dark:text-gray-100">
                    {CLASS_NAME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select value={classType} onChange={e => setClassType(e.target.value)}
                        className="border dark:border-gray-600 rounded px-3 py-2 text-sm
                            dark:bg-gray-800 dark:text-gray-100">
                    {CLASS_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
                    <tr>
                        <th className="px-4 py-3 text-left">이름</th>
                        <th className="px-4 py-3 text-left">반</th>
                        <th className="px-4 py-3 text-left">레벨</th>
                        <th className="px-4 py-3 text-right">총점</th>
                        <th className="px-4 py-3 text-right hidden sm:table-cell">LC/RC</th>
                        <th className="px-4 py-3 text-left hidden md:table-cell">취약파트</th>
                        <th className="px-4 py-3 text-left hidden lg:table-cell">수강만료</th>
                        <th className="px-4 py-3 text-right hidden sm:table-cell">문제집</th>
                        <th className="px-4 py-3"></th>
                    </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-700">
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={9} />)
                    ) : pagedStudents.length === 0 ? (
                        <tr>
                            <td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-sm">
                                수강생이 없습니다.
                            </td>
                        </tr>
                    ) : pagedStudents.map(s => (
                        <tr key={s.id}
                            onClick={() => navigate(`/students/${s.id}`)}
                            className="hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition">
                            <td className="px-4 py-3 font-medium dark:text-gray-100">{s.name}</td>
                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                                {s.classNameLabel && <span className="block">{s.classNameLabel}</span>}
                                {s.classTypeLabel && <span className="text-gray-400">{s.classTypeLabel}</span>}
                            </td>
                            <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${LEVEL_COLOR[s.level] || ''}`}>
                                    {s.level}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-right font-medium dark:text-gray-100">{s.totalScore}</td>
                            <td className="px-4 py-3 hidden sm:table-cell text-right text-gray-500 dark:text-gray-400">{s.lcScore}/{s.rcScore}</td>
                            <td className="px-4 py-3 hidden md:table-cell text-gray-500 dark:text-gray-400 text-xs">
                                {s.weakParts.map(w => `P${w.part}(${Math.round(w.rate * 100)}%)`).join(' · ')}
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell text-gray-400 text-xs">
                                {s.expiresAt ? new Date(s.expiresAt).toLocaleDateString('ko-KR') : '-'}
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell text-right text-gray-500 dark:text-gray-400">{s.workbookCount}</td>
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                <div className="flex gap-1 justify-end">
                                    <button
                                        onClick={() => setEditTarget(s)}
                                        className="px-2 py-1 text-xs border dark:border-gray-600 rounded
                                            hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">
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

            <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={students.length}
                pageSize={PAGE_SIZE}
                onChange={setPage}
            />
        </div>
    );
}
