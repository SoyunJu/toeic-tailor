import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Upload    from './pages/Upload';
import Students  from './pages/Students';
import Student   from './pages/Student';
import Orders    from './pages/Orders';
import Generate  from './pages/Generate';
import Settings  from './pages/Settings';
import { getCredits, chargeCredits } from './api';

function CreditsWidget() {
    const [balance,  setBalance]  = useState(null);
    const [loading,  setLoading]  = useState(false);
    const [charging, setCharging] = useState(false);

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
        } catch (e) {
            alert(e.response?.data?.message || e.message);
        } finally {
            setCharging(false);
        }
    }

    useEffect(() => { load(); }, []);

    return (
        <div className="flex items-center gap-2 ml-auto text-sm">
            <span className="text-gray-500">충전금:</span>
            <span className="font-medium text-gray-800">
        {loading ? '...' : balance != null ? balance.toLocaleString() + '원' : '-'}
      </span>
            <button
                onClick={handleCharge}
                disabled={charging}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200
          rounded hover:bg-blue-100 disabled:opacity-40 transition">
                {charging ? '충전중...' : '+ 충전 (sandbox)'}
            </button>
            <button onClick={load} className="text-xs text-gray-400 hover:text-gray-600">🔄</button>
        </div>
    );
}

function Nav() {
    const base     = 'px-4 py-2 rounded text-sm font-medium transition-colors ';
    const active   = base + 'bg-blue-600 text-white';
    const inactive = base + 'text-gray-600 hover:bg-gray-100';

    return (
        <nav className="bg-white border-b px-6 py-3 flex items-center gap-2 flex-wrap">
            <span className="font-bold text-blue-700 text-lg mr-2">📘 TOEIC Tailor</span>
            <NavLink to="/upload"    className={({ isActive }) => isActive ? active : inactive}>업로드</NavLink>
            <NavLink to="/students"  className={({ isActive }) => isActive ? active : inactive}>학생 목록</NavLink>
            <NavLink to="/generate"  className={({ isActive }) => isActive ? active : inactive}>기출 생성</NavLink>
            <NavLink to="/orders"    className={({ isActive }) => isActive ? active : inactive}>주문 목록</NavLink>
            <NavLink to="/settings"  className={({ isActive }) => isActive ? active : inactive}>설정</NavLink>
            <CreditsWidget />
        </nav>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <div className="min-h-screen bg-gray-50">
                <Nav />
                <main className="max-w-5xl mx-auto p-6">
                    <Routes>
                        <Route path="/"             element={<Students />} />
                        <Route path="/upload"       element={<Upload />} />
                        <Route path="/students"     element={<Students />} />
                        <Route path="/students/:id" element={<Student />} />
                        <Route path="/generate"     element={<Generate />} />
                        <Route path="/orders"       element={<Orders />} />
                        <Route path="/settings"     element={<Settings />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}