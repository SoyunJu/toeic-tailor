import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { uploadScores } from '../api';
import axios from 'axios';

const TABS = ['학생 정보', '기출 업로드'];

// 컬럼 예시 데이터
const SAMPLE_ROWS = [
    { 이름: '홍길동', 응시일: '2025-01-15', 총점: 650, LC: 330, RC: 320, Part1: 5, Part2: 20, Part3: 30, Part4: 22, Part5: 22, Part6: 12, Part7: 38 },
    { 이름: '김영희', 응시일: '2025-01-15', 총점: 780, LC: 390, RC: 390, Part1: 6, Part2: 23, Part3: 35, Part4: 27, Part5: 26, Part6: 14, Part7: 46 },
    { 이름: '이철수', 응시일: '2025-01-15', 총점: 520, LC: 260, RC: 260, Part1: 4, Part2: 16, Part3: 22, Part4: 18, Part5: 18, Part6: 10, Part7: 28 },
];
const SAMPLE_COLS = Object.keys(SAMPLE_ROWS[0]);

// ── 탭1: 학생 정보 ─────────────────────────────────────
function StudentUploadTab() {
    const [mode,     setMode]     = useState('excel'); // 'excel' | 'manual'
    const [preview,  setPreview]  = useState(null);
    const [file,     setFile]     = useState(null);
    const [result,   setResult]   = useState(null);
    const [error,    setError]    = useState(null);
    const [loading,  setLoading]  = useState(false);
    const [showSample, setShowSample] = useState(false);

    // 수동입력 폼
    const [form, setForm] = useState({
        name: '', lcScore: '', rcScore: '',
        className: '', classType: '', enrolledAt: '', expiresAt: '',
        part1Correct: '', part2Correct: '', part3Correct: '', part4Correct: '',
        part5Correct: '', part6Correct: '', part7Correct: '',
    });

    // Excel 파일 선택 → SheetJS 파싱 → 미리보기
    function handleExcelFile(e) {
        const f = e.target.files[0];
        if (!f) return;
        setFile(f);
        setResult(null); setError(null);

        const reader = new FileReader();
        reader.onload = (ev) => {
            const wb   = XLSX.read(ev.target.result, { type: 'array', cellDates: true });
            const ws   = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
            setPreview(rows.slice(0, 5)); // 미리보기 5행
        };
        reader.readAsArrayBuffer(f);
    }

    async function handleExcelUpload() {
        if (!file) return;
        setLoading(true); setError(null);
        try {
            const res = await uploadScores(file);
            setResult(res.data.data);
        } catch (e) {
            setError(e.response?.data?.message || e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleManualSubmit() {
        setLoading(true); setError(null);
        try {
            await axios.post('/api/students', form);
            setResult({ created: 1, updated: 0, total: 1 });
            setForm({
                name: '', lcScore: '', rcScore: '',
                className: '', classType: '', enrolledAt: '', expiresAt: '',
                part1Correct: '', part2Correct: '', part3Correct: '',
                part4Correct: '', part5Correct: '', part6Correct: '', part7Correct: '',
            });
        } catch (e) {
            setError(e.response?.data?.message || e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-4">
            {/* 입력 모드 토글 */}
            <div className="flex gap-2">
                <button onClick={() => setMode('excel')}
                        className={`px-4 py-2 rounded text-sm font-medium border transition
            ${mode === 'excel' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                     Excel 연동
                </button>
                <button onClick={() => setMode('manual')}
                        className={`px-4 py-2 rounded text-sm font-medium border transition
            ${mode === 'manual' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                     직접 입력
                </button>
            </div>

            {/* Excel 모드 */}
            {mode === 'excel' && (
                <div className="bg-white rounded-xl border p-6 space-y-4">
                    {/* 컬럼 예시 토글 */}
                    <button onClick={() => setShowSample(p => !p)}
                            className="text-sm text-blue-600 hover:underline">
                        {showSample ? '▲ 컬럼 예시 닫기' : '▼ 컬럼 예시 보기'}
                    </button>

                    {showSample && (
                        <div className="overflow-x-auto rounded border text-xs">
                            <table className="w-full min-w-max">
                                <thead className="bg-gray-50 text-gray-500">
                                <tr>
                                    {SAMPLE_COLS.map(c => (
                                        <th key={c} className="px-3 py-2 text-left font-medium whitespace-nowrap">{c}</th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody className="divide-y">
                                {SAMPLE_ROWS.map((row, i) => (
                                    <tr key={i}>
                                        {SAMPLE_COLS.map(c => (
                                            <td key={c} className="px-3 py-2 whitespace-nowrap text-gray-600">{row[c]}</td>
                                        ))}
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Excel 파일 선택 (.xlsx)
                        </label>
                        <input type="file" accept=".xlsx,.xls"
                               onChange={handleExcelFile}
                               className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4 file:rounded file:border-0
                file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    </div>

                    {/* 미리보기 */}
                    {preview && (
                        <div>
                            <p className="text-xs text-gray-500 mb-1">미리보기 (최대 5행)</p>
                            <div className="overflow-x-auto rounded border text-xs">
                                <table className="w-full min-w-max">
                                    <thead className="bg-gray-50 text-gray-500">
                                    <tr>
                                        {Object.keys(preview[0]).map(c => (
                                            <th key={c} className="px-3 py-2 text-left font-medium whitespace-nowrap">{c}</th>
                                        ))}
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                    {preview.map((row, i) => (
                                        <tr key={i}>
                                            {Object.values(row).map((v, j) => (
                                                <td key={j} className="px-3 py-2 whitespace-nowrap text-gray-600">
                                                    {v instanceof Date ? v.toLocaleDateString('ko-KR') : String(v)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <button onClick={handleExcelUpload}
                            disabled={!file || loading}
                            className="w-full py-2 bg-blue-600 text-white rounded font-medium
              hover:bg-blue-700 disabled:opacity-40 transition">
                        {loading ? '업로드 중...' : '업로드'}
                    </button>
                </div>
            )}

            {/* 수동 입력 모드 */}
            {mode === 'manual' && (
                <div className="bg-white rounded-xl border p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                            <label className="block text-gray-600 mb-1">이름 *</label>
                            <input type="text" value={form.name}
                                   onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                   className="border rounded px-3 py-2 w-full" />
                        </div>
                        <div>
                            <label className="block text-gray-600 mb-1">반</label>
                            <select value={form.className}
                                    onChange={e => setForm(p => ({ ...p, className: e.target.value }))}
                                    className="border rounded px-3 py-2 w-full">
                                <option value="">선택</option>
                                <option value="TARGET_600">600목표반</option>
                                <option value="TARGET_800">800목표반</option>
                                <option value="HIGH_SCORE">고득점반</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-600 mb-1">수업 유형</label>
                            <select value={form.classType}
                                    onChange={e => setForm(p => ({ ...p, classType: e.target.value }))}
                                    className="border rounded px-3 py-2 w-full">
                                <option value="">선택</option>
                                <option value="WEEKDAY">평일반</option>
                                <option value="WEEKEND">주말반</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-600 mb-1">LC 점수</label>
                            <input type="number" value={form.lcScore}
                                   onChange={e => setForm(p => ({ ...p, lcScore: e.target.value }))}
                                   className="border rounded px-3 py-2 w-full" />
                        </div>
                        <div>
                            <label className="block text-gray-600 mb-1">RC 점수</label>
                            <input type="number" value={form.rcScore}
                                   onChange={e => setForm(p => ({ ...p, rcScore: e.target.value }))}
                                   className="border rounded px-3 py-2 w-full" />
                        </div>
                        <div>
                            <label className="block text-gray-600 mb-1">수강등록일</label>
                            <input type="date" value={form.enrolledAt}
                                   onChange={e => setForm(p => ({ ...p, enrolledAt: e.target.value }))}
                                   className="border rounded px-3 py-2 w-full" />
                        </div>
                        <div>
                            <label className="block text-gray-600 mb-1">수강만료일</label>
                            <input type="date" value={form.expiresAt}
                                   onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                                   className="border rounded px-3 py-2 w-full" />
                        </div>
                    </div>

                    {/* 파트별 정답수 */}
                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">파트별 정답수 (선택)</p>
                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 text-xs">
                            {[1,2,3,4,5,6,7].map(p => (
                                <div key={p}>
                                    <label className="block text-gray-500 mb-1 text-center">Part {p}</label>
                                    <input type="number"
                                           value={form[`part${p}Correct`]}
                                           onChange={e => setForm(prev => ({ ...prev, [`part${p}Correct`]: e.target.value }))}
                                           className="border rounded px-2 py-1.5 w-full text-center" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <button onClick={handleManualSubmit}
                            disabled={!form.name || loading}
                            className="w-full py-2 bg-blue-600 text-white rounded font-medium
              hover:bg-blue-700 disabled:opacity-40 transition">
                        {loading ? '저장 중...' : '학생 등록'}
                    </button>
                </div>
            )}

            {/* 결과 */}
            {result && (
                <div className="bg-green-50 border border-green-200 rounded p-4 text-sm">
                    <p className="font-medium text-green-700">✅ 완료</p>
                    <p>전체 {result.total}명 · 신규 {result.created}명 · 갱신 {result.updated ?? 0}명</p>
                </div>
            )}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-700">❌ {error}</div>
            )}
        </div>
    );
}

// ── 탭2: 기출 업로드 ───────────────────────────────────
function ExamUploadTab() {
    const [file,    setFile]    = useState(null);
    const [result,  setResult]  = useState(null);
    const [error,   setError]   = useState(null);
    const [loading, setLoading] = useState(false);

    async function handleUpload() {
        if (!file) return;
        setLoading(true); setError(null); setResult(null);
        try {
            const form = new FormData();
            form.append('file', file);
            const res = await axios.post('/api/upload/exam', form);
            setResult(res.data.data);
        } catch (e) {
            setError(e.response?.data?.message || e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-white rounded-xl border p-6 space-y-4">
            <p className="text-sm text-gray-500">
                RC 기출 PDF를 업로드하면 AI가 문제를 자동 분석해 DB에 저장합니다.<br />
                저장된 문제는 개인별 맞춤 기출 생성에 활용됩니다.
            </p>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PDF 파일 선택</label>
                <input type="file" accept=".pdf"
                       onChange={e => setFile(e.target.files[0])}
                       className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4 file:rounded file:border-0
            file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
            </div>
            <button onClick={handleUpload}
                    disabled={!file || loading}
                    className="w-full py-2 bg-purple-600 text-white rounded font-medium
          hover:bg-purple-700 disabled:opacity-40 transition">
                {loading ? 'AI 분석 중...' : '업로드 + AI 분석'}
            </button>
            {result && (
                <div className="bg-green-50 border border-green-200 rounded p-4 text-sm">
                    <p className="font-medium text-green-700">✅ 분석 완료</p>
                    <p>추출된 문제: {result.extracted}개 · DB 저장: {result.saved}개</p>
                    <p className="text-gray-500">출처: {result.source}</p>
                </div>
            )}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-700">❌ {error}</div>
            )}
        </div>
    );
}

// ── 메인 ───────────────────────────────────────────────
export default function Upload() {
    const [tab, setTab] = useState(0);

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6"> 업로드</h1>

            {/* 탭 */}
            <div className="flex gap-1 mb-6 border-b">
                {TABS.map((t, i) => (
                    <button key={i} onClick={() => setTab(i)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition
              ${tab === i ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        {t}
                    </button>
                ))}
            </div>

            {tab === 0 && <StudentUploadTab />}
            {tab === 1 && <ExamUploadTab />}
        </div>
    );
}