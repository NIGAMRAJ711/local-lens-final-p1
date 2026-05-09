import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SOCKET_URL } from '../lib/api';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Use same origin in production, explicit URL in dev
    const url = SOCKET_URL || window.location.origin;

    socketRef.current = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => {
      setConnected(true);
      console.log('Socket connected');
    });
    socketRef.current.on('disconnect', () => setConnected(false));
    socketRef.current.on('connect_error', (err) => {
      console.warn('Socket error:', err.message);
    });
    socketRef.current.on('notification:new', (notif) => {
      if (localStorage.getItem('pushEnabled') === 'true' && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(notif.title || 'LocalLens', { body: notif.body || '', icon: '/favicon.ico' });
      }
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
