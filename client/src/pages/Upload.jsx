import { useState } from 'react';
import { uploadScores } from '../api';

export default function Upload() {
    const [file,    setFile]    = useState(null);
    const [result,  setResult]  = useState(null);
    const [error,   setError]   = useState(null);
    const [loading, setLoading] = useState(false);

    async function handleUpload() {
        if (!file) return;
        setLoading(true); setError(null); setResult(null);
        try {
            const res = await uploadScores(file);
            setResult(res.data.data);
        } catch (e) {
            setError(e.response?.data?.message || e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-lg mx-auto mt-10">
            <h1 className="text-2xl font-bold mb-6">📂 학생 점수 업로드</h1>

            <div className="bg-white rounded-xl border p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        엑셀 파일 선택 (.xlsx)
                    </label>
                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={e => setFile(e.target.files[0])}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
                       file:rounded file:border-0 file:bg-blue-50 file:text-blue-700
                       hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                        컬럼: 이름 / 응시일 / 총점 / LC / RC / Part1~7
                    </p>
                </div>

                <button
                    onClick={handleUpload}
                    disabled={!file || loading}
                    className="w-full py-2 bg-blue-600 text-white rounded font-medium
                     hover:bg-blue-700 disabled:opacity-40 transition"
                >
                    {loading ? '업로드 중...' : '업로드'}
                </button>

                {result && (
                    <div className="bg-green-50 border border-green-200 rounded p-4 text-sm">
                        <p className="font-medium text-green-700 mb-1">✅ 업로드 완료</p>
                        <p>전체: {result.total}명 / 신규: {result.created}명 / 갱신: {result.updated}명 / 중복: {result.skipped}명</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-700">
                        ❌ {error}
                    </div>
                )}
            </div>
        </div>
    );
}