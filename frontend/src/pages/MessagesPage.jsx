import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { chatApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { Send, MessageCircle, Search, CheckCheck, Check, ArrowLeft, User } from 'lucide-react';
import { format, isToday, isYesterday, parseISO, isValid } from 'date-fns';

function fmtTime(d) {
  try {
    const dt = d ? (typeof d === 'string' ? parseISO(d) : new Date(d)) : null;
    if (!dt || !isValid(dt)) return '';
    if (isToday(dt)) return format(dt, 'h:mm a');
    if (isYesterday(dt)) return 'Yesterday';
    return format(dt, 'MMM d');
  } catch { return ''; }
}

function fmtFull(d) {
  try {
    const dt = d ? (typeof d === 'string' ? parseISO(d) : new Date(d)) : null;
    if (!dt || !isValid(dt)) return '';
    return format(dt, 'h:mm a');
  } catch { return ''; }
}

function dateSep(d) {
  try {
    const dt = d ? (typeof d === 'string' ? parseISO(d) : new Date(d)) : null;
    if (!dt || !isValid(dt)) return '';
    if (isToday(dt)) return 'Today';
    if (isYesterday(dt)) return 'Yesterday';
    return format(dt, 'MMMM d, yyyy');
  } catch { return ''; }
}

function sameDay(a, b) {
  try {
    const da = typeof a === 'string' ? parseISO(a) : new Date(a);
    const db = typeof b === 'string' ? parseISO(b) : new Date(b);
    return format(da, 'yyyy-MM-dd') === format(db, 'yyyy-MM-dd');
  } catch { return false; }
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [socketConnected, setSocketConnected] = useState(false);
  const [mobileView, setMobileView] = useState('contacts'); // 'contacts' | 'chat'
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeout = useRef(null);
  const pendingQueue = useRef([]);

  // Load contacts on mount
  useEffect(() => {
    loadContacts();
  }, []);

  // Auto-select contact from ?userId= URL param
  useEffect(() => {
    const targetId = searchParams.get('userId');
    if (targetId && contacts.length > 0) {
      const found = contacts.find(c => c.userId === targetId);
      if (found) {
        openContact(found);
      } else {
        // Contact not in list yet — create a minimal entry
        openContactById(targetId);
      }
    }
  }, [searchParams, contacts.length]);

  // Socket setup
  useEffect(() => {
    if (!socket) return;
    setSocketConnected(socket.connected);

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    const onDM = (msg) => {
      if (activeContact && (msg.senderId === activeContact.userId || msg.receiverId === activeContact.userId)) {
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        scrollToBottom();
        socket.emit('mark_read', { contactId: msg.senderId });
      }
      setContacts(prev => prev.map(c =>
        c.userId === msg.senderId
          ? { ...c, lastMessage: msg.content, lastMessageTime: msg.createdAt, unreadCount: (activeContact?.userId === msg.senderId) ? 0 : (c.unreadCount || 0) + 1 }
          : c
      ));
    };

    const onDMSent = (msg) => {
      // Replace optimistic message with real one
      setMessages(prev => {
        const opt = prev.find(m => m.id?.startsWith('opt_'));
        if (opt) return prev.map(m => m.id?.startsWith('opt_') ? { ...msg, sender: { id: user?.id, fullName: user?.fullName, avatarUrl: user?.avatarUrl } } : m);
        return prev.find(m => m.id === msg.id) ? prev : [...prev, msg];
      });
    };

    const onOnline = ({ userId }) => setOnlineUsers(prev => new Set([...prev, userId]));
    const onOffline = ({ userId }) => setOnlineUsers(prev => { const s = new Set(prev); s.delete(userId); return s; });
    const onRead = ({ by }) => setMessages(prev => prev.map(m => m.senderId === user?.id && m.receiverId === by ? { ...m, isRead: true } : m));
    const onTyping = ({ userId }) => setTypingUsers(prev => new Set([...prev, userId]));
    const onStopTyping = ({ userId }) => setTypingUsers(prev => { const s = new Set(prev); s.delete(userId); return s; });

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('direct_message', onDM);
    socket.on('direct_message_sent', onDMSent);
    socket.on('user_online', onOnline);
    socket.on('user_offline', onOffline);
    socket.on('messages_read', onRead);
    socket.on('contact_typing', onTyping);
    socket.on('contact_stop_typing', onStopTyping);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('direct_message', onDM);
      socket.off('direct_message_sent', onDMSent);
      socket.off('user_online', onOnline);
      socket.off('user_offline', onOffline);
      socket.off('messages_read', onRead);
      socket.off('contact_typing', onTyping);
      socket.off('contact_stop_typing', onStopTyping);
    };
  }, [socket, activeContact, user]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const loadContacts = async () => {
    setLoading(true);
    try {
      const data = await chatApi.getContacts();
      setContacts(data.contacts || []);
    } catch { setContacts([]); }
    finally { setLoading(false); }
  };

  const openContact = async (contact) => {
    setActiveContact(contact);
    setMobileView('chat');
    setMsgsLoading(true);
    try {
      const data = await chatApi.getConversation(contact.userId);
      setMessages(data.messages || []);
      // Mark read
      setContacts(prev => prev.map(c => c.userId === contact.userId ? { ...c, unreadCount: 0 } : c));
      if (socket) socket.emit('mark_read', { contactId: contact.userId });
    } catch { setMessages([]); }
    finally { setMsgsLoading(false); scrollToBottom(); }
    inputRef.current?.focus();
  };

  const openContactById = async (userId) => {
    try {
      const data = await chatApi.getConversation(userId);
      // Find user info from first message or fetch
      const msgs = data.messages || [];
      const other = msgs.find(m => m.senderId === userId)?.sender || msgs.find(m => m.receiverId === userId)?.receiver;
      const contact = { userId, fullName: other?.fullName || 'User', avatarUrl: other?.avatarUrl || null, unreadCount: 0 };
      setActiveContact(contact);
      setMessages(msgs);
      setMobileView('chat');
    } catch {}
  };

  const handleInput = (val) => {
    setNewMsg(val);
    if (!socket || !activeContact) return;
    socket.emit('typing', { receiverId: activeContact.userId });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('stop_typing', { receiverId: activeContact.userId });
    }, 1200);
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    const content = newMsg.trim();
    if (!content || !activeContact || sending) return;
    setNewMsg('');
    setSending(true);
    if (socket) socket.emit('stop_typing', { receiverId: activeContact.userId });

    const optimistic = {
      id: `opt_${Date.now()}`,
      senderId: user?.id,
      receiverId: activeContact.userId,
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
      sender: { id: user?.id, fullName: user?.fullName, avatarUrl: user?.avatarUrl },
    };
    setMessages(prev => [...prev, optimistic]);
    scrollToBottom();

    // Update contacts list
    setContacts(prev => prev.map(c =>
      c.userId === activeContact.userId
        ? { ...c, lastMessage: content, lastMessageTime: optimistic.createdAt, lastSenderId: user?.id }
        : c
    ));

    try {
      if (socket?.connected) {
        socket.emit('send_direct_message', { receiverId: activeContact.userId, content });
      } else {
        const data = await chatApi.sendDirect(activeContact.userId, content);
        setMessages(prev => prev.map(m => m.id === optimistic.id ? { ...data.message, sender: { id: user?.id, fullName: user?.fullName, avatarUrl: user?.avatarUrl } } : m));
      }
    } catch (err) {
      toast.error('Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const filtered = contacts.filter(c =>
    !searchQ || c.fullName?.toLowerCase().includes(searchQ.toLowerCase())
  );

  const isOnline = (uid) => onlineUsers.has(uid);
  const isTyping = (uid) => typingUsers.has(uid);

  const ContactRow = ({ c }) => {
    const selected = activeContact?.userId === c.userId;
    return (
      <button onClick={() => openContact(c)}
        className={`w-full px-4 py-3 flex items-center gap-3 text-left transition hover:bg-gray-50 ${selected ? 'bg-green-50 border-r-2 border-green-500' : ''}`}>
        {/* Avatar + online dot */}
        <div className="relative flex-shrink-0">
          {c.avatarUrl ? (
            <img src={c.avatarUrl} className="w-11 h-11 rounded-full object-cover" alt="" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-sm font-bold text-white">
              {c.fullName?.[0] || '?'}
            </div>
          )}
          {isOnline(c.userId) && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className={`text-sm truncate ${c.unreadCount > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>{c.fullName}</p>
            {c.lastMessageTime && <p className={`text-xs flex-shrink-0 ml-1 ${c.unreadCount > 0 ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>{fmtTime(c.lastMessageTime)}</p>}
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <p className={`text-xs truncate ${c.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
              {c.lastSenderId === user?.id && <CheckCheck className="w-3 h-3 inline mr-0.5 text-green-500" />}
              {c.lastMessage || (c.city ? `📍 ${c.city}` : 'Start a conversation')}
            </p>
            {c.unreadCount > 0 && (
              <span className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 ml-1 font-bold">
                {c.unreadCount > 9 ? '9+' : c.unreadCount}
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <Layout title="Messages">
      {!socketConnected && (
        <div className="mb-2 text-center text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg py-1.5 px-3">
          Connecting to real-time server... Messages still load from database.
        </div>
      )}

      <div className="flex h-[calc(100vh-160px)] min-h-[500px] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* ── Left: Contacts ─────────────────────────── */}
        <div className={`w-full md:w-80 flex-shrink-0 border-r border-gray-100 flex flex-col ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 mb-3 text-base">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="input-field pl-9 text-sm py-2" placeholder="Search contacts..."
                value={searchQ} onChange={e => setSearchQ(e.target.value)} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <MessageCircle className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm font-medium">No contacts yet</p>
                <p className="text-xs mt-1 text-gray-400">Add friends or book a guide to chat</p>
              </div>
            ) : (
              filtered.map(c => <ContactRow key={c.userId} c={c} />)
            )}
          </div>
        </div>

        {/* ── Right: Chat window ────────────────────── */}
        <div className={`flex-1 flex flex-col ${mobileView === 'contacts' ? 'hidden md:flex' : 'flex'}`}>
          {!activeContact ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageCircle className="w-14 h-14 mx-auto mb-3 text-gray-200" />
                <p className="font-semibold text-gray-700">Select a conversation</p>
                <p className="text-sm text-gray-400 mt-1">Choose a contact to start chatting</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-white shadow-sm">
                {/* Mobile back */}
                <button className="md:hidden p-1 -ml-1 text-gray-500" onClick={() => setMobileView('contacts')}>
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative flex-shrink-0">
                  {activeContact.avatarUrl ? (
                    <img src={activeContact.avatarUrl} className="w-10 h-10 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-sm font-bold text-white">
                      {activeContact.fullName?.[0]}
                    </div>
                  )}
                  {isOnline(activeContact.userId) && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{activeContact.fullName}</p>
                  <p className={`text-xs ${isOnline(activeContact.userId) ? 'text-green-600' : 'text-gray-400'}`}>
                    {isTyping(activeContact.userId) ? (
                      <span className="text-green-500 animate-pulse">typing...</span>
                    ) : isOnline(activeContact.userId) ? 'Online' : 'Last seen recently'}
                  </p>
                </div>
                <Link to={activeContact.role === 'GUIDE' || activeContact.role === 'BOTH'
                  ? `/users/${activeContact.userId}`
                  : `/users/${activeContact.userId}`}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-green-600 transition" title="View profile">
                  <User className="w-5 h-5" />
                </Link>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" style={{ background: '#f8fafc' }}>
                {msgsLoading ? (
                  <div className="flex justify-center pt-8">
                    <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm pt-12">
                    <MessageCircle className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                    <p>No messages yet. Say hello! 👋</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = msg.senderId === user?.id;
                    const showSep = idx === 0 || !sameDay(messages[idx - 1].createdAt, msg.createdAt);
                    const avatar = !isMe && (activeContact.avatarUrl || null);
                    return (
                      <div key={msg.id}>
                        {showSep && (
                          <div className="flex items-center gap-2 my-4">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200">{dateSep(msg.createdAt)}</span>
                            <div className="flex-1 h-px bg-gray-200" />
                          </div>
                        )}
                        <div className={`flex items-end gap-1.5 ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                          {/* Received: avatar */}
                          {!isMe && (
                            avatar ? (
                              <img src={avatar} className="w-7 h-7 rounded-full object-cover flex-shrink-0 mb-0.5" alt="" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0 mb-0.5">
                                {activeContact.fullName?.[0]}
                              </div>
                            )
                          )}

                          <div className={`flex flex-col max-w-[72%] ${isMe ? 'items-end' : 'items-start'}`}>
                            {/* Bubble */}
                            <div className={`px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                              isMe
                                ? 'bg-green-500 text-white rounded-2xl rounded-br-sm'
                                : 'bg-white text-gray-800 rounded-2xl rounded-bl-sm border border-gray-100'
                            }`}>
                              {msg.content}
                            </div>
                            {/* Time + read receipt */}
                            <div className={`flex items-center gap-0.5 mt-0.5 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                              <span className="text-[10px] text-gray-400">{fmtFull(msg.createdAt)}</span>
                              {isMe && (
                                msg.isRead
                                  ? <CheckCheck className="w-3 h-3 text-green-500" />
                                  : <Check className="w-3 h-3 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input bar */}
              <div className="px-4 py-3 border-t border-gray-100 bg-white">
                <form onSubmit={sendMessage} className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-400 transition"
                    placeholder="Type a message..."
                    value={newMsg}
                    onChange={e => handleInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) sendMessage(e); }}
                  />
                  <button type="submit" disabled={!newMsg.trim() || sending}
                    className="w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center disabled:opacity-40 transition flex-shrink-0 shadow-sm">
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
