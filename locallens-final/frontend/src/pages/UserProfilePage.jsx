import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { friendsApi } from '../lib/api';
import { api } from '../lib/api';
import { MapPin, Star, Film, Calendar, Globe, Users, Heart, UserPlus, UserCheck, UserMinus, Clock, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function UserProfilePage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');
  const [followStatus, setFollowStatus] = useState(null);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = userId === user?.id;

  useEffect(() => {
    friendsApi.getProfile(userId)
      .then(d => {
        setData(d);
        setFollowStatus(d.followStatus);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const handleFollow = async () => {
    setFollowLoading(true);
    try {
      if (followStatus === 'ACCEPTED') {
        await api.delete(`/friends/unfollow/${userId}`);
        setFollowStatus(null);
        setData(d => d ? { ...d, followersCount: (d.followersCount || 1) - 1 } : d);
        toast.info('Unfollowed');
      } else if (!followStatus) {
        await api.post(`/friends/follow/${userId}`);
        setFollowStatus('PENDING');
        toast.success('Follow request sent! 👋');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) return (
    <Layout>
      <div className="text-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto" />
      </div>
    </Layout>
  );

  if (!data?.user) return (
    <Layout>
      <div className="text-center py-16 text-gray-500">User not found</div>
    </Layout>
  );

  const { user: profile, followersCount, followingCount, connectionCount } = data;
  const guide = profile.guideProfile;

  return (
    <Layout>
      {/* Cover */}
      <div className="card overflow-hidden mb-5">
        <div className="h-44 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 relative">
          {guide?.coverImage && (
            <img src={guide.coverImage} className="w-full h-full object-cover opacity-60" alt="" />
          )}
        </div>

        <div className="px-6 pb-5">
          <div className="flex items-end gap-4 -mt-14 mb-4">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover" alt="" />
            ) : (
              <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-3xl font-bold text-white">
                {profile.fullName?.[0]}
              </div>
            )}

            <div className="flex-1 pb-1">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{profile.fullName}</h1>
                  <p className="text-sm text-gray-500">
                    {profile.role === 'GUIDE' ? '🗺️ Local Guide' : profile.role === 'BOTH' ? '🌍 Guide & Traveller' : '🧳 Traveller'}
                    {guide?.city && <span> · <MapPin className="w-3 h-3 inline" /> {guide.city}</span>}
                  </p>
                </div>

                {!isOwnProfile && (
                  <div className="flex gap-2">
                    <Link to="/messages" className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition">
                      <MessageCircle className="w-4 h-4" /> Message
                    </Link>
                    <button
                      onClick={handleFollow}
                      disabled={followLoading || followStatus === 'PENDING'}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition ${
                        followStatus === 'ACCEPTED' ? 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600' :
                        followStatus === 'PENDING' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                        'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {followLoading ? <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" /> :
                       followStatus === 'ACCEPTED' ? <><UserMinus className="w-4 h-4" /> Unfollow</> :
                       followStatus === 'PENDING' ? <><Clock className="w-4 h-4" /> Pending</> :
                       <><UserPlus className="w-4 h-4" /> Follow</>}
                    </button>
                    {guide && (
                      <Link to={`/book/${guide.id}`} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition">
                        Book Now
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats bar — Facebook style */}
          <div className="flex items-center gap-6 py-3 border-t border-gray-100 text-center">
            <div>
              <p className="font-bold text-gray-900 text-lg">{connectionCount || 0}</p>
              <p className="text-xs text-gray-500">Tours</p>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">{followersCount || 0}</p>
              <p className="text-xs text-gray-500">Friends</p>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">{followingCount || 0}</p>
              <p className="text-xs text-gray-500">Following</p>
            </div>
            {guide && (
              <>
                <div>
                  <p className="font-bold text-yellow-500 text-lg">⭐ {guide.avgRating?.toFixed(1) || '0.0'}</p>
                  <p className="text-xs text-gray-500">{guide.totalReviews} reviews</p>
                </div>
                <div>
                  <p className="font-bold text-green-600 text-lg">{guide.totalBookings || 0}</p>
                  <p className="text-xs text-gray-500">Bookings</p>
                </div>
              </>
            )}
            <div className="ml-auto text-right">
              <p className="text-xs text-gray-400">Since</p>
              <p className="text-xs font-medium text-gray-600">
                {format(new Date(profile.createdAt || new Date()), 'MMM yyyy')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        {[
          { key: 'about', label: 'About' },
          guide ? { key: 'guide', label: 'Guide Info' } : null,
          { key: 'reels', label: `Reels (${profile.reels?.length || 0})` },
        ].filter(Boolean).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === tab.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'about' && (
        <div className="card p-5">
          <p className="text-gray-700 leading-relaxed">
            {guide?.bio || 'No bio yet.'}
          </p>
          {guide?.languages?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {guide.languages.map(l => (
                <span key={l} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                  <Globe className="w-3 h-3" />{l}
                </span>
              ))}
            </div>
          )}
          {guide?.expertiseTags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {guide.expertiseTags.map(t => (
                <span key={t} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">{t}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'guide' && guide && (
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-bold mb-3">Pricing</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-lg font-bold text-green-600">₹{guide.hourlyRate}</p>
                <p className="text-xs text-gray-500">per hour</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-lg font-bold text-blue-600">₹{guide.halfDayRate}</p>
                <p className="text-xs text-gray-500">half day</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3">
                <p className="text-lg font-bold text-purple-600">₹{guide.fullDayRate}</p>
                <p className="text-xs text-gray-500">full day</p>
              </div>
            </div>
            {!isOwnProfile && (
              <Link to={`/book/${guide.id}`} className="btn-primary w-full text-center block mt-4">
                Book {profile.fullName}
              </Link>
            )}
          </div>
        </div>
      )}

      {activeTab === 'reels' && (
        <div>
          {!profile.reels?.length ? (
            <div className="card p-12 text-center text-gray-500">
              <Film className="w-10 h-10 mx-auto mb-2 text-gray-200" />
              <p className="font-medium">No reels posted yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {profile.reels.map(reel => (
                <Link key={reel.id} to="/reels" className="relative aspect-square bg-black rounded-xl overflow-hidden group cursor-pointer">
                  {reel.thumbnailUrl ? (
                    <img src={reel.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                      <Film className="w-8 h-8 text-white/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-end p-2">
                    <div className="flex items-center gap-2 text-white text-xs">
                      <Heart className="w-3 h-3" /> {reel.likesCount || 0}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
