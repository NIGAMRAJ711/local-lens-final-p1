import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { guideApi, uploadApi, friendsApi, reviewApi } from '../lib/api';
import { api } from '../lib/api';
import { MapPin, Star, Clock, Camera, Globe, Award, MessageCircle, UserPlus, UserCheck, Film, Heart, Upload, Pencil, Car, Hotel, UtensilsCrossed, Users, X } from 'lucide-react';
import { format } from 'date-fns';

const CITY_GRADIENTS = {
  'Mumbai':    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'Delhi':     'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'Jaipur':    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'Goa':       'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'Varanasi':  'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
  'Kochi':     'linear-gradient(135deg, #0fd850 0%, #f9f047 100%)',
  'Udaipur':   'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'Bangalore': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
};

export default function GuideProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const coverInputRef = useRef();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');

  // Friend state
  const [friendStatus, setFriendStatus] = useState('NONE');
  const [friendRequestId, setFriendRequestId] = useState(null);
  const [friendCount, setFriendCount] = useState(0);
  const [friendLoading, setFriendLoading] = useState(false);

  // Cover upload state
  const [uploadingCover, setUploadingCover] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  const isOwnProfile = data?.guide?.userId === user?.id;

  useEffect(() => { loadProfile(); }, [id]);

  const loadProfile = async () => {
    try {
      const d = await guideApi.getById(id);
      setData(d);
      if (user && d.guide?.userId !== user.id) {
        // Load friend status + count in parallel
        const [statusData, countData] = await Promise.all([
          friendsApi.getStatus(d.guide.userId).catch(() => ({ status: 'NONE' })),
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
        toast.success('Now friends! 🎉');
      } else if (friendStatus === 'FRIENDS') {
        await api.delete(`/friends/unfollow/${data.guide.userId}`);
        setFriendStatus('NONE');
        setFriendCount(c => Math.max(0, c - 1));
        toast.info('Unfriended');
      }
    } catch (err) { toast.error(err.message); }
    finally { setFriendLoading(false); }
  };

  const handleDeclineRequest = async () => {
    if (!friendRequestId) return;
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
    setUploadingCover(true);
    try {
      const result = await uploadApi.image(file);
      await guideApi.updateCoverImage(result.url);
      toast.success('Cover photo updated!');
      loadProfile();
    } catch (err) { toast.error('Upload failed: ' + err.message); }
    finally { setUploadingCover(false); }
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

  const submitReply = async (reviewId) => {
    if (!replyText.trim()) return;
    setReplyLoading(true);
    try {
      await reviewApi.respond(reviewId, replyText.trim());
      toast.success('Reply posted!');
      setReplyingTo(null); setReplyText('');
      loadProfile();
    } catch (err) { toast.error(err.message); }
    finally { setReplyLoading(false); }
  };

  if (loading) return <Layout><div className="text-center py-16"><div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto"/></div></Layout>;
  if (!data?.guide) return <Layout><div className="text-center py-16 text-gray-500">Guide not found</div></Layout>;

  const { guide, reviews, reels } = data;
  const cityGradient = CITY_GRADIENTS[guide.city] || 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';

  return (
    <Layout>
      <div className="card overflow-hidden mb-6">
        {/* ── Cover Banner ─────────────────────────────────────────── */}
        <div className="relative overflow-hidden group" style={{ height: 220 }}>
          {guide.coverImage ? (
            <img src={guide.coverImage} alt={guide.city} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center" style={{ background: cityGradient }}>
              <p className="text-white text-3xl font-bold drop-shadow">{guide.city}</p>
              <p className="text-white/80 text-sm mt-1">{guide.country}</p>
            </div>
          )}

          {/* Dark gradient overlay at bottom for avatar contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

          {/* Edit cover button — own profile only */}
          {isOwnProfile && (
            <button
              onClick={() => coverInputRef.current?.click()}
              className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition opacity-0 group-hover:opacity-100"
            >
              <Pencil className="w-3.5 h-3.5" />
              {uploadingCover ? 'Uploading...' : 'Edit Cover'}
            </button>
          )}
          <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" disabled={uploadingCover} />

          {/* Avatar — half-overlapping bottom-left */}
          <div className="absolute left-6" style={{ bottom: -40 }}>
            <div className="relative group/av">
              {guide.user?.avatarUrl ? (
                <img src={guide.user.avatarUrl} className="w-22 h-22 rounded-full border-3 border-white shadow-lg object-cover" style={{ width: 88, height: 88, borderWidth: 3, borderColor: 'white' }} alt="" />
              ) : (
                <div className="rounded-full border-white shadow-lg bg-green-500 flex items-center justify-center text-3xl font-bold text-white" style={{ width: 88, height: 88, borderWidth: 3, borderStyle: 'solid', borderColor: 'white' }}>
                  {guide.user?.fullName?.[0]}
                </div>
              )}
              {isOwnProfile && (
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full cursor-pointer opacity-0 group-hover/av:opacity-100 transition">
                  <Camera className="w-5 h-5 text-white" />
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* ── Profile info below banner ─────────────────────────────── */}
        <div className="px-6 pb-5" style={{ paddingTop: 52 }}>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                {guide.user?.fullName}
                {guide.isPhotographer && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><Camera className="w-3 h-3"/>Photographer</span>}
              </h1>
              <p className="text-gray-500 text-sm flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />{guide.city}, {guide.country}
              </p>
              {friendCount > 0 && (
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <Users className="w-3 h-3" />{friendCount} friend{friendCount !== 1 ? 's' : ''}
                </p>
              )}
              {guide.badges?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {guide.badges.map(b => (
                    <span key={b.id} className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-1 rounded-full font-semibold">
                      {b.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            {!isOwnProfile && (
              <div className="flex gap-2 flex-wrap">
                {/* Friend Request button */}
                {friendStatus === 'NONE' && (
                  <button onClick={handleFriendAction} disabled={friendLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition disabled:opacity-50">
                    {friendLoading ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"/> : <UserPlus className="w-4 h-4"/>}
                    Add Friend
                  </button>
                )}
                {friendStatus === 'PENDING_SENT' && (
                  <button disabled className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 text-gray-500 text-sm font-medium cursor-not-allowed">
                    <Clock className="w-4 h-4"/>Request Sent
                  </button>
                )}
                {friendStatus === 'PENDING_RECEIVED' && (
                  <>
                    <button onClick={handleFriendAction} disabled={friendLoading}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition disabled:opacity-50">
                      {friendLoading ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"/> : <UserCheck className="w-4 h-4"/>}
                      Accept
                    </button>
                    <button onClick={handleDeclineRequest} disabled={friendLoading}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition">
                      <X className="w-4 h-4"/>Decline
                    </button>
                  </>
                )}
                {friendStatus === 'FRIENDS' && (
                  <button onClick={handleFriendAction} disabled={friendLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-100 text-green-700 border border-green-200 text-sm font-medium hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition disabled:opacity-50">
                    <UserCheck className="w-4 h-4"/>Friends ✓
                  </button>
                )}

                {/* Message button */}
                <button onClick={() => navigate(`/messages?userId=${guide.userId}`)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
                  <MessageCircle className="w-4 h-4"/>Message
                </button>

                {/* Book button */}
                <Link to={`/book/${guide.id}`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-green-500 text-green-600 text-sm font-medium hover:bg-green-50 transition">
                  Book Now
                </Link>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 text-sm mt-4 mb-3">
            <div className="flex items-center gap-1.5 text-yellow-600">
              <Star className="w-4 h-4 fill-yellow-400" />
              <span className="font-bold">{guide.avgRating?.toFixed(1) || '0.0'}</span>
              <span className="text-gray-500">({guide.totalReviews} reviews)</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Award className="w-4 h-4" />{guide.totalBookings} tours
            </div>
            <div className={`flex items-center gap-1.5 ${guide.isAvailable ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${guide.isAvailable ? 'bg-green-500' : 'bg-gray-400'}`} />
              {guide.isAvailable ? 'Available Now' : 'Offline'}
            </div>
          </div>

          {/* Languages + Tags */}
          <div className="flex flex-wrap gap-1.5">
            {guide.languages?.map(l => (
              <span key={l} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                <Globe className="w-3 h-3"/>{l}
              </span>
            ))}
            {guide.expertiseTags?.map(t => (
              <span key={t} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">{t}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="space-y-4">
          {/* Pricing */}
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
              <Link to={`/book/${guide.id}`} className="btn-primary w-full text-center block mt-4">
                Book This Guide
              </Link>
            )}
          </div>

          {/* What's Included */}
          {(guide.placesOneHour || guide.placesHalfDay || guide.placesFullDay || guide.providesCab !== undefined || guide.hotelRecommendations || guide.restaurantRecommendations) && (
            <div className="card p-4 space-y-4">
              <h3 className="font-semibold text-gray-900">What's Included</h3>

              {guide.placesOneHour && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3"/> 1 Hour Tour
                  </p>
                  <p className="text-sm text-gray-700">{guide.placesOneHour}</p>
                </div>
              )}
              {guide.placesHalfDay && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3"/> Half Day Tour
                  </p>
                  <p className="text-sm text-gray-700">{guide.placesHalfDay}</p>
                </div>
              )}
              {guide.placesFullDay && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3"/> Full Day Tour
                  </p>
                  <p className="text-sm text-gray-700">{guide.placesFullDay}</p>
                </div>
              )}

              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Car className="w-3 h-3"/> Transport
                </p>
                {guide.providesCab ? (
                  <div className="text-sm space-y-0.5">
                    <p className="text-green-700 font-medium">✓ Cab service available</p>
                    {guide.cabPricePerKm > 0 && <p className="text-gray-600">₹{guide.cabPricePerKm}/km</p>}
                    {guide.cabFullDayPrice > 0 && <p className="text-gray-600">Full day: ₹{guide.cabFullDayPrice}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No cab — guide uses public transport or walks</p>
                )}
              </div>

              {guide.hotelRecommendations && (
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Hotel className="w-3 h-3"/> Recommended Hotels
                  </p>
                  <p className="text-sm text-gray-700">{guide.hotelRecommendations}</p>
                </div>
              )}

              {guide.restaurantRecommendations && (
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <UtensilsCrossed className="w-3 h-3"/> Recommended Restaurants
                  </p>
                  <p className="text-sm text-gray-700">{guide.restaurantRecommendations}</p>
                </div>
              )}
            </div>
          )}
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
            <div className="card p-5">
              <p className="text-gray-700 leading-relaxed mb-3">{guide.bio || 'No bio yet.'}</p>
              <p className="text-sm text-gray-400">Guide since {format(new Date(guide.createdAt || new Date()), 'MMMM yyyy')}</p>
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
                  {r.guideResponse ? (
                    <div className="mt-2 bg-green-50 border-l-4 border-green-500 rounded-r-lg p-3 text-sm text-green-800">
                      <p className="text-xs font-semibold text-green-600 mb-1">Guide replied:</p>
                      <p>{r.guideResponse}</p>
                    </div>
                  ) : isOwnProfile && (
                    <div className="mt-2">
                      {replyingTo === r.id ? (
                        <div className="flex flex-col gap-2">
                          <textarea className="input-field text-sm" rows={2} placeholder="Write your response..." value={replyText} onChange={e => setReplyText(e.target.value)} />
                          <div className="flex gap-2">
                            <button onClick={() => submitReply(r.id)} disabled={replyLoading} className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50">
                              {replyLoading ? 'Posting...' : 'Post Reply'}
                            </button>
                            <button onClick={() => { setReplyingTo(null); setReplyText(''); }} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200 transition">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setReplyingTo(r.id)} className="text-xs text-green-600 hover:underline mt-1">Reply to this review</button>
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
                    <Link key={reel.id} to="/reels" className="relative aspect-square bg-black rounded-lg overflow-hidden group cursor-pointer">
                      {reel.thumbnailUrl ? (
                        <img src={reel.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800">
                          <Film className="w-8 h-8 text-white/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-end p-2">
                        <div className="flex items-center gap-2 text-white text-xs">
                          <Heart className="w-3 h-3"/>{reel.likesCount || 0}
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
    </Layout>
  );
}
