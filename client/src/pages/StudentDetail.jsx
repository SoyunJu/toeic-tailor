import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { deleteScoreRecord, getStudent, regenerateWorkbook } from '../api';
import { useToast } from '../context/ToastContext';
import { SkeletonCard, SkeletonText } from '../components/Skeleton';
import PdfPreviewModal from '../components/PdfPreviewModal';
import { EditModal } from './Students';
import { LEVEL_COLOR, STATUS_LABEL, STATUS_COLOR } from '../constants';

const PART_MAX = { 1: 6, 2: 25, 3: 39, 4: 30, 5: 30, 6: 16, 7: 54 };

// 취약 파트 진행 바
function WeakPartBar({ part, rate }) {
    const pct = Math.round(rate * 100);
    const color = pct < 50 ? 'bg-red-500' : pct < 70 ? 'bg-yellow-500' : 'bg-green-500';
    return (
        <div className="flex items-center gap-2 text-xs">
            <span className="w-10 text-gray-500 dark:text-gray-400 shrink-0">Part {part}</span>
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-10 text-right text-gray-600 dark:text-gray-300">{pct}%</span>
        </div>
    );
}

// 점수 이력 행
function ScoreRow({ score, studentId, onDeleted }) {
    const [confirming, setConfirming] = useState(false);
    const [deleting,   setDeleting]   = useState(false);
    const { addToast } = useToast();

    async function handleDelete() {
        setDeleting(true);
        try {
            await deleteScoreRecord(studentId, score.id);
            addToast('success', '점수 기록이 삭제되었습니다.');
            onDeleted();
        } catch (e) {
            addToast('error', e.response?.data?.message || e.message);
        } finally {
            setDeleting(false);
            setConfirming(false);
        }
    }

    return (
        <tr className="border-b dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/30">
            <td className="px-4 py-2 text-gray-600 dark:text-gray-400 text-xs">
                {new Date(score.takenAt).toLocaleDateString('ko-KR')}
            </td>
            <td className="px-4 py-2 font-semibold dark:text-gray-100">{score.totalScore}</td>
            <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{score.lcScore}</td>
            <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{score.rcScore}</td>
            {[1,2,3,4,5,6,7].map(p => (
                <td key={p} className="px-2 py-2 text-center text-xs text-gray-500 dark:text-gray-500 hidden lg:table-cell">
                    {score[`part${p}Correct`] ?? '-'}
                </td>
            ))}
            <td className="px-4 py-2 text-xs text-gray-400">{score.source || '-'}</td>
            <td className="px-4 py-2 text-right">
                {confirming ? (
                    <div className="flex gap-1 justify-end">
                        <button onClick={handleDelete} disabled={deleting}
                                className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-40">
                            {deleting ? '...' : '확인'}
                        </button>
                        <button onClick={() => setConfirming(false)}
                                className="px-2 py-1 text-xs border dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                            취소
                        </button>
                    </div>
                ) : (
                    <button onClick={() => setConfirming(true)}
                            className="px-2 py-1 text-xs border border-red-200 text-red-500 rounded hover:bg-red-50">
                        🗑 삭제
                    </button>
                )}
            </td>
        </tr>
    );
}

// 워크북 행
function WorkbookRow({ wb, studentName, onRegenerated }) {
    const [regen,    setRegen]    = useState(false);
    const [preview,  setPreview]  = useState(false);
    const { addToast } = useToast();

    async function handleRegenerate() {
        if (!confirm('문제집을 재생성하시겠습니까? 기존 문제집은 삭제됩니다.')) return;
        setRegen(true);
        try {
            await regenerateWorkbook(wb.id);
            addToast('success', '문제집이 재생성되었습니다.');
            onRegenerated();
        } catch (e) {
            addToast('error', e.response?.data?.message || e.message);
        } finally {
            setRegen(false);
        }
    }

    return (
        <>
            {preview && (
                <PdfPreviewModal
                    workbookId={wb.id}
                    studentName={studentName}
                    onClose={() => setPreview(false)}
                />
            )}
            <tr className="border-b dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400 text-xs">
                    {new Date(wb.createdAt).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-4 py-2 text-center text-gray-600 dark:text-gray-300">
                    {wb._count?.questions ?? '-'}문항
                </td>
                <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium
                        ${wb.bookStatus === 'FINALIZED'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                        {wb.bookStatus || 'DRAFT'}
                    </span>
                </td>
                <td className="px-4 py-2">
                    {wb.orderStatus ? (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[wb.orderStatus] || 'bg-gray-100'}`}>
                            {STATUS_LABEL[wb.orderStatus] || wb.orderStatus}
                        </span>
                    ) : (
                        <span className="text-xs text-gray-400">미주문</span>
                    )}
                </td>
                <td className="px-4 py-2 text-xs text-gray-400 font-mono hidden sm:table-cell">
                    {wb.bookUid ? wb.bookUid.slice(0, 12) + '…' : '-'}
                </td>
                <td className="px-4 py-2">
                    <div className="flex gap-1 justify-end">
                        <button
                            onClick={() => setPreview(true)}
                            className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition">
                            📄 미리보기
                        </button>
                        <button
                            onClick={handleRegenerate}
                            disabled={regen}
                            className="px-2 py-1 text-xs border dark:border-gray-600 rounded
                                hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 disabled:opacity-40">
                            {regen ? '...' : '🔄 재생성'}
                        </button>
                    </div>
                </td>
            </tr>
        </>
    );
}

export default function StudentDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const r = await getStudent(id);
            setStudent(r.data.data);
        } catch (e) {
            addToast('error', '학생 정보를 불러올 수 없습니다.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, [id]);

    if (loading) {
        return (
            <div className="space-y-6">
                <SkeletonText width="40%" height="h-8" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
                <SkeletonCard />
            </div>
        );
    }

    if (!student) {
        return (
            <div className="text-center py-16 text-gray-400">
                <p>학생 정보를 찾을 수 없습니다.</p>
                <button onClick={() => navigate('/students')}
                        className="mt-4 text-sm text-blue-600 hover:underline">← 목록으로</button>
            </div>
        );
    }

    const latest   = student.scores[0] ?? null;
    const weakParts = student.weakParts ?? [];

    return (
        <div className="space-y-6">
            {editing && (
                <EditModal
                    student={student}
                    onClose={() => setEditing(false)}
                    onSave={() => { setEditing(false); load(); }}
                />
            )}

            {/* 헤더 */}
            <div className="flex items-center gap-4 flex-wrap">
                <button
                    onClick={() => navigate('/students')}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1">
                    ← 수강생 목록
                </button>
                <h1 className="text-2xl font-bold dark:text-gray-100 flex-1">{student.name}</h1>
                <button
                    onClick={() => setEditing(true)}
                    className="px-3 py-1.5 text-sm border dark:border-gray-600 rounded
                        hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">
                    ✏️ 편집
                </button>
            </div>

            {/* 기본 정보 + 점수 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 기본 정보 */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5 space-y-3">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">기본 정보</h2>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">반</span>
                            <span className="dark:text-gray-200">
                                {[student.classNameLabel, student.classTypeLabel].filter(Boolean).join(' / ') || '-'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 dark:text-gray-400">레벨</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${LEVEL_COLOR[student.level] || 'bg-gray-100 text-gray-600'}`}>
                                {student.level || '-'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">수강 기간</span>
                            <span className="dark:text-gray-200 text-xs">
                                {student.enrolledAt
                                    ? `${new Date(student.enrolledAt).toLocaleDateString('ko-KR')} ~ ${student.expiresAt ? new Date(student.expiresAt).toLocaleDateString('ko-KR') : '?'}`
                                    : '-'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">생성된 문제집</span>
                            <span className="font-medium dark:text-gray-200">{student.workbooks.length}개</span>
                        </div>
                    </div>
                </div>

                {/* 최근 점수 + 취약 파트 */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5 space-y-3">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">최근 점수</h2>
                    {latest ? (
                        <>
                            <div className="flex gap-4 text-sm">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{latest.totalScore}</p>
                                    <p className="text-xs text-gray-400">총점</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-semibold dark:text-gray-100">{latest.lcScore}</p>
                                    <p className="text-xs text-gray-400">LC</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-semibold dark:text-gray-100">{latest.rcScore}</p>
                                    <p className="text-xs text-gray-400">RC</p>
                                </div>
                            </div>
                            {weakParts.length > 0 && (
                                <div className="space-y-1.5 pt-2">
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">파트별 정답률</p>
                                    {weakParts.map(({ part, rate }) => (
                                        <WeakPartBar key={part} part={part} rate={rate} />
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-gray-400">점수 기록이 없습니다.</p>
                    )}
                </div>
            </div>

            {/* 점수 이력 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        점수 이력 ({student.scores.length}건)
                    </h2>
                </div>
                {student.scores.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-gray-400 text-center">점수 기록이 없습니다.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[640px]">
                            <thead className="bg-gray-50 dark:bg-gray-700/30 text-gray-500 dark:text-gray-400 text-xs border-b dark:border-gray-700">
                            <tr>
                                <th className="px-4 py-2 text-left">응시일</th>
                                <th className="px-4 py-2 text-left">총점</th>
                                <th className="px-4 py-2 text-left">LC</th>
                                <th className="px-4 py-2 text-left">RC</th>
                                {[1,2,3,4,5,6,7].map(p => (
                                    <th key={p} className="px-2 py-2 text-center hidden lg:table-cell">P{p}</th>
                                ))}
                                <th className="px-4 py-2 text-left">출처</th>
                                <th className="px-4 py-2"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {student.scores.map(score => (
                                <ScoreRow
                                    key={score.id}
                                    score={score}
                                    studentId={student.id}
                                    onDeleted={load}
                                />
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* 생성된 문제집 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        생성된 문제집 ({student.workbooks.length}개)
                    </h2>
                </div>
                {student.workbooks.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-gray-400 text-center">
                        생성된 문제집이 없습니다.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[560px]">
                            <thead className="bg-gray-50 dark:bg-gray-700/30 text-gray-500 dark:text-gray-400 text-xs border-b dark:border-gray-700">
                            <tr>
                                <th className="px-4 py-2 text-left">생성일</th>
                                <th className="px-4 py-2 text-center">문제수</th>
                                <th className="px-4 py-2 text-left">책 상태</th>
                                <th className="px-4 py-2 text-left">주문 상태</th>
                                <th className="px-4 py-2 text-left hidden sm:table-cell">Book UID</th>
                                <th className="px-4 py-2 text-right">액션</th>
                            </tr>
                            </thead>
                            <tbody>
                            {student.workbooks.map(wb => (
                                <WorkbookRow
                                    key={wb.id}
                                    wb={wb}
                                    studentName={student.name}
                                    onRegenerated={load}
                                />
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
