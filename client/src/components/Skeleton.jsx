/**
 * 로딩 스켈레톤 컴포넌트 모음
 */

/** 테이블 행 스켈레톤 */
export function SkeletonRow({ cols = 5 }) {
    return (
        <tr className="border-b animate-pulse">
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"
                         style={{ width: `${60 + (i * 13) % 35}%` }} />
                </td>
            ))}
        </tr>
    );
}

/** 카드형 스켈레톤 */
export function SkeletonCard() {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden animate-pulse">
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700 flex items-center gap-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3" />
                <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded-full w-16 ml-2" />
            </div>
            <div className="px-4 py-3 space-y-2">
                {[70, 55, 80].map((w, i) => (
                    <div key={i} className="h-3 bg-gray-100 dark:bg-gray-700 rounded" style={{ width: `${w}%` }} />
                ))}
            </div>
        </div>
    );
}

/** 인라인 텍스트 스켈레톤 */
export function SkeletonText({ width = '60%', height = 'h-4' }) {
    return (
        <div className={`${height} bg-gray-200 dark:bg-gray-700 rounded animate-pulse`}
             style={{ width }} />
    );
}

/** 전체 페이지 로딩 스켈레톤 (테이블 전용) */
export function SkeletonTable({ rows = 5, cols = 5 }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
            <table className="w-full">
                <tbody>
                    {Array.from({ length: rows }).map((_, i) => (
                        <SkeletonRow key={i} cols={cols} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
