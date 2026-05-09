import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../lib/api';
import { Globe, ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.forgotPassword(email);
      setMessage(data.message || 'If that email is registered, a reset link has been sent.');
    } catch (err) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Globe className="w-7 h-7 text-green-600" />
            <span className="text-xl font-bold text-green-600">LocalLens</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Forgot Password?</h1>
          <p className="text-gray-500 text-sm mt-1">Enter your email to receive a reset link</p>
        </div>

        {message ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-4 text-center">
              <Mail className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="font-medium">{message}</p>
            </div>

            <Link to="/login" className="flex items-center justify-center gap-2 text-green-600 hover:underline text-sm">
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <Link to="/login" className="flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 text-sm">
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
