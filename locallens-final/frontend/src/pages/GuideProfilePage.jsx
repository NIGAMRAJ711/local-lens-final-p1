import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { guideApi, uploadApi } from '../lib/api';
import { api } from '../lib/api';
import { MapPin, Star, Clock, Camera, Globe, Award, MessageCircle, UserPlus, UserCheck, Film, Heart, Upload } from 'lucide-react';
import { format } from 'date-fns';

export default function GuideProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');
  const [followStatus, setFollowStatus] = useState(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);

  const isOwnProfile = data?.guide?.userId === user?.id;

  useEffect(() => {
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    try {
      const d = await guideApi.getById(id);
      setData(d);
      if (user && d.guide?.userId !== user.id) {
        const statusData = await api.get(`/friends/status/${d.guide?.userId}`).catch(() => ({ status: null }));
        setFollowStatus(statusData.status);
      }
    } catch { toast.error('Failed to load profile'); }
    finally { setLoading(false); }
  };

  const handleFollow = async () => {
    if (!user) { navigate('/login'); return; }
    setFollowLoading(true);
    try {
      if (followStatus === 'ACCEPTED') {
        await api.delete(`/friends/unfollow/${data.guide.userId}`);
        setFollowStatus(null);
        toast.info('Unfollowed');
      } else if (!followStatus) {
        await api.post(`/friends/follow/${data.guide.userId}`);
        setFollowStatus('PENDING');
        toast.success('Follow request sent!');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleBgUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingBg(true);
    try {
      const result = await uploadApi.image(file);
      await api.patch('/users/me/guide-profile', { coverImage: result.url });
      toast.success('Cover photo updated!');
      loadProfile();
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploadingBg(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await uploadApi.image(file);
      await api.patch('/users/me', { avatarUrl: result.url });
      toast.success('Profile photo updated!');
      loadProfile();
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    }
  };

  const getCityImage = (city) => {
    const cityImages = {
      'Mumbai': 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=1200&q=80',
      'Delhi': 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=1200&q=80',
      'Jaipur': 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1200&q=80',
      'Kochi': 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1200&q=80',
      'Goa': 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200&q=80',
      'Varanasi': 'https://images.unsplash.com/photo-1561361058-c24e72565bb2?w=1200&q=80',
      'Chennai': 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1200&q=80',
      'Bangalore': 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=1200&q=80',
      'Agra': 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1200&q=80',
      'Hyderabad': 'https://images.unsplash.com/photo-1572445271230-a78b5944a659?w=1200&q=80',
    };
    return cityImages[city] || `https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1200&q=80`;
  };

  if (loading) return <Layout><div className="text-center py-16"><div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto"/></div></Layout>;
  if (!data?.guide) return <Layout><div className="text-center py-16 text-gray-500">Guide not found</div></Layout>;

  const { guide, reviews, reels } = data;
  const bgImage = guide.coverImage || getCityImage(guide.city);

  return (
    <Layout>
      <div className="card overflow-hidden mb-6">
        {/* Cover Image */}
        <div className="h-52 relative overflow-hidden group">
          <img
            src={bgImage}
            alt={guide.city}
            className="w-full h-full object-cover"
            onError={e => e.target.src = `https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1200&q=80`}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />

          {/* Upload cover button (own profile only) */}
          {isOwnProfile && (
            <label className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 transition opacity-0 group-hover:opacity-100">
              <Upload className="w-3.5 h-3.5" />
              {uploadingBg ? 'Uploading...' : 'Change Cover'}
              <input type="file" accept="image/*" onChange={handleBgUpload} className="hidden" disabled={uploadingBg} />
            </label>
          )}
        </div>

        {/* Profile section */}
        <div className="px-6 pb-5">
          <div className="flex items-end gap-4 -mt-14 mb-4">
            {/* Avatar with upload */}
            <div className="relative flex-shrink-0 group">
              {guide.user?.avatarUrl ? (
                <img src={guide.user.avatarUrl} className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg object-cover" alt="" />
              ) : (
                <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg bg-green-500 flex items-center justify-center text-3xl font-bold text-white">
                  {guide.user?.fullName?.[0]}
                </div>
              )}
              {isOwnProfile && (
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl cursor-pointer opacity-0 group-hover:opacity-100 transition">
                  <Camera className="w-6 h-6 text-white" />
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
              )}
            </div>

            {/* Name + Actions */}
            <div className="flex-1 pb-1">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{guide.user?.fullName}</h1>
                  <p className="text-gray-500 text-sm flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />{guide.city}, {guide.country}
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {/* Chat button */}
                  {!isOwnProfile && (
                    <Link
                      to="/messages"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Message
                    </Link>
                  )}

                  {/* Follow button */}
                  {!isOwnProfile && user && (
                    <button
                      onClick={handleFollow}
                      disabled={followLoading || followStatus === 'PENDING'}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition ${
                        followStatus === 'ACCEPTED' ? 'bg-green-100 text-green-700 border border-green-200' :
                        followStatus === 'PENDING' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' :
                        'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {followStatus === 'ACCEPTED' ? <><UserCheck className="w-4 h-4" /> Following</> :
                       followStatus === 'PENDING' ? <><Clock className="w-4 h-4" /> Requested</> :
                       <><UserPlus className="w-4 h-4" /> Follow</>}
                    </button>
                  )}

                  {/* Book button */}
                  {!isOwnProfile && (
                    <Link to={`/book/${guide.id}`} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition">
                      Book Now
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 text-sm mb-3">
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
          <div className="flex flex-wrap gap-1.5">
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
        {/* Pricing */}
        <div className="space-y-4">
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
                  {r.guideResponse && (
                    <div className="mt-2 bg-green-50 rounded-lg p-3 text-sm text-green-800">
                      <span className="font-medium">Guide replied: </span>{r.guideResponse}
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
    </Layout>
  );
}
