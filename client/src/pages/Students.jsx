import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudents } from '../api';

const LEVEL_COLOR = {
    BEGINNER:     'bg-gray-100 text-gray-600',
    INTERMEDIATE: 'bg-blue-100 text-blue-700',
    ADVANCED:     'bg-purple-100 text-purple-700',
    EXPERT:       'bg-green-100 text-green-700',
};

export default function Students() {
    const [students, setStudents] = useState([]);
    const [search,   setSearch]   = useState('');
    const [level,    setLevel]    = useState('');
    const [loading,  setLoading]  = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        setLoading(true);
        getStudents({ search, level })
            .then(r => setStudents(r.data.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [search, level]);

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">👥 학생 목록</h1>

            {/* 필터 */}
            <div className="flex gap-3 mb-4">
                <input
                    type="text"
                    placeholder="이름 검색"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="border rounded px-3 py-2 text-sm w-48"
                />
                <select
                    value={level}
                    onChange={e => setLevel(e.target.value)}
                    className="border rounded px-3 py-2 text-sm"
                >
                    <option value="">전체 레벨</option>
                    <option value="BEGINNER">BEGINNER</option>
                    <option value="INTERMEDIATE">INTERMEDIATE</option>
                    <option value="ADVANCED">ADVANCED</option>
                    <option value="EXPERT">EXPERT</option>
                </select>
            </div>

            {loading ? (
                <p className="text-gray-400 text-sm">불러오는 중...</p>
            ) : (
                <div className="bg-white rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>
                            <th className="px-4 py-3 text-left">이름</th>
                            <th className="px-4 py-3 text-left">레벨</th>
                            <th className="px-4 py-3 text-right">총점</th>
                            <th className="px-4 py-3 text-right">LC</th>
                            <th className="px-4 py-3 text-right">RC</th>
                            <th className="px-4 py-3 text-left">취약 파트</th>
                            <th className="px-4 py-3 text-right">문제집 수</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y">
                        {students.map(s => (
                            <tr
                                key={s.id}
                                onClick={() => navigate(`/students/${s.id}`)}
                                className="hover:bg-blue-50 cursor-pointer transition"
                            >
                                <td className="px-4 py-3 font-medium">{s.name}</td>
                                <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${LEVEL_COLOR[s.level] || ''}`}>
                      {s.level}
                    </span>
                                </td>
                                <td className="px-4 py-3 text-right font-medium">{s.totalScore}</td>
                                <td className="px-4 py-3 text-right text-gray-500">{s.lcScore}</td>
                                <td className="px-4 py-3 text-right text-gray-500">{s.rcScore}</td>
                                <td className="px-4 py-3 text-gray-500">
                                    {s.weakParts.map(w => `P${w.part}(${Math.round(w.rate * 100)}%)`).join(' · ')}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-500">{s.workbookCount}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}