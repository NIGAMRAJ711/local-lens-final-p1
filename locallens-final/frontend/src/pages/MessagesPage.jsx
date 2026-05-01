import { useState, useEffect, useRef } from 'react';
import Layout from '../components/shared/Layout';
import { bookingApi, chatApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Send, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function MessagesPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMsg, setSendingMsg] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    if (selectedBooking) {
      loadMessages(selectedBooking.id);
      socket?.emit('chat:join', { bookingId: selectedBooking.id });
    }
  }, [selectedBooking]);

  useEffect(() => {
    if (!socket) return;
    socket.on('chat:new-message', (msg) => {
      setMessages(prev => [...prev, msg]);
      scrollToBottom();
    });
    return () => socket.off('chat:new-message');
  }, [socket]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadBookings = async () => {
    try {
      const isGuide = user?.role === 'GUIDE' || user?.role === 'BOTH';
      const [travelerBookings, guideBookings] = await Promise.all([
        bookingApi.getMyBookings({ role: 'traveler' }).catch(() => ({ bookings: [] })),
        isGuide ? bookingApi.getMyBookings({ role: 'guide' }).catch(() => ({ bookings: [] })) : Promise.resolve({ bookings: [] }),
      ]);
      const all = [...(travelerBookings.bookings || []), ...(guideBookings.bookings || [])];
      // Deduplicate
      const unique = Array.from(new Map(all.map(b => [b.id, b])).values());
      setBookings(unique.filter(b => b.status !== 'CANCELLED'));
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (bookingId) => {
    try {
      const data = await chatApi.getMessages(bookingId);
      setMessages(data.messages || []);
      socket?.emit('chat:mark-read', { bookingId });
    } catch { setMessages([]); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !selectedBooking) return;
    setSendingMsg(true);
    const content = newMsg.trim();
    setNewMsg('');
    
    // Determine receiver
    const isGuideInBooking = user?.id === selectedBooking.guideId;
    const receiverId = isGuideInBooking ? selectedBooking.travelerId : selectedBooking.guideId;

    if (socket?.connected) {
      socket.emit('chat:message', { bookingId: selectedBooking.id, receiverId, content });
    } else {
      // Fallback: optimistic update
      setMessages(prev => [...prev, {
        id: Date.now().toString(), content, senderId: user?.id,
        sender: { fullName: user?.fullName, avatarUrl: user?.avatarUrl },
        createdAt: new Date().toISOString(),
      }]);
    }
    setSendingMsg(false);
  };

  const getOtherPerson = (booking) => {
    if (user?.id === booking.guideId) return booking.traveler;
    return booking.guide;
  };

  return (
    <Layout title="Messages">
      <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[400px]">
        {/* Conversations List */}
        <div className="w-72 flex-shrink-0">
          <div className="card h-full overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center"><div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto"/></div>
            ) : bookings.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300"/>
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-1">Book a guide to start chatting</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {bookings.map(b => {
                  const other = getOtherPerson(b);
                  const isSelected = selectedBooking?.id === b.id;
                  return (
                    <button key={b.id} onClick={() => setSelectedBooking(b)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition ${isSelected ? 'bg-green-50 border-r-2 border-r-green-500' : ''}`}>
                      <div className="flex items-center gap-3">
                        {other?.avatarUrl ? (
                          <img src={other.avatarUrl} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0">
                            {other?.fullName?.[0]}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">{other?.fullName}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {format(new Date(b.date), 'MMM d')} • {b.duration?.replace(/_/g, ' ')}
                          </p>
                          <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full mt-0.5 ${
                            b.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                            b.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                            b.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{b.status}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="flex-1 card flex flex-col overflow-hidden">
          {!selectedBooking ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">Select a conversation</p>
                <p className="text-sm">Choose a booking from the left to start chatting</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                {getOtherPerson(selectedBooking)?.avatarUrl ? (
                  <img src={getOtherPerson(selectedBooking).avatarUrl} className="w-9 h-9 rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                    {getOtherPerson(selectedBooking)?.fullName?.[0]}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm">{getOtherPerson(selectedBooking)?.fullName}</p>
                  <p className="text-xs text-gray-500">Booking: {format(new Date(selectedBooking.date), 'MMM d, yyyy')}</p>
                </div>
                <div className="ml-auto">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${selectedBooking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {selectedBooking.status}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center text-gray-400 text-sm py-8">
                    No messages yet. Say hello! 👋
                  </div>
                )}
                {messages.map(msg => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                      {!isMe && (msg.sender?.avatarUrl ? (
                        <img src={msg.sender.avatarUrl} className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-1" alt="" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0 mt-1">
                          {msg.sender?.fullName?.[0]}
                        </div>
                      ))}
                      <div className={`max-w-xs ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-green-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                          {msg.content}
                        </div>
                        <p className="text-xs text-gray-400 px-1">
                          {format(new Date(msg.createdAt), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-100">
                <form onSubmit={sendMessage} className="flex gap-2">
                  <input
                    className="input-field flex-1"
                    placeholder="Type a message..."
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                  />
                  <button type="submit" disabled={!newMsg.trim() || sendingMsg}
                    className="btn-primary px-4 flex items-center gap-2">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
