import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Mail from './pages/Mail';
import { useAuthStore } from './store/authStore';

function AppRoutes() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Routes>
      {/* Login Route */}
      <Route 
        path="/login" 
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login />
        } 
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Mail />} />
        <Route path="inbox" element={<Mail />} />
        <Route path="sent" element={<Mail />} />
        <Route path="drafts" element={<Mail />} />
        <Route path="starred" element={<Mail />} />
        <Route path="archive" element={<Mail />} />
        <Route path="trash" element={<Mail />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster 
        position="bottom-left"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '8px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </BrowserRouter>
  );
}
