import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import { notificationApi } from '../../lib/api';
import {
  Home, Compass, Users, Film, Map, MessageCircle, Bell, User,
  Settings, LogOut, Globe, UserCheck, Menu, X, Plus
} from 'lucide-react';

export default function Layout({ children, title }) {
  const { user, logout, switchRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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
    { path: '/friends', icon: UserCheck, label: 'Friends' },
  ];

  const handleRoleSwitch = async () => {
    try {
      if (isInGuideDashboard) {
        await switchRole('TRAVELER');
        navigate('/dashboard');
      } else {
        await switchRole('GUIDE');
        navigate('/guide-dashboard');
      }
    } catch (err) {
      if (err.message?.includes('needsGuideProfile')) {
        navigate('/become-guide');
      } else {
        alert(err.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-green-600 text-lg">
            <Globe className="w-5 h-5" />
            LocalLens
          </Link>

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

          <div className="flex items-center gap-2">
            <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-gray-100">
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {isGuide && (
              <button
                onClick={handleRoleSwitch}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-green-500 text-green-600 hover:bg-green-50 transition-colors"
              >
                {isInGuideDashboard ? <Home className="w-4 h-4" /> : <User className="w-4 h-4" />}
                {isInGuideDashboard ? 'Traveller' : 'Guide Mode'}
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100"
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
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                  <Link to="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <User className="w-4 h-4" /> Profile
                  </Link>
                  <Link to="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <Settings className="w-4 h-4" /> Settings
                  </Link>
                  {isGuide && (
                    <button onClick={() => { handleRoleSwitch(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-gray-50">
                      <UserCheck className="w-4 h-4" /> {isInGuideDashboard ? 'Switch to Traveller' : 'Switch to Guide'}
                    </button>
                  )}
                  {!isGuide && (
                    <Link to="/become-guide" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-gray-50">
                      <Plus className="w-4 h-4" /> Become a Guide
                    </Link>
                  )}
                  <hr className="my-1" />
                  <button onClick={() => { logout(); navigate('/login'); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-50">
                    <LogOut className="w-4 h-4" /> Log out
                  </button>
                </div>
              )}
            </div>

            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-2 flex flex-wrap gap-1">
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
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {title && <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>}
        {children}
      </main>
    </div>
  );
}
