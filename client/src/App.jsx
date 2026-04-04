import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Upload   from './pages/Upload';
import Students from './pages/Students';
import Student  from './pages/Student';
import Orders   from './pages/Orders';

function Nav() {
  const base = 'px-4 py-2 rounded text-sm font-medium transition-colors ';
  const active   = base + 'bg-blue-600 text-white';
  const inactive = base + 'text-gray-600 hover:bg-gray-100';

  return (
      <nav className="bg-white border-b px-6 py-3 flex items-center gap-4">
        <span className="font-bold text-blue-700 text-lg mr-4">📘 TOEIC Tailor</span>
        <NavLink to="/upload"   className={({ isActive }) => isActive ? active : inactive}>업로드</NavLink>
        <NavLink to="/students" className={({ isActive }) => isActive ? active : inactive}>학생 목록</NavLink>
        <NavLink to="/orders"   className={({ isActive }) => isActive ? active : inactive}>주문 목록</NavLink>
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
              <Route path="/"            element={<Students />} />
              <Route path="/upload"      element={<Upload />} />
              <Route path="/students"    element={<Students />} />
              <Route path="/students/:id" element={<Student />} />
              <Route path="/orders"      element={<Orders />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
  );
}