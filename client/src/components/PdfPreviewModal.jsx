import { useEffect, useState } from 'react';
import { downloadWorkbookPdf } from '../api';

/**
 * PDF 인라인 미리보기 모달
 * Props:
 *   workbookId  — 워크북 ID
 *   studentName — 학생 이름 (모달 헤더 표시용)
 *   onClose     — 닫기 핸들러
 */
export default function PdfPreviewModal({ workbookId, studentName, onClose }) {
    const [url,     setUrl]     = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);

    useEffect(() => {
        let objUrl;
        setLoading(true);
        setError(null);

        downloadWorkbookPdf(workbookId)
            .then(res => {
                objUrl = URL.createObjectURL(res.data);
                setUrl(objUrl);
            })
            .catch(e => setError(e.response?.data?.message || e.message))
            .finally(() => setLoading(false));

        return () => {
            if (objUrl) URL.revokeObjectURL(objUrl);
        };
    }, [workbookId]);

    // ESC 키로 닫기
    useEffect(() => {
        function onKey(e) { if (e.key === 'Escape') onClose(); }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl h-[88vh] flex flex-col shadow-2xl">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-5 py-3 border-b dark:border-gray-700 shrink-0">
                    <div>
                        <h2 className="font-semibold text-gray-800 dark:text-gray-100">
                            {studentName} — 문제집 미리보기
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">ESC 또는 외부 클릭으로 닫기</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
                            text-2xl leading-none transition w-8 h-8 flex items-center justify-center rounded
                            hover:bg-gray-100 dark:hover:bg-gray-700">
                        ✕
                    </button>
                </div>

                {/* 컨텐츠 */}
                <div className="flex-1 overflow-hidden">
                    {loading && (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                            <p className="text-sm">PDF 생성 중...</p>
                        </div>
                    )}
                    {error && (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center space-y-2">
                                <p className="text-red-500 text-sm">PDF 로드 실패</p>
                                <p className="text-xs text-gray-400">{error}</p>
                                <button
                                    onClick={onClose}
                                    className="mt-2 px-4 py-2 border rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                                    닫기
                                </button>
                            </div>
                        </div>
                    )}
                    {url && (
                        <iframe
                            src={url}
                            className="w-full h-full"
                            title={`${studentName} 문제집 미리보기`}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
