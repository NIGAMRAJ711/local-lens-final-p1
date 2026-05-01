import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/shared/Layout';
import { useAuth } from '../../context/AuthContext';
import { guideApi, bookingApi, notificationApi } from '../../lib/api';
import { DollarSign, Star, Users, Calendar, MessageCircle, Bell, MapPin, ToggleLeft, ToggleRight, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function GuideDashboard() {
  const { user, refreshUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const loadData = async () => {
    try {
      const [s, b, n] = await Promise.all([
        guideApi.getDashboardStats().catch(() => null),
        bookingApi.getMyBookings({ role: 'guide' }).catch(() => ({ bookings: [] })),
        notificationApi.getAll().catch(() => ({ notifications: [] })),
      ]);
      setStats(s);
      setBookings(b.bookings || []);
      setNotifications(n.notifications?.slice(0, 5) || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const toggleAvailability = async () => {
    setToggling(true);
    try {
      const current = stats?.stats?.isAvailable || false;
      await guideApi.updateAvailability(!current);
      setStats(s => s ? { ...s, stats: { ...s.stats, isAvailable: !current } } : s);
    } catch (err) {
      alert(err.message);
    } finally {
      setToggling(false);
    }
  };

  const handleBookingAction = async (bookingId, status) => {
    try {
      await bookingApi.updateStatus(bookingId, status);
      setBookings(bs => bs.map(b => b.id === bookingId ? { ...b, status } : b));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCompleteBooking = async (bookingId) => {
    if (!confirm('Mark this tour as completed? This will release payment to your wallet.')) return;
    try {
      await bookingApi.complete(bookingId);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <Layout><div className="text-center py-20"><div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto"/></div></Layout>;

  const isAvailable = stats?.stats?.isAvailable || false;
  const pendingBookings = bookings.filter(b => b.status === 'PENDING');
  const upcomingBookings = bookings.filter(b => b.status === 'CONFIRMED');
  const activeBookings = bookings.filter(b => b.status === 'ACTIVE');

  return (
    <Layout>
      {/* Header */}
      <div className="bg-gradient-to-r from-green-700 to-emerald-600 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Guide Dashboard</h1>
            <p className="text-green-100 text-sm">Manage your tours & earnings</p>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm">Availability:</span>
              <button
                onClick={toggleAvailability}
                disabled={toggling}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition ${
                  isAvailable ? 'bg-white text-green-700' : 'bg-green-600 border border-white/30 text-white'
                }`}
              >
                {isAvailable ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                {isAvailable ? 'Online' : 'Offline'}
              </button>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-green-200">Wallet Balance</p>
            <p className="text-2xl font-bold">₹{stats?.stats?.walletBalance?.toFixed(0) || '0'}</p>
            <p className="text-xs text-green-200 mt-0.5">{stats?.stats?.totalBookings || 0} total tours</p>
          </div>
        </div>
      </div>

      {/* Earnings Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Today's Earnings", value: `₹${stats?.earnings?.today?.toFixed(0) || '0'}`, icon: DollarSign, color: 'text-green-600 bg-green-50' },
          { label: 'This Week', value: `₹${stats?.earnings?.week?.toFixed(0) || '0'}`, icon: DollarSign, color: 'text-blue-600 bg-blue-50' },
          { label: 'This Month', value: `₹${stats?.earnings?.month?.toFixed(0) || '0'}`, icon: DollarSign, color: 'text-purple-600 bg-purple-50' },
          { label: 'Total Earned', value: `₹${stats?.earnings?.total?.toFixed(0) || '0'}`, icon: DollarSign, color: 'text-orange-600 bg-orange-50' },
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pending Booking Requests */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-bold text-gray-900">Booking Requests</h2>
            {pendingBookings.length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{pendingBookings.length}</span>
            )}
          </div>
          {pendingBookings.length === 0 ? (
            <div className="card p-6 text-center text-gray-500">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No pending requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingBookings.map(b => (
                <div key={b.id} className="card p-4">
                  <div className="flex items-center gap-3 mb-2">
                    {b.traveler?.avatarUrl ? (
                      <img src={b.traveler.avatarUrl} className="w-9 h-9 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-200 flex items-center justify-center text-sm font-bold text-blue-700">
                        {b.traveler?.fullName?.[0]}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{b.traveler?.fullName}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(b.date), 'MMM d, yyyy')} • {b.startTime} • {b.duration.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-green-600 font-medium">₹{b.totalAmount?.toFixed(0)}</p>
                    </div>
                  </div>
                  {b.specialRequests && (
                    <p className="text-xs text-gray-600 bg-gray-50 rounded p-2 mb-2">"{b.specialRequests}"</p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => handleBookingAction(b.id, 'CONFIRMED')}
                      className="flex-1 flex items-center justify-center gap-1 bg-green-500 text-white text-xs py-1.5 rounded-lg hover:bg-green-600 transition">
                      <CheckCircle className="w-3 h-3" /> Accept
                    </button>
                    <button onClick={() => handleBookingAction(b.id, 'CANCELLED')}
                      className="flex-1 flex items-center justify-center gap-1 bg-red-100 text-red-600 text-xs py-1.5 rounded-lg hover:bg-red-200 transition">
                      <XCircle className="w-3 h-3" /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming / Active Bookings */}
        <div>
          <h2 className="font-bold text-gray-900 mb-3">Upcoming & Active Tours</h2>
          {upcomingBookings.length === 0 && activeBookings.length === 0 ? (
            <div className="card p-6 text-center text-gray-500">
              <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No upcoming tours</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...activeBookings, ...upcomingBookings].slice(0, 5).map(b => (
                <div key={b.id} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                        {b.traveler?.fullName?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{b.traveler?.fullName}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(b.date), 'MMM d')} • {b.startTime}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      b.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>{b.status}</span>
                  </div>
                  <div className="flex gap-2">
                    <Link to="/messages" className="flex-1 flex items-center justify-center gap-1 text-xs border border-gray-200 py-1.5 rounded-lg hover:bg-gray-50 transition">
                      <MessageCircle className="w-3 h-3" /> Message
                    </Link>
                    {b.status === 'CONFIRMED' && (
                      <button onClick={() => handleCompleteBooking(b.id)}
                        className="flex-1 flex items-center justify-center gap-1 text-xs bg-green-500 text-white py-1.5 rounded-lg hover:bg-green-600 transition">
                        <CheckCircle className="w-3 h-3" /> Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Guide Stats Summary */}
      <div className="mt-6 card p-4">
        <h2 className="font-bold text-gray-900 mb-3">Profile Stats</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-yellow-500">⭐ {stats?.stats?.avgRating?.toFixed(1) || '0.0'}</p>
            <p className="text-xs text-gray-500">{stats?.stats?.totalReviews || 0} reviews</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{stats?.stats?.totalBookings || 0}</p>
            <p className="text-xs text-gray-500">Total tours</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">₹{stats?.earnings?.total?.toFixed(0) || '0'}</p>
            <p className="text-xs text-gray-500">All-time earnings</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Recent Notifications</h2>
            <Link to="/notifications" className="text-xs text-green-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {notifications.map(n => (
              <div key={n.id} className={`card p-3 ${!n.isRead ? 'border-l-4 border-l-green-500' : ''}`}>
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-gray-500">{n.body}</p>
                <p className="text-xs text-gray-400 mt-0.5">{format(new Date(n.createdAt), 'MMM d, h:mm a')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
