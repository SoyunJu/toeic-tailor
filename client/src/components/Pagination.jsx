/**
 * Reusable Pagination component
 *
 * Props:
 *   page       — current page (1-based)
 *   totalPages — total number of pages
 *   totalItems — total item count (for display)
 *   pageSize   — items per page (for display)
 *   onChange   — (newPage: number) => void
 */
export default function Pagination({ page, totalPages, totalItems, pageSize, onChange }) {
    if (totalPages <= 1) return null;

    // Build the window of up to 5 page buttons around current page
    const windowSize = 5;
    let start = Math.max(1, page - Math.floor(windowSize / 2));
    let end   = start + windowSize - 1;
    if (end > totalPages) {
        end   = totalPages;
        start = Math.max(1, end - windowSize + 1);
    }

    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);

    const btnBase     = 'w-8 h-8 rounded text-sm flex items-center justify-center transition';
    const btnActive   = btnBase + ' bg-blue-600 text-white font-semibold';
    const btnInactive = btnBase + ' border dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700';
    const btnDisabled = btnBase + ' text-gray-300 dark:text-gray-600 cursor-not-allowed';

    const from = Math.min((page - 1) * pageSize + 1, totalItems);
    const to   = Math.min(page * pageSize, totalItems);

    return (
        <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
            <span className="text-xs text-gray-400 dark:text-gray-500">
                {totalItems > 0 ? `${from}–${to} / 전체 ${totalItems}건` : '0건'}
            </span>
            <div className="flex items-center gap-1">
                {/* First */}
                <button
                    onClick={() => onChange(1)}
                    disabled={page === 1}
                    className={page === 1 ? btnDisabled : btnInactive}
                    title="첫 페이지"
                >
                    «
                </button>
                {/* Prev */}
                <button
                    onClick={() => onChange(page - 1)}
                    disabled={page === 1}
                    className={page === 1 ? btnDisabled : btnInactive}
                    title="이전 페이지"
                >
                    ‹
                </button>

                {/* Page numbers */}
                {start > 1 && (
                    <>
                        <button onClick={() => onChange(1)} className={btnInactive}>1</button>
                        {start > 2 && <span className="text-gray-400 text-xs px-1">…</span>}
                    </>
                )}
                {pages.map(p => (
                    <button
                        key={p}
                        onClick={() => onChange(p)}
                        className={p === page ? btnActive : btnInactive}
                    >
                        {p}
                    </button>
                ))}
                {end < totalPages && (
                    <>
                        {end < totalPages - 1 && <span className="text-gray-400 text-xs px-1">…</span>}
                        <button onClick={() => onChange(totalPages)} className={btnInactive}>{totalPages}</button>
                    </>
                )}

                {/* Next */}
                <button
                    onClick={() => onChange(page + 1)}
                    disabled={page === totalPages}
                    className={page === totalPages ? btnDisabled : btnInactive}
                    title="다음 페이지"
                >
                    ›
                </button>
                {/* Last */}
                <button
                    onClick={() => onChange(totalPages)}
                    disabled={page === totalPages}
                    className={page === totalPages ? btnDisabled : btnInactive}
                    title="마지막 페이지"
                >
                    »
                </button>
            </div>
        </div>
    );
}
