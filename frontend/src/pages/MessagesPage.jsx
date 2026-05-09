import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import { chatApi } from '../lib/api';
import { Search, Send, ArrowLeft, User, Circle, MessageCircle, Wifi, WifiOff } from 'lucide-react';
import { format, isToday, isYesterday, parseISO, isValid } from 'date-fns';

function formatMsgTime(ts) {
  if (!ts) return '';
  try {
    const d = typeof ts === 'string' ? parseISO(ts) : new Date(ts);
    if (!isValid(d)) return '';
    if (isToday(d)) return format(d, 'h:mm a');
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMM d');
  } catch { return ''; }
}

function formatFullTime(ts) {
  if (!ts) return '';
  try {
    const d = typeof ts === 'string' ? parseISO(ts) : new Date(ts);
    if (!isValid(d)) return '';
    return format(d, 'h:mm a');
  } catch { return ''; }
}

function dateSeparator(ts) {
  if (!ts) return null;
  try {
    const d = typeof ts === 'string' ? parseISO(ts) : new Date(ts);
    if (!isValid(d)) return null;
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'EEEE, MMM d yyyy');
  } catch { return null; }
}

function Avatar({ url, name, size = 40, online = false }) {
  const initials = (name || '?')[0].toUpperCase();
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {url ? (
        <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: size, height: size, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: size * 0.38 }}>
          {initials}
        </div>
      )}
      {online && (
        <div style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: '#22c55e', border: '2px solid white' }} />
      )}
    </div>
  );
}

export default function MessagesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { socket } = useSocket();
  const [searchParams] = useSearchParams();

  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [socketConnected, setSocketConnected] = useState(false);
  const [mobileView, setMobileView] = useState('contacts'); // 'contacts' | 'chat'

  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const pendingQueueRef = useRef([]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  // Load contacts on mount
  useEffect(() => {
    chatApi.getContacts()
      .then(d => setContacts(d.contacts || []))
      .catch(() => {})
      .finally(() => setContactsLoading(false));
  }, []);

  // Handle ?userId= URL param — auto-open contact
  useEffect(() => {
    const urlUserId = searchParams.get('userId');
    if (!urlUserId || contacts.length === 0) return;
    const found = contacts.find(c => c.userId === urlUserId);
    if (found) {
      openContact(found);
    } else {
      // Contact not in list yet — fetch their info
      import('../lib/api').then(({ api }) => {
        api.get(`/users/${urlUserId}`).then(u => {
          if (u) {
            const synthetic = { userId: u.id, fullName: u.fullName, avatarUrl: u.avatarUrl, role: u.role, lastMessage: null, unreadCount: 0 };
            setContacts(prev => [synthetic, ...prev.filter(c => c.userId !== u.id)]);
            openContact(synthetic);
          }
        }).catch(() => {});
      });
    }
  }, [searchParams, contacts.length]);

  // Socket setup
  useEffect(() => {
    if (!socket) return;
    setSocketConnected(socket.connected);

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    const onDirectMessage = (msg) => {
      const senderId = msg.senderId || msg.sender_id;
      const content = msg.content;

      // If this is from the active contact → append immediately
      setActiveContact(prev => {
        if (prev?.userId === senderId) {
          setMessages(m => [...m, { ...msg, senderId, content }]);
          socket.emit('mark_read', { contactId: senderId });
          scrollToBottom();
        }
        return prev;
      });

      // Update contacts list unread / last message
      setContacts(prev => prev.map(c =>
        c.userId === senderId
          ? { ...c, lastMessage: content, lastMessageTime: msg.createdAt || msg.created_at, unreadCount: c.unreadCount + 1 }
          : c
      ));
    };

    const onSent = (msg) => {
      // Replace optimistic message with confirmed one
      setMessages(prev => prev.map(m => m._optimistic ? { ...msg, senderId: user.id } : m).filter((m, i, arr) => !m._optimistic || i === arr.findIndex(x => x._optimistic)));
      scrollToBottom();
    };

    const onOnline = ({ userId }) => setOnlineUsers(s => new Set([...s, userId]));
    const onOffline = ({ userId }) => setOnlineUsers(s => { const n = new Set(s); n.delete(userId); return n; });
    const onTyping = ({ userId: uid }) => { setTypingUsers(s => new Set([...s, uid])); };
    const onStopTyping = ({ userId: uid }) => setTypingUsers(s => { const n = new Set(s); n.delete(uid); return n; });
    const onRead = ({ by }) => setMessages(prev => prev.map(m => m.senderId === user?.id ? { ...m, isRead: true } : m));

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('direct_message', onDirectMessage);
    socket.on('direct_message_sent', onSent);
    socket.on('user_online', onOnline);
    socket.on('user_offline', onOffline);
    socket.on('user_typing', onTyping);
    socket.on('user_stop_typing', onStopTyping);
    socket.on('messages_read', onRead);

    // Flush pending queue if reconnected
    socket.on('connect', () => {
      pendingQueueRef.current.forEach(({ receiverId, content }) => {
        socket.emit('send_direct_message', { receiverId, content });
      });
      pendingQueueRef.current = [];
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('direct_message', onDirectMessage);
      socket.off('direct_message_sent', onSent);
      socket.off('user_online', onOnline);
      socket.off('user_offline', onOffline);
      socket.off('user_typing', onTyping);
      socket.off('user_stop_typing', onStopTyping);
      socket.off('messages_read', onRead);
    };
  }, [socket, user, scrollToBottom]);

  const openContact = async (contact) => {
    setActiveContact(contact);
    setMobileView('chat');
    setMsgsLoading(true);
    setMessages([]);
    // Clear unread badge
    setContacts(prev => prev.map(c => c.userId === contact.userId ? { ...c, unreadCount: 0 } : c));
    try {
      const data = await chatApi.getConversation(contact.userId);
      const msgs = (data.messages || []).map(m => ({
        ...m,
        senderId: m.senderId || m.sender_id,
        content: m.content,
        createdAt: m.createdAt || m.created_at,
        isRead: m.isRead || m.is_read,
      }));
      setMessages(msgs);
      scrollToBottom();
    } catch { toast.error('Could not load messages'); }
    finally { setMsgsLoading(false); }
  };

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || !activeContact || sending) return;
    setInput('');
    setSending(true);

    // Optimistic message
    const optimistic = { _optimistic: true, id: `opt_${Date.now()}`, senderId: user.id, receiverId: activeContact.userId, content, createdAt: new Date().toISOString(), isRead: false };
    setMessages(prev => [...prev, optimistic]);
    scrollToBottom();

    // Update contacts list
    setContacts(prev => prev.map(c => c.userId === activeContact.userId ? { ...c, lastMessage: content, lastMessageTime: new Date().toISOString() } : c));

    try {
      if (socket?.connected) {
        socket.emit('send_direct_message', { receiverId: activeContact.userId, content });
      } else {
        // HTTP fallback when socket offline
        const data = await chatApi.sendDirect(activeContact.userId, content);
        setMessages(prev => prev.map(m => m._optimistic ? { ...data.message, senderId: user.id } : m));
      }
    } catch (err) {
      // Queue for retry
      pendingQueueRef.current.push({ receiverId: activeContact.userId, content });
      toast.warning('Offline', 'Message will send when reconnected');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); return; }
    // Typing indicator
    if (socket?.connected && activeContact) {
      socket.emit('typing', { receiverId: activeContact.userId });
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => socket.emit('stop_typing', { receiverId: activeContact.userId }), 1000);
    }
  };

  const filteredContacts = contacts.filter(c =>
    !search || c.fullName?.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0) || new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0));

  const isOnline = (uid) => onlineUsers.has(uid);
  const isTyping = (uid) => typingUsers.has(uid);

  // Group messages with date separators
  const groupedMessages = [];
  let lastDate = null;
  messages.forEach((msg, i) => {
    const label = dateSeparator(msg.createdAt);
    if (label && label !== lastDate) {
      groupedMessages.push({ type: 'separator', label, key: `sep_${i}` });
      lastDate = label;
    }
    groupedMessages.push({ type: 'message', msg, key: msg.id || `msg_${i}` });
  });

  const totalUnread = contacts.reduce((s, c) => s + (c.unreadCount || 0), 0);

  return (
    <div className="flex h-[calc(100vh-57px)] bg-gray-50 overflow-hidden">

      {/* ── Contacts Panel ──────────────────────────────────────── */}
      <div className={`${mobileView === 'chat' ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 flex-shrink-0`}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">
              Messages {totalUnread > 0 && <span className="ml-1.5 bg-green-500 text-white text-xs rounded-full px-2 py-0.5">{totalUnread}</span>}
            </h2>
            {/* Socket status */}
            <div className={`flex items-center gap-1 text-xs ${socketConnected ? 'text-green-600' : 'text-gray-400'}`}>
              {socketConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {socketConnected ? 'Live' : 'Offline'}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="Search contacts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Contacts list */}
        <div className="flex-1 overflow-y-auto">
          {contactsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-3 border-green-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageCircle className="w-10 h-10 mx-auto text-gray-200 mb-3" />
              <p className="font-medium text-gray-700">No conversations yet</p>
              <p className="text-sm text-gray-400 mt-1">Add friends or book a guide to start chatting</p>
              <Link to="/explore" className="mt-3 inline-block text-sm text-green-600 font-medium hover:underline">Explore Guides →</Link>
            </div>
          ) : (
            filteredContacts.map(contact => (
              <button
                key={contact.userId}
                onClick={() => openContact(contact)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition text-left border-b border-gray-50 ${activeContact?.userId === contact.userId ? 'bg-green-50 border-l-4 border-l-green-500' : ''}`}
              >
                <Avatar url={contact.avatarUrl} name={contact.fullName} size={46} online={isOnline(contact.userId)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-gray-900 text-sm truncate">{contact.fullName}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatMsgTime(contact.lastMessageTime)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500 truncate flex-1">
                      {contact.lastMessage || <span className="italic text-gray-400">Say hello 👋</span>}
                    </p>
                    {contact.unreadCount > 0 && (
                      <span className="ml-2 flex-shrink-0 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {contact.unreadCount > 9 ? '9+' : contact.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Chat Panel ──────────────────────────────────────────── */}
      <div className={`${mobileView === 'contacts' ? 'hidden' : 'flex'} md:flex flex-col flex-1 min-w-0`}>
        {!activeContact ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 bg-gray-50">
            <MessageCircle className="w-16 h-16 text-gray-200 mb-4" />
            <p className="text-lg font-semibold text-gray-600">Select a conversation</p>
            <p className="text-sm mt-1">Choose a contact from the left to start chatting</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
              {/* Back button — mobile only */}
              <button onClick={() => setMobileView('contacts')} className="md:hidden p-1 -ml-1 rounded-lg hover:bg-gray-100">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <Avatar url={activeContact.avatarUrl} name={activeContact.fullName} size={40} online={isOnline(activeContact.userId)} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{activeContact.fullName}</p>
                <p className={`text-xs ${isOnline(activeContact.userId) ? 'text-green-600' : 'text-gray-400'}`}>
                  {isTyping(activeContact.userId) ? (
                    <span className="text-green-600">typing...</span>
                  ) : isOnline(activeContact.userId) ? 'Online' : 'Last seen recently'}
                </p>
              </div>
              <Link to={`/users/${activeContact.userId}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-green-600 border border-gray-200 px-3 py-1.5 rounded-lg transition">
                <User className="w-3.5 h-3.5" /> Profile
              </Link>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-0 py-4 bg-gray-50" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #e5e7eb 1px, transparent 0)', backgroundSize: '24px 24px' }}>
              {msgsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <Avatar url={activeContact.avatarUrl} name={activeContact.fullName} size={64} />
                  <p className="font-semibold text-gray-700 mt-3">{activeContact.fullName}</p>
                  <p className="text-sm text-gray-400 mt-1">Start the conversation 👋</p>
                </div>
              ) : (
                <>
                  {groupedMessages.map(item => {
                    if (item.type === 'separator') {
                      return (
                        <div key={item.key} className="flex items-center gap-3 px-6 my-3">
                          <div className="flex-1 h-px bg-gray-200" />
                          <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2">{item.label}</span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>
                      );
                    }
                    const { msg } = item;
                    const isMine = (msg.senderId || msg.sender_id) === user?.id;
                    return (
                      <div key={item.key} className={`flex items-end gap-2 mb-1 px-4 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        {!isMine && <Avatar url={activeContact.avatarUrl} name={activeContact.fullName} size={28} />}
                        <div style={{
                          maxWidth: '70%',
                          background: isMine ? '#dcfce7' : 'white',
                          color: isMine ? '#14532d' : '#111',
                          padding: '8px 12px',
                          borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          fontSize: 14,
                          lineHeight: 1.45,
                          border: isMine ? 'none' : '0.5px solid #e5e7eb',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                          opacity: msg._optimistic ? 0.7 : 1,
                        }}>
                          <p style={{ margin: 0, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                          <div style={{ fontSize: 10, color: isMine ? '#16a34a' : '#9ca3af', textAlign: 'right', marginTop: 3, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                            {formatFullTime(msg.createdAt || msg.created_at)}
                            {isMine && <span style={{ color: (msg.isRead || msg.is_read) ? '#3b82f6' : '#16a34a' }}>{(msg.isRead || msg.is_read) ? '✓✓' : '✓'}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {isTyping(activeContact.userId) && (
                    <div className="flex items-end gap-2 px-4 mb-1">
                      <Avatar url={activeContact.avatarUrl} name={activeContact.fullName} size={28} />
                      <div style={{ background: 'white', border: '0.5px solid #e5e7eb', padding: '10px 14px', borderRadius: '16px 16px 16px 4px', fontSize: 18, letterSpacing: 2 }}>
                        <span className="animate-pulse">•••</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input bar */}
            <div className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0">
              {!socketConnected && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5 mb-2">
                  <WifiOff className="w-3.5 h-3.5" />
                  Offline — messages will send when reconnected
                </div>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
                  placeholder="Type a message..."
                  rows={1}
                  value={input}
                  onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                  onKeyDown={handleKeyDown}
                  style={{ maxHeight: 120 }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="w-11 h-11 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 text-white rounded-2xl flex items-center justify-center transition flex-shrink-0"
                >
                  {sending
                    ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    : <Send className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
