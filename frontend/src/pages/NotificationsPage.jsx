import { useState, useEffect } from 'react';
import Layout from '../components/shared/Layout';
import { notificationApi, friendsApi } from '../lib/api';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Bell, CheckCheck, UserPlus, CheckCircle, X } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

function formatTime(dateStr) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday ' + format(d, 'h:mm a');
  return format(d, 'MMM d, h:mm a');
}

const TYPE_ICONS = {
  BOOKING: '📅',
  PAYMENT: '💰',
  REVIEW: '⭐',
  MESSAGE: '💬',
  SOS: '🚨',
  GENERAL: '🔔',
  FOLLOW_REQUEST: '👋',
  FRIEND_REQUEST: '👤',
  GROUP_TOUR_JOIN: '👥',
};

export default function NotificationsPage() {
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    notificationApi.getAll()
      .then(d => { setNotifications(d.notifications || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    await notificationApi.markRead(id).catch(() => {});
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllRead = async () => {
    await Promise.all(notifications.filter(n => !n.isRead).map(n => notificationApi.markRead(n.id)));
    setNotifications(ns => ns.map(n => ({ ...n, isRead: true })));
    toast.success('All notifications marked as read');
  };

  const handleAcceptFollow = async (notif) => {
    const followId = notif.data?.followId;
    if (!followId) return;
    setActionLoading(l => ({ ...l, [notif.id]: 'accepting' }));
    try {
      await friendsApi.acceptRequest(followId);
      markRead(notif.id);
      setNotifications(ns => ns.map(n => n.id === notif.id ? { ...n, isRead: true, actionDone: 'accepted' } : n));
      toast.success('Friend request accepted! 🎉');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(l => ({ ...l, [notif.id]: null }));
    }
  };

  const handleDeclineFollow = async (notif) => {
    const followId = notif.data?.followId;
    if (!followId) return;
    setActionLoading(l => ({ ...l, [notif.id]: 'declining' }));
    try {
      await friendsApi.declineRequest(followId);
      markRead(notif.id);
      setNotifications(ns => ns.map(n => n.id === notif.id ? { ...n, isRead: true, actionDone: 'declined' } : n));
      toast.info('Friend request declined');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(l => ({ ...l, [notif.id]: null }));
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Layout title="Notifications">
      <div className="max-w-2xl mx-auto">
        {/* Header actions */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {unreadCount > 0 ? (
              <span className="font-medium text-gray-800">{unreadCount} unread</span>
            ) : 'All caught up!'}
          </p>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-50 transition">
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="card p-12 text-center text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="font-semibold text-gray-700">No notifications yet</p>
            <p className="text-sm mt-1">We'll notify you about bookings, messages and more</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => !n.isRead && markRead(n.id)}
                className={`card p-4 cursor-pointer transition hover:shadow-md ${
                  !n.isRead ? 'border-l-4 border-l-green-500 bg-green-50/30' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <span className="text-xl mt-0.5 flex-shrink-0">
                    {TYPE_ICONS[n.type] || '🔔'}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-gray-900">{n.title}</p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs text-gray-400">{formatTime(n.createdAt)}</span>
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{n.body}</p>

                    {/* Follow request actions */}
                    {(n.type === 'FOLLOW_REQUEST' || n.type === 'FRIEND_REQUEST') && !n.actionDone && (
                      <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleAcceptFollow(n)}
                          disabled={actionLoading[n.id]}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium"
                        >
                          {actionLoading[n.id] === 'accepting' ? (
                            <div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                          ) : <CheckCircle className="w-3.5 h-3.5" />}
                          Accept
                        </button>
                        <button
                          onClick={() => handleDeclineFollow(n)}
                          disabled={actionLoading[n.id]}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" /> Decline
                        </button>
                      </div>
                    )}

                    {(n.type === 'FOLLOW_REQUEST' || n.type === 'FRIEND_REQUEST') && n.actionDone && (
                      <p className={`text-xs mt-2 font-medium ${n.actionDone === 'accepted' ? 'text-green-600' : 'text-gray-400'}`}>
                        {n.actionDone === 'accepted' ? '✓ Now friends!' : '✗ Request declined'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
