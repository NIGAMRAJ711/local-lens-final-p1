import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { userApi, uploadApi } from '../lib/api';
import { Camera, Save, User, Mail, Phone, Calendar, Edit2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { user, updateUser, refreshUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    avatarUrl: user?.avatarUrl || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(user?.avatarUrl || '');
  const [showOnlineRing, setShowOnlineRing] = useState(true);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file || !file.type.startsWith('image/')) return;

    setUploadingPhoto(true);
    try {
      const data = await uploadApi.image(file);
      const cloudinaryUrl = data.url; // permanent Cloudinary URL only
      // Immediately persist to backend — no waiting for "Save"
      await userApi.updateMe({ ...form, avatarUrl: cloudinaryUrl });
      setForm(f => ({ ...f, avatarUrl: cloudinaryUrl }));
      setPreviewUrl(cloudinaryUrl);
      await refreshUser();
      toast.success('Profile photo updated!');
    } catch (err) {
      toast.error('Photo upload failed: ' + err.message);
      setPreviewUrl(user?.avatarUrl || '');
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
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({ fullName: user?.fullName || '', phone: user?.phone || '', avatarUrl: user?.avatarUrl || '' });
    setPreviewUrl(user?.avatarUrl || '');
    setEditing(false);
  };

  const displayAvatar = editing ? previewUrl : user?.avatarUrl;

  return (
    <Layout title="My Profile">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Profile Card */}
        <div className="card p-6">
          {/* Avatar section */}
          <div className="flex items-start gap-5 mb-6">
            <div className="relative flex-shrink-0">
              {/* Green online ring behind the profile picture */}
              <div className={`absolute -inset-1.5 rounded-2xl transition-all duration-300 ${showOnlineRing ? 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-200' : 'bg-transparent'}`} />
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt="Profile"
                  className="relative w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-sm"
                />
              ) : (
                <div className="relative w-24 h-24 rounded-2xl bg-gray-200 flex items-center justify-center text-3xl font-bold text-gray-600 border-4 border-white shadow-sm">
                  {user?.fullName?.[0]?.toUpperCase()}
                </div>
              )}

              {editing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute -bottom-2 -right-2 bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-green-700 transition shadow-lg"
                >
                  {uploadingPhoto ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              {/* Toggle green online ring */}
              <button
                onClick={() => setShowOnlineRing(v => !v)}
                title={showOnlineRing ? 'Hide online ring' : 'Show online ring'}
                className={`absolute -top-2 -right-2 w-6 h-6 rounded-full border-2 border-white shadow transition-all ${showOnlineRing ? 'bg-green-500' : 'bg-gray-300'}`}
              />
            </div>

            <div className="flex-1">
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Full Name</label>
                    <input
                      className="input-field"
                      value={form.fullName}
                      onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Phone Number</label>
                    <input
                      className="input-field"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+91 9876543210"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleCancel} className="btn-secondary flex-1 text-sm py-2">
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 text-sm py-2 flex items-center justify-center gap-1.5">
                      {saving ? (
                        <><div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /> Saving...</>
                      ) : (
                        <><Save className="w-3.5 h-3.5" /> Save Changes</>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{user?.fullName}</h2>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {user?.role === 'GUIDE' ? '🗺️ Local Guide' : user?.role === 'BOTH' ? '🌍 Guide & Traveller' : '🧳 Traveller'}
                      </p>
                    </div>
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-50 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>{user?.email}</span>
                      {user?.isEmailVerified && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                    </div>
                    {user?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>Member since {user?.createdAt ? format(new Date(user.createdAt), 'MMMM yyyy') : 'recently'}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Stats row */}
          {!editing && (
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">{user?.travelerProfile?.totalToursBooked || 0}</p>
                <p className="text-xs text-gray-500">Tours Booked</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-green-600">{user?.travelerProfile?.loyaltyPoints || 0}</p>
                <p className="text-xs text-gray-500">Loyalty Points</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-blue-600">{user?.guideProfile?.totalBookings || 0}</p>
                <p className="text-xs text-gray-500">Tours Guided</p>
              </div>
            </div>
          )}
        </div>

        {/* Account Details */}
        <div className="card p-5">
          <h3 className="font-bold text-gray-900 mb-4">Account Details</h3>
          <div className="space-y-2">
            {[
              { label: 'Account Type', value: user?.role },
              { label: 'Email Verified', value: user?.isEmailVerified ? '✅ Verified' : '⏳ Pending', colored: true },
              { label: 'Referral Code', value: user?.referralCode },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className={`text-sm font-medium ${item.colored ? (user?.isEmailVerified ? 'text-green-600' : 'text-orange-500') : 'text-gray-700'}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Guide Profile section */}
        {user?.guideProfile && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Guide Profile</h3>
              <button onClick={() => navigate('/guide-dashboard')} className="text-sm text-green-600 hover:underline">
                Manage →
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-yellow-50 rounded-xl p-3">
                <p className="text-xl font-bold text-yellow-600">⭐ {user.guideProfile.avgRating?.toFixed(1) || '0.0'}</p>
                <p className="text-xs text-gray-500">{user.guideProfile.totalReviews} reviews</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-xl font-bold text-green-600">₹{user.guideProfile.walletBalance?.toFixed(0) || '0'}</p>
                <p className="text-xs text-gray-500">Wallet balance</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
