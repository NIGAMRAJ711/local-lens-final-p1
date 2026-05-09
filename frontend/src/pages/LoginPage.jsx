import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Globe, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user) navigate('/dashboard', { replace: true });
  }, [authLoading, navigate, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email.trim() || !form.password) {
      const message = 'Please enter both email and password.';
      setError(message);
      toast.warning('Missing login details', message);
      return;
    }
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.fullName?.split(' ')[0]}! 👋`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message = err.message || 'Invalid email or password';
      setError(message);
      toast.warning('Login failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Globe className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold text-green-600">LocalLens</span>
          </div>
          <p className="text-gray-500 text-sm">Discover local guides & hidden gems</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" className="input-field" placeholder="you@example.com"
              value={form.email} onChange={e => { setError(''); setForm(f => ({ ...f, email: e.target.value })); }} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} className="input-field pr-10"
                placeholder="••••••••" value={form.password}
                onChange={e => { setError(''); setForm(f => ({ ...f, password: e.target.value })); }} required />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-green-600 hover:underline">Forgot password?</Link>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base disabled:opacity-70">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-green-600 font-medium hover:underline">Sign up</Link>
        </p>

        <div className="mt-4 p-3 bg-gray-50 rounded-xl text-xs text-gray-500">
          <p className="font-medium text-gray-600 mb-1">Demo accounts:</p>
          <p>Guide: arjun@guide.com / Guide@1234</p>
          <p>Traveller: rohan@traveller.com / Travel@1234</p>
        </div>
      </div>
    </div>
  );
}
