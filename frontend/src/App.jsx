import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import TravelerDashboard from './pages/traveler/TravelerDashboard';
import GuideDashboard from './pages/guide/GuideDashboard';
import ExplorePage from './pages/traveler/ExplorePage';
import GroupToursPage from './pages/traveler/GroupToursPage';
import ReelsPage from './pages/ReelsPage';
import MapPage from './pages/MapPage';
import ProfilePage from './pages/ProfilePage';
import GuideProfilePage from './pages/GuideProfilePage';
import BookingPage from './pages/traveler/BookingPage';
import MessagesPage from './pages/MessagesPage';
import NotificationsPage from './pages/NotificationsPage';
import FriendsPage from './pages/FriendsPage';
import UserProfilePage from './pages/UserProfilePage';
import SettingsPage from './pages/SettingsPage';
import GuideRegisterPage from './pages/GuideRegisterPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full"/></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function GuideRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'GUIDE' && user.role !== 'BOTH' && user.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected - Traveler */}
      <Route path="/dashboard" element={<ProtectedRoute><TravelerDashboard /></ProtectedRoute>} />
      <Route path="/explore" element={<ProtectedRoute><ExplorePage /></ProtectedRoute>} />
      <Route path="/group-tours" element={<ProtectedRoute><GroupToursPage /></ProtectedRoute>} />
      <Route path="/reels" element={<ProtectedRoute><ReelsPage /></ProtectedRoute>} />
      <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/guides/:id" element={<ProtectedRoute><GuideProfilePage /></ProtectedRoute>} />
      <Route path="/book/:guideId" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
      <Route path="/users/:userId" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
      <Route path="/become-guide" element={<ProtectedRoute><GuideRegisterPage /></ProtectedRoute>} />

      {/* Guide Dashboard */}
      <Route path="/guide-dashboard" element={<GuideRoute><GuideDashboard /></GuideRoute>} />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
