import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import TrainsPage from './pages/TrainsPage';
import PreBookPage from './pages/PreBookPage';
import MyBookingsPage from './pages/MyBookingsPage';
import LoginPage from './pages/LoginPage';

const queryClient = new QueryClient();

// Pages that use the full sidebar layout (Navbar hidden, sidebar inside page)
const SIDEBAR_PAGES = ['/', '/trains', '/prebook', '/my-bookings'];

function AppRoutes({ onLogout }: { onLogout: () => void }) {
  return (
    <Routes>
      <Route path="/"             element={<HomePage />} />
      <Route path="/trains"       element={<TrainsPage />} />
      <Route path="/prebook"      element={<PreBookPage />} />
      <Route path="/my-bookings"  element={<MyBookingsPage />} />
      <Route path="*"             element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('enr_auth') === 'true';
  });

  const handleLogin = () => {
    localStorage.setItem('enr_auth', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('enr_auth');
    setIsAuthenticated(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {!isAuthenticated ? (
          <Routes>
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route path="*"      element={<Navigate to="/login" replace />} />
          </Routes>
        ) : (
          <>
            {/* Top nav is shown globally on all authenticated pages */}
            <Navbar onLogout={handleLogout} />
            <AppRoutes onLogout={handleLogout} />
          </>
        )}
      </BrowserRouter>
    </QueryClientProvider>
  );
}
