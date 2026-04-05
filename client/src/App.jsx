import {BrowserRouter, NavLink, Route, Routes} from 'react-router-dom';
import {useEffect, useState} from 'react';
import Upload from './pages/Upload';
import Students from './pages/Students';
import StudentDetail from './pages/StudentDetail';
import Orders from './pages/Orders';
import Generate from './pages/Generate';
import Settings from './pages/Settings';
import { ToastProvider, useToast } from './context/ToastContext';
import {chargeCredits, getCredits} from './api';

// ── 다크 모드 훅 ─────────────────────────────────────────────
function useDarkMode() {
    const [dark, setDark] = useState(() => localStorage.getItem('darkMode') === 'true');
    useEffect(() => {
        document.documentElement.classList.toggle('dark', dark);
        localStorage.setItem('darkMode', String(dark));
    }, [dark]);
    return [dark, setDark];
}

function CreditsWidget() {
    const [balance,  setBalance]  = useState(null);
    const [loading,  setLoading]  = useState(false);
    const [charging, setCharging] = useState(false);
    const { addToast } = useToast();

    async function load() {
        setLoading(true);
        try {
            const r = await getCredits();
            setBalance(r.data.data?.balance ?? r.data.data?.creditBalance ?? null);
        } catch {} finally {
            setLoading(false);
        }
    }

    async function handleCharge() {
        setCharging(true);
        try {
            await chargeCredits(100000);
            await load();
            addToast('success', '100,000원 충전 완료');
        } catch (e) {
            addToast('error', e.response?.data?.message || e.message);
        } finally {
            setCharging(false);
        }
    }

    useEffect(() => { load(); }, []);

    return (
        <div className="flex items-center gap-2 ml-auto text-sm">
            <span className="text-gray-500 dark:text-gray-400">충전금:</span>
            <span className="font-medium text-gray-800 dark:text-gray-100">
                {loading ? '...' : balance != null ? balance.toLocaleString() + '원' : '-'}
            </span>
            <button
                onClick={handleCharge}
                disabled={charging}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200
                    rounded hover:bg-blue-100 disabled:opacity-40 transition
                    dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700">
                {charging ? '충전중...' : '+ 충전 (sandbox)'}
            </button>
            <button onClick={load} className="text-xs text-gray-400 hover:text-gray-600">🔄</button>
        </div>
    );
}

function Nav({ dark, setDark }) {
    const base     = 'px-4 py-2 rounded text-sm font-medium transition-colors ';
    const active   = base + 'bg-blue-600 text-white';
    const inactive = base + 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700';

    return (
        <nav className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-3 flex items-center gap-1 flex-wrap">
            <span className="font-bold text-blue-700 dark:text-blue-400 text-lg mr-2">📘 TOEIC Tailor</span>
            <NavLink to="/upload"   className={({isActive}) => isActive ? active : inactive}>업로드</NavLink>
            <NavLink to="/students" className={({isActive}) => isActive ? active : inactive}>학생 목록</NavLink>
            <NavLink to="/generate" className={({isActive}) => isActive ? active : inactive}>기출 생성</NavLink>
            <NavLink to="/orders"   className={({isActive}) => isActive ? active : inactive}>주문 목록</NavLink>
            <NavLink to="/settings" className={({isActive}) => isActive ? active : inactive}>설정</NavLink>
            <div className="ml-auto flex items-center gap-3">
                <button
                    onClick={() => setDark(d => !d)}
                    title={dark ? '라이트 모드' : '다크 모드'}
                    className="text-lg leading-none text-gray-500 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition">
                    {dark ? '☀️' : '🌙'}
                </button>
                <CreditsWidget />
            </div>
        </nav>
    );
}

function AppContent() {
    const [dark, setDark] = useDarkMode();
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Nav dark={dark} setDark={setDark} />
            <main className="max-w-7xl mx-auto p-4 sm:p-6">
                <Routes>
                    <Route path="/"              element={<Students />} />
                    <Route path="/upload"        element={<Upload />} />
                    <Route path="/students"      element={<Students />} />
                    <Route path="/students/:id"  element={<StudentDetail />} />
                    <Route path="/generate"      element={<Generate />} />
                    <Route path="/orders"        element={<Orders />} />
                    <Route path="/settings"      element={<Settings />} />
                </Routes>
            </main>
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <ToastProvider>
                <AppContent />
            </ToastProvider>
        </BrowserRouter>
    );
}
