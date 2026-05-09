import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { guideApi, uploadApi, friendsApi, adminApi, reviewsApi } from '../lib/api';
import { api } from '../lib/api';
import { MapPin, Star, Clock, Camera, Globe, Award, MessageCircle, UserPlus, UserCheck, Film, Heart, Car, Hotel, UtensilsCrossed, Pencil, Users } from 'lucide-react';
import { format } from 'date-fns';

const CITY_GRADIENTS = {
  'Mumbai': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'Delhi': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'Jaipur': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'Goa': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'Varanasi': 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
  'Kochi': 'linear-gradient(135deg, #0fd850 0%, #f9f047 100%)',
  'Udaipur': 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'Bangalore': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
};

export default function GuideProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const coverInputRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');
  const [uploadingBg, setUploadingBg] = useState(false);
  const [friendStatus, setFriendStatus] = useState('NONE');
  const [friendRequestId, setFriendRequestId] = useState(null);
  const [friendCount, setFriendCount] = useState(0);
  const [friendLoading, setFriendLoading] = useState(false);
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState('SCAMMER');
  const [blacklistNote, setBlacklistNote] = useState('');
  const [blacklisting, setBlacklisting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const handleSubmitReply = async (reviewId) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      await reviewsApi.respond(reviewId, replyText.trim());
      toast.success('Reply posted!');
      setReplyingTo(null);
      setReplyText('');
      loadProfile();
    } catch (err) { toast.error(err.message); }
    finally { setSubmittingReply(false); }
  };
    setBlacklisting(true);
    try {
      await adminApi.blacklistUser(guide.userId, { reasonCategory: blacklistReason, customReason: blacklistNote });
      toast.error('Guide has been blacklisted permanently');
      setShowBlacklistModal(false);
      navigate('/explore');
    } catch (err) { toast.error(err.message); }
    finally { setBlacklisting(false); }
  };

  const BLACKLIST_REASONS = [
    { value: 'SCAMMER', label: 'Scammer / Fraud' },
    { value: 'FRAUD_PAYMENT', label: 'Payment Fraud' },
    { value: 'RUDE_BEHAVIOR', label: 'Rude Behavior' },
    { value: 'DRUNK_DISORDERLY', label: 'Drunk / Disorderly' },
    { value: 'HARASSMENT', label: 'Harassment' },
    { value: 'FAKE_PROFILE', label: 'Fake Profile' },
    { value: 'NO_SHOW', label: 'No Show' },
    { value: 'SAFETY_THREAT', label: 'Safety Threat' },
    { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate Content' },
    { value: 'OTHER', label: 'Other' },
  ];

  useEffect(() => { loadProfile(); }, [id]);

  const loadProfile = async () => {
    try {
      const d = await guideApi.getById(id);
      setData(d);
      if (user && d.guide?.userId !== user.id) {
        const [statusData, countData] = await Promise.all([
          friendsApi.getStatus(d.guide.userId).catch(() => ({ status: 'NONE', requestId: null })),
          friendsApi.getFriendCount(d.guide.userId).catch(() => ({ count: 0 })),
        ]);
        setFriendStatus(statusData.status || 'NONE');
        setFriendRequestId(statusData.requestId || null);
        setFriendCount(countData.count || 0);
      }
    } catch { toast.error('Failed to load profile'); }
    finally { setLoading(false); }
  };

  const handleFriendAction = async () => {
    if (!user) { navigate('/login'); return; }
    setFriendLoading(true);
    try {
      if (friendStatus === 'NONE') {
        const res = await friendsApi.sendRequest(data.guide.userId);
        setFriendStatus('PENDING_SENT');
        setFriendRequestId(res.result?.id);
        toast.success('Friend request sent! 👋');
      } else if (friendStatus === 'PENDING_RECEIVED') {
        await friendsApi.acceptRequest(friendRequestId);
        setFriendStatus('FRIENDS');
        setFriendCount(c => c + 1);
        toast.success('You are now friends! 🎉');
      } else if (friendStatus === 'FRIENDS') {
        await api.delete(`/friends/unfollow/${data.guide.userId}`);
        setFriendStatus('NONE');
        setFriendCount(c => Math.max(0, c - 1));
        toast.info('Unfriended');
      }
    } catch (err) { toast.error(err.message); }
    finally { setFriendLoading(false); }
  };

  const handleDeclineFriend = async () => {
    setFriendLoading(true);
    try {
      await friendsApi.declineRequest(friendRequestId);
      setFriendStatus('NONE');
      toast.info('Request declined');
    } catch (err) { toast.error(err.message); }
    finally { setFriendLoading(false); }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingBg(true);
    try {
      const result = await uploadApi.image(file);
      await api.patch('/guides/cover-image', { coverImage: result.url });
      toast.success('Cover photo updated!');
      loadProfile();
    } catch (err) { toast.error('Upload failed: ' + err.message); }
    finally { setUploadingBg(false); }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await uploadApi.image(file);
      await api.patch('/users/me', { avatarUrl: result.url });
      toast.success('Profile photo updated!');
      loadProfile();
    } catch (err) { toast.error('Upload failed: ' + err.message); }
  };

  if (loading) return <Layout><div className="text-center py-16"><div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto"/></div></Layout>;
  if (!data?.guide) return <Layout><div className="text-center py-16 text-gray-500">Guide not found</div></Layout>;

  const { guide, reviews, reels } = data;
  const coverGradient = CITY_GRADIENTS[guide.city] || 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';

  return (
    <Layout>
      <div className="card overflow-hidden mb-6">
        {/* Cover Banner */}
        <div className="relative overflow-hidden" style={{ height: 220 }}>
          {guide.coverImage ? (
            <img src={guide.coverImage} alt={guide.city} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white" style={{ background: coverGradient }}>
              <p className="text-3xl font-bold drop-shadow-lg">{guide.city}</p>
              <p className="text-sm opacity-80 mt-1">{guide.country}</p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30 pointer-events-none" />

          {/* Edit cover button (own profile only) */}
          {isOwnProfile && (
            <>
              <button onClick={() => coverInputRef.current?.click()} disabled={uploadingBg}
                className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition z-10">
                <Pencil className="w-3.5 h-3.5" />
                {uploadingBg ? 'Uploading...' : 'Edit Cover'}
              </button>
              <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
            </>
          )}

          {/* Avatar — bottom-left, half overlapping cover */}
          <div className="absolute group" style={{ bottom: -44, left: 24 }}>
            {guide.user?.avatarUrl ? (
              <img src={guide.user.avatarUrl} className="rounded-full object-cover shadow-lg"
                style={{ width: 88, height: 88, border: '3px solid white' }} alt="" />
            ) : (
              <div className="rounded-full bg-green-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg"
                style={{ width: 88, height: 88, border: '3px solid white' }}>
                {guide.user?.fullName?.[0]}
              </div>
            )}
            {isOwnProfile && (
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition">
                <Camera className="w-5 h-5 text-white" />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Profile info */}
        <div className="px-6 pb-5" style={{ paddingTop: 56 }}>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{guide.user?.fullName}</h1>
              <p className="text-gray-500 text-sm flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />{guide.city}, {guide.country}
              </p>
              {friendCount > 0 && (
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <Users className="w-3 h-3" />{friendCount} friends
                </p>
              )}
            </div>

            {!isOwnProfile && (
              <div className="flex gap-2 flex-wrap">
                {friendStatus === 'NONE' && (
                  <button onClick={handleFriendAction} disabled={friendLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition disabled:opacity-50">
                    {friendLoading ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <UserPlus className="w-4 h-4" />}
                    Add Friend
                  </button>
                )}
                {friendStatus === 'PENDING_SENT' && (
                  <button disabled className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 text-gray-400 text-sm font-medium cursor-not-allowed">
                    <Clock className="w-4 h-4" /> Request Sent
                  </button>
                )}
                {friendStatus === 'PENDING_RECEIVED' && (
                  <>
                    <button onClick={handleFriendAction} disabled={friendLoading}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition disabled:opacity-50">
                      <UserCheck className="w-4 h-4" /> Accept
                    </button>
                    <button onClick={handleDeclineFriend} disabled={friendLoading}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition">
                      Decline
                    </button>
                  </>
                )}
                {friendStatus === 'FRIENDS' && (
                  <button onClick={handleFriendAction} disabled={friendLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-red-50 hover:text-red-600 transition">
                    <UserCheck className="w-4 h-4" /> Friends ✓
                  </button>
                )}
                <button onClick={() => navigate(`/messages?userId=${guide.userId}`)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
                  <MessageCircle className="w-4 h-4" /> Message
                </button>
                <Link to={`/book/${guide.id}`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition">
                  Book Now
                </Link>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 text-sm mt-4">
            <div className="flex items-center gap-1.5 text-yellow-600">
              <Star className="w-4 h-4 fill-yellow-400" />
              <span className="font-bold">{guide.avgRating?.toFixed(1) || '0.0'}</span>
              <span className="text-gray-500">({guide.totalReviews} reviews)</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Award className="w-4 h-4" />{guide.totalBookings} tours
            </div>
            {guide.isPhotographer && (
              <div className="flex items-center gap-1.5 text-purple-600">
                <Camera className="w-4 h-4" />Photography Guide
              </div>
            )}
            <div className={`flex items-center gap-1.5 ${guide.isAvailable ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${guide.isAvailable ? 'bg-green-500' : 'bg-gray-400'}`} />
              {guide.isAvailable ? 'Available Now' : 'Offline'}
            </div>
          </div>

          {/* Languages + Tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {guide.languages?.map(l => (
              <span key={l} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                <Globe className="w-3 h-3" />{l}
              </span>
            ))}
            {guide.expertiseTags?.map(t => (
              <span key={t} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">{t}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Pricing sidebar */}
        <div>
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Pricing</h3>
            <div className="space-y-2">
              {[
                { label: '1 Hour', value: guide.hourlyRate },
                { label: 'Half Day', value: guide.halfDayRate },
                { label: 'Full Day', value: guide.fullDayRate },
                guide.photographyRate ? { label: 'Photography', value: guide.photographyRate } : null,
              ].filter(Boolean).map(item => (
                <div key={item.label} className="flex justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-bold text-green-600">₹{item.value}</span>
                </div>
              ))}
            </div>
            {!isOwnProfile && (
              <Link to={`/book/${guide.id}`} className="btn-primary w-full text-center block mt-4 py-2.5">
                Book This Guide
              </Link>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="md:col-span-2">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
            {[
              { key: 'about', label: 'About' },
              { key: 'reviews', label: `Reviews (${guide.totalReviews})` },
              { key: 'reels', label: `Reels (${reels?.length || 0})` },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'about' && (
            <div className="space-y-4">
              <div className="card p-5">
                <p className="text-gray-700 leading-relaxed mb-3">{guide.bio || 'No bio yet.'}</p>
                <p className="text-sm text-gray-400">Guide since {format(new Date(guide.createdAt || new Date()), 'MMMM yyyy')}</p>
              </div>

              {(guide.placesOneHour || guide.placesHalfDay || guide.placesFullDay || guide.providesCab !== undefined || guide.hotelRecommendations || guide.restaurantRecommendations) && (
                <div className="card p-5 space-y-4">
                  <h3 className="font-bold text-gray-900">What's Included</h3>
                  {(guide.placesOneHour || guide.placesHalfDay || guide.placesFullDay) && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-green-500" /> Places Covered</p>
                      {guide.placesOneHour && <div className="bg-gray-50 rounded-lg p-3 text-sm"><span className="font-medium text-gray-600">1 Hour: </span><span className="text-gray-700">{guide.placesOneHour}</span></div>}
                      {guide.placesHalfDay && <div className="bg-gray-50 rounded-lg p-3 text-sm"><span className="font-medium text-gray-600">Half Day: </span><span className="text-gray-700">{guide.placesHalfDay}</span></div>}
                      {guide.placesFullDay && <div className="bg-gray-50 rounded-lg p-3 text-sm"><span className="font-medium text-gray-600">Full Day: </span><span className="text-gray-700">{guide.placesFullDay}</span></div>}
                    </div>
                  )}
                  <div className="flex items-start gap-2 text-sm">
                    <Car className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
                    {guide.providesCab ? (
                      <div>
                        <span className="font-medium text-green-700">Cab available ✓</span>
                        <span className="text-gray-500 ml-2">₹{guide.cabPricePerKm}/km</span>
                        {guide.cabFullDayPrice > 0 && <span className="text-gray-500 ml-2">· ₹{guide.cabFullDayPrice} full day</span>}
                      </div>
                    ) : <span className="text-gray-500">No cab service — own transport required</span>}
                  </div>
                  {guide.hotelRecommendations && (
                    <div className="text-sm">
                      <p className="font-semibold text-gray-700 flex items-center gap-1.5 mb-1"><Hotel className="w-4 h-4 text-purple-500" /> Hotel Recommendations</p>
                      <p className="text-gray-600 bg-purple-50 rounded-lg p-3">{guide.hotelRecommendations}</p>
                    </div>
                  )}
                  {guide.restaurantRecommendations && (
                    <div className="text-sm">
                      <p className="font-semibold text-gray-700 flex items-center gap-1.5 mb-1"><UtensilsCrossed className="w-4 h-4 text-orange-500" /> Restaurant Recommendations</p>
                      <p className="text-gray-600 bg-orange-50 rounded-lg p-3">{guide.restaurantRecommendations}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-3">
              {!reviews?.length ? (
                <div className="card p-8 text-center text-gray-500">No reviews yet</div>
              ) : reviews.map(r => (
                <div key={r.id} className="card p-4">
                  <div className="flex items-center gap-3 mb-2">
                    {r.reviewer?.avatarUrl ? (
                      <img src={r.reviewer.avatarUrl} className="w-9 h-9 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                        {r.reviewer?.fullName?.[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{r.reviewer?.fullName}</p>
                      <p className="text-xs text-gray-400">{format(new Date(r.createdAt), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="ml-auto flex">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} className={`w-4 h-4 ${i <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{r.comment}</p>
                  {r.guideResponse && (
                    <div className="mt-2 bg-green-50 rounded-lg p-3 text-sm text-green-800 border-l-2 border-green-500">
                      <span className="font-medium text-green-700 text-xs block mb-1">Guide replied:</span>
                      {r.guideResponse}
                    </div>
                  )}
                  {/* Guide reply button — only for own profile, unreplied reviews */}
                  {isOwnProfile && !r.guideResponse && (
                    <div className="mt-2">
                      {replyingTo === r.id ? (
                        <div className="space-y-2">
                          <textarea className="input-field text-sm w-full" rows={2} placeholder="Write your response..."
                            value={replyText} onChange={e => setReplyText(e.target.value)} autoFocus />
                          <div className="flex gap-2">
                            <button onClick={() => { setReplyingTo(null); setReplyText(''); }} className="btn-secondary text-xs py-1.5 flex-1">Cancel</button>
                            <button onClick={() => handleSubmitReply(r.id)} disabled={submittingReply || !replyText.trim()}
                              className="btn-primary text-xs py-1.5 flex-1 disabled:opacity-50">
                              {submittingReply ? 'Posting...' : 'Post Reply'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setReplyingTo(r.id); setReplyText(''); }}
                          className="text-xs text-green-600 hover:underline">Reply to this review</button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'reels' && (
            <div>
              {!reels?.length ? (
                <div className="card p-8 text-center text-gray-500">No reels posted yet</div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {reels.map(reel => (
                    <Link key={reel.id} to="/reels" className="relative aspect-square bg-black rounded-lg overflow-hidden group">
                      {reel.thumbnailUrl ? (
                        <img src={reel.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800">
                          <Film className="w-8 h-8 text-white/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-end p-2">
                        <div className="flex items-center gap-2 text-white text-xs">
                          <Heart className="w-3 h-3" />{reel.likesCount || 0}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Admin blacklist button */}
      {user?.role === 'ADMIN' && !isOwnProfile && (
        <div className="mt-4">
          <button onClick={() => setShowBlacklistModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition">
            🚫 Blacklist This Guide
          </button>
        </div>
      )}

      {/* Blacklist Modal */}
      {showBlacklistModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Blacklist This Guide</h2>
            <p className="text-sm text-red-600 mb-4">⚠️ This action is permanent and cannot be undone.</p>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Reason *</label>
                <select className="input-field text-sm" value={blacklistReason}
                  onChange={e => setBlacklistReason(e.target.value)}>
                  {BLACKLIST_REASONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Additional details <span className="font-normal text-gray-400">(optional)</span></label>
                <textarea className="input-field text-sm" rows={3} placeholder="Describe the incident..."
                  value={blacklistNote} onChange={e => setBlacklistNote(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowBlacklistModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleBlacklist} disabled={blacklisting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition disabled:opacity-50">
                {blacklisting ? 'Processing...' : '🚫 Blacklist Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
