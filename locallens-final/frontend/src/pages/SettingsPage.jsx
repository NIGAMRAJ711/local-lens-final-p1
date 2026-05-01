import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../lib/api';
import { User, UserCheck, Shield, LogOut, ChevronRight, Bell, Globe } from 'lucide-react';

export default function SettingsPage() {
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);
  const [message, setMessage] = useState('');

  const isGuide = user?.role === 'GUIDE' || user?.role === 'BOTH';

  const handleSwitchToGuide = async () => {
    setSwitching(true);
    try {
      await switchRole('GUIDE');
      setMessage('Switched to Guide mode!');
      setTimeout(() => { navigate('/guide-dashboard'); }, 1000);
    } catch (err) {
      if (err.message?.includes('needsGuideProfile') || err.message?.includes('Guide profile required')) {
        navigate('/become-guide');
      } else {
        alert(err.message);
      }
    } finally {
      setSwitching(false);
    }
  };

  const handleSwitchToTraveller = async () => {
    setSwitching(true);
    try {
      await switchRole('TRAVELER');
      setMessage('Switched to Traveller mode!');
      setTimeout(() => { navigate('/dashboard'); }, 1000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSwitching(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout title="Settings">
      <div className="max-w-xl mx-auto space-y-4">
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">{message}</div>
        )}

        {/* Account Mode */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-1">Account Mode</h3>
          <p className="text-sm text-gray-500 mb-4">Switch between your guide and traveller profiles. Your data is preserved in both modes.</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleSwitchToTraveller}
              disabled={switching || user?.role === 'TRAVELER'}
              className={`p-4 rounded-xl border-2 text-left transition ${
                user?.role === 'TRAVELER' || user?.role === 'BOTH' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
              }`}
            >
              <div className="text-2xl mb-2">🧳</div>
              <p className="font-semibold text-sm">Traveller Mode</p>
              <p className="text-xs text-gray-500 mt-0.5">Book guides & explore</p>
              {(user?.role === 'TRAVELER') && (
                <p className="text-xs text-green-600 font-medium mt-1">● Current Mode</p>
              )}
            </button>
            <button
              onClick={handleSwitchToGuide}
              disabled={switching}
              className={`p-4 rounded-xl border-2 text-left transition ${
                user?.role === 'GUIDE' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
              }`}
            >
              <div className="text-2xl mb-2">🗺️</div>
              <p className="font-semibold text-sm">Guide Mode</p>
              <p className="text-xs text-gray-500 mt-0.5">Offer tours & earn</p>
              {user?.role === 'GUIDE' && <p className="text-xs text-green-600 font-medium mt-1">● Current Mode</p>}
              {!isGuide && <p className="text-xs text-orange-500 mt-1">Register as guide →</p>}
            </button>
          </div>
        </div>

        {/* Profile Settings */}
        <div className="card divide-y divide-gray-100">
          <button onClick={() => navigate('/profile')} className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><User className="w-5 h-5 text-blue-600" /></div>
            <div className="flex-1 text-left">
              <p className="font-medium text-sm">Edit Profile</p>
              <p className="text-xs text-gray-500">Update your name, photo, phone</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>

          {isGuide && (
            <button onClick={() => navigate('/guide-dashboard')} className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition">
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center"><UserCheck className="w-5 h-5 text-green-600" /></div>
              <div className="flex-1 text-left">
                <p className="font-medium text-sm">Guide Dashboard</p>
                <p className="text-xs text-gray-500">Manage your tours & earnings</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          )}

          {!isGuide && (
            <button onClick={() => navigate('/become-guide')} className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition">
              <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center"><Globe className="w-5 h-5 text-orange-600" /></div>
              <div className="flex-1 text-left">
                <p className="font-medium text-sm">Become a Guide</p>
                <p className="text-xs text-gray-500">Share your local knowledge & earn</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Danger Zone */}
        <div className="card p-4">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Log Out</span>
          </button>
        </div>
      </div>
    </Layout>
  );
}
