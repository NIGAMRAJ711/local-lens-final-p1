import { useState, useEffect } from 'react';
import Layout from '../components/shared/Layout';
import { notificationApi } from '../lib/api';
import { Bell, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationApi.getAll().then(d => { setNotifications(d.notifications || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    await notificationApi.markRead(id).catch(() => {});
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllRead = async () => {
    await Promise.all(notifications.filter(n => !n.isRead).map(n => notificationApi.markRead(n.id)));
    setNotifications(ns => ns.map(n => ({ ...n, isRead: true })));
  };

  const typeIcon = (type) => {
    const icons = { GROUP_TOUR_JOIN: '👥', BOOKING: '📅', PAYMENT: '💳', REVIEW: '⭐', MESSAGE: '💬', SOS: '🚨' };
    return icons[type] || '🔔';
  };

  return (
    <Layout title="Notifications">
      <div className="max-w-2xl mx-auto">
        {notifications.some(n => !n.isRead) && (
          <div className="flex justify-end mb-4">
            <button onClick={markAllRead} className="flex items-center gap-1.5 text-sm text-green-600 hover:underline">
              <CheckCheck className="w-4 h-4" /> Mark all as read
            </button>
          </div>
        )}
        {loading ? (
          <div className="text-center py-16"><div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto"/></div>
        ) : notifications.length === 0 ? (
          <div className="card p-12 text-center text-gray-500">
            <Bell className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No notifications</p>
            <p className="text-sm">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <div key={n.id} onClick={() => !n.isRead && markRead(n.id)}
                className={`card p-4 cursor-pointer hover:shadow-md transition ${!n.isRead ? 'border-l-4 border-l-green-500 bg-green-50/30' : ''}`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{typeIcon(n.type)}</span>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-gray-900">{n.title}</p>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-1.5"/>}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{n.body}</p>
                    <p className="text-xs text-gray-400 mt-1">{format(new Date(n.createdAt), 'MMM d, yyyy • h:mm a')}</p>
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
