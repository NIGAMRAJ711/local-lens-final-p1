import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useState, useEffect } from 'react';
import { notificationApi } from '../../lib/api';
import {
  Home, Compass, Users, Film, Map, MessageCircle, Bell, User,
  Settings, LogOut, Globe, UserCheck, Menu, X, Plus, ArrowRightLeft
} from 'lucide-react';

export default function Layout({ children, title }) {
  const { user, logout, switchRole, refreshUser } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    notificationApi.getAll().then(d => {
      setUnreadCount(d.notifications?.filter(n => !n.isRead).length || 0);
    }).catch(() => {});
  }, [location.pathname]);

  const isGuide = user?.role === 'GUIDE' || user?.role === 'BOTH';
  const isInGuideDashboard = location.pathname === '/guide-dashboard';

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Home' },
    { path: '/explore', icon: Compass, label: 'Explore' },
    { path: '/group-tours', icon: Users, label: 'Tours' },
    { path: '/reels', icon: Film, label: 'Reels' },
    { path: '/map', icon: Map, label: 'Map' },
    { path: '/messages', icon: MessageCircle, label: 'Chat' },
  ];

  const handleRoleSwitch = async () => {
    if (switching) return;
    setSwitching(true);
    try {
      if (isInGuideDashboard) {
        await switchRole('TRAVELER');
        await refreshUser();
        toast.success('Switched to Traveller mode 🧳');
        navigate('/dashboard');
      } else {
        await switchRole('GUIDE');
        await refreshUser();
        toast.success('Switched to Guide mode 🗺️');
        navigate('/guide-dashboard');
      }
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-green-600 text-lg flex-shrink-0">
            <Globe className="w-5 h-5" />
            LocalLens
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-gray-100 transition">
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Role switch button */}
            {isGuide && (
              <button
                onClick={handleRoleSwitch}
                disabled={switching}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-green-500 text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
              >
                {switching ? (
                  <div className="animate-spin w-3.5 h-3.5 border-2 border-green-500 border-t-transparent rounded-full" />
                ) : (
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                )}
                {isInGuideDashboard ? 'Traveller Mode' : 'Guide Mode'}
              </button>
            )}

            {/* Avatar dropdown */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">
                    {user?.fullName?.[0]?.toUpperCase()}
                  </div>
                )}
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                    {/* User info */}
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user?.fullName}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>

                    <Link to="/profile" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                      <User className="w-4 h-4 text-gray-400" /> My Profile
                    </Link>
                    <Link to="/friends" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                      <UserCheck className="w-4 h-4 text-gray-400" /> Friends
                    </Link>
                    <Link to="/settings" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                      <Settings className="w-4 h-4 text-gray-400" /> Settings
                    </Link>

                    <hr className="my-1 border-gray-100" />

                    {isGuide ? (
                      <button
                        onClick={() => { handleRoleSwitch(); setMenuOpen(false); }}
                        disabled={switching}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-green-600 hover:bg-gray-50 transition"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                        {isInGuideDashboard ? 'Switch to Traveller' : 'Switch to Guide'}
                      </button>
                    ) : (
                      <Link to="/become-guide" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-orange-600 hover:bg-gray-50 transition">
                        <Plus className="w-4 h-4" /> Become a Guide
                      </Link>
                    )}

                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={() => { logout(); navigate('/login'); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                    >
                      <LogOut className="w-4 h-4" /> Log Out
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
            >
              {menuOpen ? <X className="w-5 h-5 text-gray-600" /> : <Menu className="w-5 h-5 text-gray-600" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 flex flex-wrap gap-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.path ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
            {isGuide && (
              <button
                onClick={() => { handleRoleSwitch(); setMenuOpen(false); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-green-600 border border-green-200"
              >
                <ArrowRightLeft className="w-4 h-4" />
                {isInGuideDashboard ? 'Traveller' : 'Guide Mode'}
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {title && <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>}
        {children}
      </main>
    </div>
  );
}
