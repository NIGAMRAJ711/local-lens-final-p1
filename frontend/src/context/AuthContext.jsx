import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, userApi } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setLoading(false); return; }
    try {
      const data = await userApi.getMe();
      setUser(data.user);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    if (data?.error) throw new Error(data.error);
    if (!data?.accessToken) throw new Error('Login failed — no token received');
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    if (data.user?.avatarUrl) localStorage.setItem('userAvatarUrl', data.user.avatarUrl);
    setUser(data.user);
    return data.user;
  };

  const register = async (formData) => {
    const data = await authApi.register(formData);
    if (data?.error) throw new Error(data.error);
    if (!data?.accessToken) throw new Error('Registration failed');
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    if (data.user?.avatarUrl) localStorage.setItem('userAvatarUrl', data.user.avatarUrl);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  const switchRole = async (role) => {
    const data = await userApi.switchRole(role);
    setUser(prev => prev ? { ...prev, role: data.user.role } : null);
    return data;
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    try {
      const data = await userApi.getMe();
      if (data.user?.avatarUrl) localStorage.setItem('userAvatarUrl', data.user.avatarUrl);
      setUser(data.user);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, switchRole, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
