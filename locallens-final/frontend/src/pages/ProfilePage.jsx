import { useState } from 'react';
import Layout from '../components/shared/Layout';
import { useAuth } from '../context/AuthContext';
import { userApi, uploadApi } from '../lib/api';
import { Camera, Save, User, Mail, Phone, Globe } from 'lucide-react';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: user?.fullName || '', phone: user?.phone || '', avatarUrl: user?.avatarUrl || '' });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState('');

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const data = await uploadApi.image(file);
      setForm(f => ({ ...f, avatarUrl: data.url }));
    } catch (err) {
      alert('Photo upload failed: ' + err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await userApi.updateMe(form);
      updateUser(data.user);
      setEditing(false);
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="My Profile">
      <div className="max-w-2xl mx-auto space-y-6">
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">{message}</div>
        )}

        {/* Profile Card */}
        <div className="card p-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {(editing ? form.avatarUrl : user?.avatarUrl) ? (
                <img src={editing ? form.avatarUrl : user?.avatarUrl} className="w-24 h-24 rounded-2xl object-cover" alt="" />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-3xl font-bold text-white">
                  {user?.fullName?.[0]}
                </div>
              )}
              {editing && (
                <label className="absolute -bottom-2 -right-2 bg-green-600 text-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer hover:bg-green-700">
                  <Camera className="w-3.5 h-3.5" />
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              )}
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl">
                  <div className="animate-spin w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full"/>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Full Name</label>
                    <input className="input-field" value={form.fullName}
                      onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Phone</label>
                    <input className="input-field" value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+91 9876543210" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 text-sm">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{user?.fullName}</h2>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {user?.role === 'GUIDE' ? '🗺️ Guide' : user?.role === 'BOTH' ? '🌍 Guide & Traveller' : '🧳 Traveller'}
                      </p>
                    </div>
                    <button onClick={() => setEditing(true)} className="btn-secondary text-sm">Edit Profile</button>
                  </div>
                  <div className="mt-3 space-y-1.5 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" /> {user?.email}
                    </div>
                    {user?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" /> {user?.phone}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      Member since {user?.createdAt ? format(new Date(user.createdAt), 'MMMM yyyy') : 'recently'}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Account Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Account Type</span>
              <span className="font-medium">{user?.role}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Email Verified</span>
              <span className={`font-medium ${user?.isEmailVerified ? 'text-green-600' : 'text-yellow-600'}`}>
                {user?.isEmailVerified ? '✓ Verified' : 'Pending'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Referral Code</span>
              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{user?.referralCode?.slice(0, 8)}</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
