import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import StartPage from './pages/StartPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import HomePage from './pages/HomePage'
import BasicInfoPage from './pages/sections/BasicInfoPage'
import KartePage from './pages/sections/KartePage'
import ReservationCalendarPage from './pages/sections/ReservationCalendarPage'
import OrdersPage from './pages/sections/OrdersPage'
import ServicesPage from './pages/sections/ServicesPage'
import ProductsPage from './pages/sections/ProductsPage'
import HoursPage from './pages/sections/HoursPage'
import StripePage from './pages/sections/StripePage'
import LicensePage from './pages/sections/LicensePage'
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'
import CommercialPage from './pages/CommercialPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>
  return user ? <Navigate to="/home" replace /> : <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><StartPage /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
      <Route path="/home" element={<PrivateRoute><HomePage /></PrivateRoute>} />
      <Route path="/home/basic" element={<PrivateRoute><BasicInfoPage /></PrivateRoute>} />
      <Route path="/home/karte" element={<PrivateRoute><KartePage /></PrivateRoute>} />
      <Route path="/home/reservation" element={<PrivateRoute><ReservationCalendarPage /></PrivateRoute>} />
      <Route path="/home/orders" element={<PrivateRoute><OrdersPage /></PrivateRoute>} />
      <Route path="/home/services" element={<PrivateRoute><ServicesPage /></PrivateRoute>} />
      <Route path="/home/products" element={<PrivateRoute><ProductsPage /></PrivateRoute>} />
      <Route path="/home/hours" element={<PrivateRoute><HoursPage /></PrivateRoute>} />
      <Route path="/home/stripe" element={<PrivateRoute><StripePage /></PrivateRoute>} />
      <Route path="/home/license" element={<PrivateRoute><LicensePage /></PrivateRoute>} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/commercial" element={<CommercialPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
