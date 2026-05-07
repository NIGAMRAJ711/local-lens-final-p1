import { useState, useEffect, useRef } from 'react';
import Layout from '../components/shared/Layout';
import { chatApi } from '../lib/api';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { Send, MessageCircle, Search, CheckCheck } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

function formatMsgTime(dateStr) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const toast = useToast();
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { loadConversations(); }, []);

  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv.booking.id);
      socket?.emit('chat:join', { bookingId: selectedConv.booking.id });
    }
  }, [selectedConv?.booking?.id]);

  useEffect(() => {
    if (!socket) return;
    const handleNew = (msg) => {
      // Add to messages if in current conversation
      if (msg.bookingId === selectedConv?.booking?.id) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        scrollToBottom();
        // Mark as read immediately since we're viewing
        socket.emit('chat:mark-read', { bookingId: msg.bookingId });
      }
      // Update conversation list last message
      setConversations(prev => prev.map(c =>
        c.booking.id === msg.bookingId
          ? { ...c, lastMessage: msg, unreadCount: msg.senderId !== user?.id && c.booking.id !== selectedConv?.booking?.id ? (c.unreadCount || 0) + 1 : 0 }
          : c
      ));
    };
    socket.on('chat:new-message', handleNew);
    return () => socket.off('chat:new-message', handleNew);
  }, [socket, selectedConv, user]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const data = await api.get('/chat/conversations/all');
      setConversations(data.conversations || []);
    } catch {
      // Fallback: load from bookings
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (bookingId) => {
    try {
      const data = await chatApi.getMessages(bookingId);
      setMessages(data.messages || []);
      scrollToBottom();
    } catch { setMessages([]); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !selectedConv || sending) return;
    const content = newMsg.trim();
    setNewMsg('');
    setSending(true);

    const receiverId = selectedConv.otherUser?.id;

    // Optimistic update
    const optimistic = {
      id: `opt_${Date.now()}`,
      bookingId: selectedConv.booking.id,
      senderId: user?.id,
      receiverId,
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
      sender: { id: user?.id, fullName: user?.fullName, avatarUrl: user?.avatarUrl },
    };
    setMessages(prev => [...prev, optimistic]);
    scrollToBottom();

    try {
      if (socket?.connected) {
        // Send via socket (also saves to DB)
        socket.emit('chat:message', { bookingId: selectedConv.booking.id, receiverId, content });
      } else {
        // Fallback: send via HTTP API
        const data = await chatApi.send(selectedConv.booking.id, content, receiverId);
        // Replace optimistic with real
        setMessages(prev => prev.map(m => m.id === optimistic.id ? data.message : m));
      }
      // Update conversations list
      setConversations(prev => prev.map(c =>
        c.booking.id === selectedConv.booking.id
          ? { ...c, lastMessage: optimistic }
          : c
      ));
    } catch (err) {
      toast.error('Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const filteredConvs = conversations.filter(c =>
    !searchQ || c.otherUser?.fullName?.toLowerCase().includes(searchQ.toLowerCase())
  );

  const getOtherUser = (conv) => conv.otherUser;

  return (
    <Layout title="Messages">
      <div className="flex gap-0 h-[calc(100vh-160px)] min-h-[500px] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Left: Conversations */}
        <div className="w-80 flex-shrink-0 border-r border-gray-100 flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="input-field pl-9 text-sm py-2" placeholder="Search conversations..."
                value={searchQ} onChange={e => setSearchQ(e.target.value)} />
            </div>
          </div>

          {/* Conversations list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full" />
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <MessageCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-medium">No conversations</p>
                <p className="text-xs mt-1">Book a guide to start chatting</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredConvs.map(conv => {
                  const other = getOtherUser(conv);
                  const isSelected = selectedConv?.booking?.id === conv.booking.id;
                  return (
                    <button key={conv.booking.id} onClick={() => setSelectedConv(conv)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition flex items-center gap-3 ${isSelected ? 'bg-green-50 border-r-2 border-r-green-500' : ''}`}>
                      {/* Avatar */}
                      {other?.avatarUrl ? (
                        <img src={other.avatarUrl} className="w-11 h-11 rounded-full object-cover flex-shrink-0" alt="" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                          {other?.fullName?.[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm text-gray-900 truncate">{other?.fullName}</p>
                          {conv.lastMessage && (
                            <p className="text-xs text-gray-400 flex-shrink-0 ml-1">
                              {formatMsgTime(conv.lastMessage.createdAt)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-gray-500 truncate">
                            {conv.lastMessage ? (
                              <>
                                {conv.lastMessage.senderId === user?.id && <span className="text-green-500 mr-1"><CheckCheck className="w-3 h-3 inline" /></span>}
                                {conv.lastMessage.content}
                              </>
                            ) : (
                              <span className="text-gray-400 italic">
                                {format(new Date(conv.booking.date || new Date()), 'MMM d')} · {conv.booking.duration?.replace(/_/g, ' ')}
                              </span>
                            )}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 ml-1 font-bold">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full mt-1 ${
                          conv.booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                          conv.booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          conv.booking.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>{conv.booking.status}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Chat window */}
        <div className="flex-1 flex flex-col">
          {!selectedConv ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageCircle className="w-14 h-14 mx-auto mb-3 text-gray-200" />
                <p className="font-semibold text-gray-700">Select a conversation</p>
                <p className="text-sm text-gray-400 mt-1">Click a booking to start chatting</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-white">
                {getOtherUser(selectedConv)?.avatarUrl ? (
                  <img src={getOtherUser(selectedConv).avatarUrl} className="w-10 h-10 rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-sm font-bold text-white">
                    {getOtherUser(selectedConv)?.fullName?.[0]}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm text-gray-900">{getOtherUser(selectedConv)?.fullName}</p>
                  <p className="text-xs text-gray-500">
                    Booking: {selectedConv.booking.date} · {selectedConv.booking.duration?.replace(/_/g, ' ')}
                  </p>
                </div>
                <div className="ml-auto">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    selectedConv.booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                    selectedConv.booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{selectedConv.booking.status}</span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
                {messages.length === 0 && (
                  <div className="text-center text-gray-400 text-sm py-12">
                    <MessageCircle className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                    <p>No messages yet. Say hello! 👋</p>
                  </div>
                )}
                {messages.map((msg, idx) => {
                  const isMe = msg.senderId === user?.id;
                  const showDate = idx === 0 || format(new Date(messages[idx-1].createdAt), 'yyyy-MM-dd') !== format(new Date(msg.createdAt), 'yyyy-MM-dd');
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="text-center text-xs text-gray-400 my-3">
                          {isToday(new Date(msg.createdAt)) ? 'Today' : isYesterday(new Date(msg.createdAt)) ? 'Yesterday' : format(new Date(msg.createdAt), 'MMMM d, yyyy')}
                        </div>
                      )}
                      <div className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        {!isMe && (
                          msg.sender?.avatarUrl ? (
                            <img src={msg.sender.avatarUrl} className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-1" alt="" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0 mt-1">
                              {msg.sender?.fullName?.[0]}
                            </div>
                          )
                        )}
                        <div className={`flex flex-col gap-0.5 max-w-xs ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                            isMe ? 'bg-green-600 text-white rounded-tr-sm' : 'bg-white text-gray-800 rounded-tl-sm'
                          }`}>
                            {msg.content}
                          </div>
                          <div className="flex items-center gap-1 px-1">
                            <p className="text-xs text-gray-400">{format(new Date(msg.createdAt), 'h:mm a')}</p>
                            {isMe && <CheckCheck className={`w-3 h-3 ${msg.isRead ? 'text-green-500' : 'text-gray-400'}`} />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-100 bg-white">
                <form onSubmit={sendMessage} className="flex gap-2">
                  <input
                    ref={inputRef}
                    className="input-field flex-1 text-sm"
                    placeholder="Type a message..."
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) sendMessage(e); }}
                  />
                  <button type="submit" disabled={!newMsg.trim() || sending}
                    className="bg-green-600 text-white p-2.5 rounded-xl hover:bg-green-700 disabled:opacity-40 transition flex-shrink-0">
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
