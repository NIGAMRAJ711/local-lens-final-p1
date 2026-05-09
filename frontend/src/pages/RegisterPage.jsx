import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Globe, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', role: 'TRAVELER' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [blocked, setBlocked] = useState(false);

  const validatePhone = (val) => {
    const cleaned = val.replace(/\s/g, '');
    if (!cleaned) return 'Phone number is required';
    if (!/^[6-9]\d{9}$/.test(cleaned)) return 'Enter a valid 10-digit mobile number';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pErr = validatePhone(form.phone);
    if (pErr) { setPhoneError(pErr); return; }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Welcome to LocalLens 🌍');
      navigate('/dashboard');
    } catch (err) {
      if (err.code === 'REGISTRATION_BLOCKED' || err.message?.includes('permanently suspended')) {
        setBlocked(true);
      } else {
        toast.error(err.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Globe className="w-7 h-7 text-green-600" />
            <span className="text-xl font-bold text-green-600">LocalLens</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Create your account</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {blocked && (
            <div className="bg-red-50 border-2 border-red-400 rounded-xl p-4">
              <p className="font-bold text-red-700 flex items-center gap-2 mb-1">🚫 Registration Not Allowed</p>
              <p className="text-red-600 text-sm">An account with this email or phone number has been permanently suspended.</p>
              <p className="text-red-500 text-xs mt-2">Contact <span className="font-medium">support@locallens.app</span> if you believe this is an error.</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input type="text" className="input-field" placeholder="Your full name"
              value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
            <input type="tel" className={`input-field ${phoneError ? 'border-red-400 focus:ring-red-300' : ''}`}
              placeholder="10-digit mobile number"
              value={form.phone}
              onChange={e => { setForm(f => ({ ...f, phone: e.target.value })); setPhoneError(validatePhone(e.target.value)); }}
              required />
            {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" className="input-field" placeholder="you@example.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} className="input-field pr-10"
                placeholder="Min 8 characters" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">I want to join as</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'TRAVELER', label: '🧳 Traveller', desc: 'Explore & book guides' },
                { value: 'GUIDE', label: '🗺️ Guide', desc: 'Offer local tours' },
              ].map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setForm(f => ({ ...f, role: opt.value }))}
                  className={`p-3 rounded-xl border-2 text-left transition ${form.role === opt.value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="font-medium text-sm">{opt.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-green-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
