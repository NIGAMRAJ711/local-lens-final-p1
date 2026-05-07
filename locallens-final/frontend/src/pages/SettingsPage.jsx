import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { User, UserCheck, Globe, LogOut, ChevronRight, Bell, Shield, ArrowRightLeft } from 'lucide-react';

export default function SettingsPage() {
  const { user, logout, switchRole, refreshUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [switching, setSwitching] = useState(false);

  const isGuide = user?.role === 'GUIDE' || user?.role === 'BOTH';
  const isInGuideDashboard = false;

  const handleSwitchToGuide = async () => {
    setSwitching(true);
    try {
      await switchRole('GUIDE');
      await refreshUser();
      toast.success('Switched to Guide mode! 🗺️');
      setTimeout(() => navigate('/guide-dashboard'), 500);
    } catch (err) {
      if (err.message?.includes('needsGuideProfile') || err.message?.includes('Guide profile required')) {
        toast.info('Please complete your guide profile first');
        navigate('/become-guide');
      } else {
        toast.error(err.message);
      }
    } finally {
      setSwitching(false);
    }
  };

  const handleSwitchToTraveller = async () => {
    setSwitching(true);
    try {
      await switchRole('TRAVELER');
      await refreshUser();
      toast.success('Switched to Traveller mode! 🧳');
      setTimeout(() => navigate('/dashboard'), 500);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSwitching(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.info('Logged out successfully');
    navigate('/login');
  };

  return (
    <Layout title="Settings">
      <div className="max-w-xl mx-auto space-y-4">

        {/* Current mode badge */}
        <div className="card p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${user?.role === 'GUIDE' ? 'bg-green-100' : 'bg-blue-100'}`}>
            {user?.role === 'GUIDE' ? '🗺️' : '🧳'}
          </div>
          <div>
            <p className="font-semibold text-gray-900">Current Mode: {user?.role}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        {/* Switch Mode */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <ArrowRightLeft className="w-4 h-4 text-green-600" />
            <h3 className="font-bold text-gray-900">Switch Mode</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">Switch between guide and traveller. Your data is always saved.</p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleSwitchToTraveller}
              disabled={switching || user?.role === 'TRAVELER'}
              className={`p-4 rounded-xl border-2 text-left transition ${user?.role === 'TRAVELER' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}
            >
              <div className="text-2xl mb-2">🧳</div>
              <p className="font-bold text-sm">Traveller</p>
              <p className="text-xs text-gray-500 mt-0.5">Book guides, explore</p>
              {user?.role === 'TRAVELER' && <p className="text-xs text-blue-600 font-medium mt-1">● Active now</p>}
            </button>

            <button
              onClick={handleSwitchToGuide}
              disabled={switching}
              className={`p-4 rounded-xl border-2 text-left transition ${user?.role === 'GUIDE' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300 hover:bg-green-50'}`}
            >
              <div className="text-2xl mb-2">🗺️</div>
              <p className="font-bold text-sm">Guide</p>
              <p className="text-xs text-gray-500 mt-0.5">Offer tours, earn</p>
              {user?.role === 'GUIDE' && <p className="text-xs text-green-600 font-medium mt-1">● Active now</p>}
              {!isGuide && <p className="text-xs text-orange-500 mt-1">Tap to register →</p>}
            </button>
          </div>

          {switching && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
              <div className="animate-spin w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full" />
              Switching mode...
            </div>
          )}
        </div>

        {/* Account settings */}
        <div className="card divide-y divide-gray-100">
          <button onClick={() => navigate('/profile')}
            className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-sm">Edit Profile</p>
              <p className="text-xs text-gray-500">Name, photo, phone</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>

          {isGuide && (
            <button onClick={() => navigate('/guide-dashboard')}
              className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition">
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-sm">Guide Dashboard</p>
                <p className="text-xs text-gray-500">Bookings, earnings, stats</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          )}

          {!isGuide && (
            <button onClick={() => navigate('/become-guide')}
              className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition">
              <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
                <Globe className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-sm">Become a Guide</p>
                <p className="text-xs text-gray-500">Share knowledge & earn</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          )}

          <button onClick={() => navigate('/notifications')}
            className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <Bell className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-sm">Notifications</p>
              <p className="text-xs text-gray-500">Manage alerts</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Logout */}
        <div className="card p-2">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 rounded-xl transition">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <LogOut className="w-4 h-4 text-red-600" />
            </div>
            <span className="font-semibold">Log Out</span>
          </button>
        </div>

        <p className="text-center text-xs text-gray-400">LocalLens v2.0 · All data stored securely</p>
      </div>
    </Layout>
  );
}
