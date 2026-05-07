import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../components/shared/Layout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { guideApi, bookingApi, notificationApi } from '../../lib/api';
import { DollarSign, Star, Users, Calendar, MessageCircle, Bell, ToggleLeft, ToggleRight, CheckCircle, Clock, XCircle, MapPin, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export default function GuideDashboard() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [s, b, n] = await Promise.all([
        guideApi.getDashboardStats().catch(() => null),
        bookingApi.getMyBookings({ role: 'guide' }).catch(() => ({ bookings: [] })),
        notificationApi.getAll().catch(() => ({ notifications: [] })),
      ]);
      setStats(s);
      setBookings(b.bookings || []);
      setNotifications(n.notifications?.filter(n => !n.isRead).slice(0, 5) || []);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async () => {
    setToggling(true);
    const current = stats?.stats?.isAvailable || false;
    try {
      await guideApi.updateAvailability(!current);
      setStats(s => s ? { ...s, stats: { ...s.stats, isAvailable: !current } } : s);
      toast.success(current ? 'You are now Offline' : 'You are now Online and visible to travellers! 🟢');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setToggling(false);
    }
  };

  const handleBookingAction = async (bookingId, status) => {
    setActionLoading(l => ({ ...l, [bookingId]: status }));
    try {
      await bookingApi.updateStatus(bookingId, status);
      setBookings(bs => bs.map(b => b.id === bookingId ? { ...b, status } : b));
      if (status === 'CONFIRMED') toast.success('Booking confirmed! Traveller has been notified ✅');
      else toast.info('Booking declined');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(l => ({ ...l, [bookingId]: null }));
    }
  };

  const handleComplete = async (bookingId) => {
    setActionLoading(l => ({ ...l, [bookingId]: 'completing' }));
    try {
      const result = await bookingApi.complete(bookingId);
      await loadData();
      toast.success(`Tour completed! 💰 Earnings added to your wallet`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(l => ({ ...l, [bookingId]: null }));
    }
  };

  if (loading) return (
    <Layout>
      <div className="text-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto" />
      </div>
    </Layout>
  );

  const isAvailable = stats?.stats?.isAvailable || false;
  const pendingBookings = bookings.filter(b => b.status === 'PENDING');
  const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED');
  const completedBookings = bookings.filter(b => b.status === 'COMPLETED');

  return (
    <Layout>
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-green-700 to-emerald-600 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Guide Dashboard</h1>
            <p className="text-green-100 text-sm">Welcome back, {user?.fullName?.split(' ')[0]}!</p>
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={toggleAvailability}
                disabled={toggling}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  isAvailable ? 'bg-white text-green-700 hover:bg-green-50' : 'bg-green-600 border-2 border-white/40 text-white hover:bg-green-500'
                }`}
              >
                {toggling ? (
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                ) : isAvailable ? (
                  <ToggleRight className="w-5 h-5" />
                ) : (
                  <ToggleLeft className="w-5 h-5" />
                )}
                {isAvailable ? '🟢 Online' : '⚫ Offline'}
              </button>
              <Link to="/map" className="flex items-center gap-1.5 bg-green-500 border border-white/30 text-white px-3 py-2 rounded-xl text-sm hover:bg-green-400 transition">
                <MapPin className="w-4 h-4" /> View Map
              </Link>
            </div>
          </div>
          <div className="text-right">
            <p className="text-green-200 text-xs mb-1">Wallet Balance</p>
            <p className="text-3xl font-bold">₹{stats?.stats?.walletBalance?.toFixed(0) || '0'}</p>
            <p className="text-green-200 text-xs mt-1">{stats?.stats?.totalBookings || 0} total tours</p>
          </div>
        </div>
      </div>

      {/* Earnings Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Today", value: `₹${stats?.earnings?.today?.toFixed(0) || '0'}`, icon: DollarSign, color: 'text-green-600 bg-green-50' },
          { label: 'This Week', value: `₹${stats?.earnings?.week?.toFixed(0) || '0'}`, icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
          { label: 'This Month', value: `₹${stats?.earnings?.month?.toFixed(0) || '0'}`, icon: Calendar, color: 'text-purple-600 bg-purple-50' },
          { label: 'All Time', value: `₹${stats?.earnings?.total?.toFixed(0) || '0'}`, icon: DollarSign, color: 'text-orange-600 bg-orange-50' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color} mb-2`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Earnings Chart */}
      {stats?.earnings?.last7Days && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-600" /> Weekly Earnings Trend</h2>
            <span className="text-sm font-medium text-gray-500">Last 7 Days</span>
          </div>
          <div className="flex items-end justify-between gap-2 h-48 mt-4 pt-4 border-t border-gray-100">
            {stats.earnings.last7Days.map((day, i) => {
              const maxAmount = Math.max(...stats.earnings.last7Days.map(d => d.amount), 100);
              const heightPct = Math.max((day.amount / maxAmount) * 100, 2);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="relative w-full flex justify-center">
                    <div className="absolute -top-8 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
                      ₹{day.amount.toFixed(0)}
                    </div>
                    <div className="w-full max-w-[40px] bg-green-100 rounded-t-lg relative overflow-hidden group-hover:bg-green-200 transition" style={{ height: '140px' }}>
                      <div className="absolute bottom-0 left-0 right-0 bg-green-500 rounded-t-lg transition-all duration-500" style={{ height: `${heightPct}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-500">{format(new Date(day.date), 'EEE')}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pending Requests */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-bold text-gray-900">Booking Requests</h2>
            {pendingBookings.length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">{pendingBookings.length}</span>
            )}
          </div>

          {pendingBookings.length === 0 ? (
            <div className="card p-8 text-center text-gray-500">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p className="font-medium text-sm">No pending requests</p>
              <p className="text-xs mt-1">Toggle online to receive bookings</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingBookings.map(b => (
                <div key={b.id} className="card p-4 border-l-4 border-l-yellow-400">
                  <div className="flex items-center gap-3 mb-3">
                    {b.traveler?.avatarUrl ? (
                      <img src={b.traveler.avatarUrl} className="w-10 h-10 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
                        {b.traveler?.fullName?.[0]}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{b.traveler?.fullName}</p>
                      <p className="text-xs text-gray-500">
                        {b.date && format(new Date(b.date), 'MMM d, yyyy')} · {b.startTime} · {b.duration?.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-green-600 font-bold">₹{b.totalAmount?.toFixed(0)}</p>
                    </div>
                  </div>
                  {b.specialRequests && (
                    <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2 mb-3 italic">"{b.specialRequests}"</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleBookingAction(b.id, 'CONFIRMED')}
                      disabled={!!actionLoading[b.id]}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white text-sm py-2 rounded-xl hover:bg-green-700 transition disabled:opacity-50 font-medium"
                    >
                      {actionLoading[b.id] === 'CONFIRMED' ? <div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /> : <CheckCircle className="w-4 h-4" />}
                      Accept
                    </button>
                    <button
                      onClick={() => handleBookingAction(b.id, 'CANCELLED')}
                      disabled={!!actionLoading[b.id]}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 text-red-600 text-sm py-2 rounded-xl hover:bg-red-100 transition disabled:opacity-50"
                    >
                      {actionLoading[b.id] === 'CANCELLED' ? <div className="animate-spin w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full" /> : <XCircle className="w-4 h-4" />}
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirmed/Active Tours */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-bold text-gray-900">Upcoming Tours</h2>
            {confirmedBookings.length > 0 && (
              <span className="bg-green-500 text-white text-xs rounded-full px-2 py-0.5">{confirmedBookings.length}</span>
            )}
          </div>

          {confirmedBookings.length === 0 ? (
            <div className="card p-8 text-center text-gray-500">
              <Clock className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p className="font-medium text-sm">No upcoming tours</p>
            </div>
          ) : (
            <div className="space-y-3">
              {confirmedBookings.map(b => (
                <div key={b.id} className="card p-4 border-l-4 border-l-green-500">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700">
                        {b.traveler?.fullName?.[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{b.traveler?.fullName}</p>
                        <p className="text-xs text-gray-500">
                          {b.date && format(new Date(b.date), 'MMM d')} · {b.startTime}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">CONFIRMED</span>
                  </div>
                  <p className="text-xs text-green-600 font-bold mb-3">₹{b.totalAmount?.toFixed(0)}</p>
                  <div className="flex gap-2">
                    <Link to="/messages" className="flex-1 flex items-center justify-center gap-1.5 text-xs border border-gray-200 py-2 rounded-xl hover:bg-gray-50 transition">
                      <MessageCircle className="w-3.5 h-3.5 text-gray-500" /> Chat
                    </Link>
                    <button
                      onClick={() => handleComplete(b.id)}
                      disabled={!!actionLoading[b.id]}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-green-600 text-white py-2 rounded-xl hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {actionLoading[b.id] === 'completing' ? <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      Complete & Get Paid
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="mt-6 card p-5">
        <h2 className="font-bold text-gray-900 mb-4">Profile Performance</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-yellow-50 rounded-xl p-3">
            <p className="text-2xl font-bold text-yellow-600">⭐ {stats?.stats?.avgRating?.toFixed(1) || '0.0'}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stats?.stats?.totalReviews || 0} reviews</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3">
            <p className="text-2xl font-bold text-green-600">{stats?.stats?.totalBookings || 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total tours done</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-2xl font-bold text-blue-600">₹{stats?.earnings?.total?.toFixed(0) || '0'}</p>
            <p className="text-xs text-gray-500 mt-0.5">Lifetime earnings</p>
          </div>
        </div>
      </div>

      {/* Unread Notifications */}
      {notifications.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Notifications</h2>
            <Link to="/notifications" className="text-xs text-green-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {notifications.map(n => (
              <div key={n.id} className="card p-3 border-l-4 border-l-green-500">
                <p className="text-sm font-medium text-gray-900">{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                <p className="text-xs text-gray-400 mt-1">{format(new Date(n.createdAt), 'MMM d, h:mm a')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
