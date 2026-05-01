import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { friendsApi } from '../lib/api';
import { MapPin, Star, Award, Film, Calendar, Globe, Users, Heart } from 'lucide-react';
import { format } from 'date-fns';

export default function UserProfilePage() {
  const { userId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');

  useEffect(() => {
    friendsApi.getProfile(userId).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [userId]);

  if (loading) return <Layout><div className="text-center py-16"><div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto"/></div></Layout>;
  if (!data?.user) return <Layout><div className="text-center py-16 text-gray-500">User not found</div></Layout>;

  const { user, connectionCount } = data;
  const guide = user.guideProfile;

  return (
    <Layout>
      {/* Cover */}
      <div className="card overflow-hidden mb-4">
        <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600 relative">
          <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/cover/1200/300')] bg-cover bg-center opacity-30" />
        </div>
        <div className="px-6 pb-5">
          <div className="flex items-end gap-4 -mt-14 mb-3">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover" alt="" />
            ) : (
              <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-3xl font-bold text-white">
                {user.fullName?.[0]}
              </div>
            )}
            <div className="flex-1 pb-1">
              <h1 className="text-2xl font-bold text-gray-900">{user.fullName}</h1>
              <p className="text-gray-500 text-sm">
                {user.role === 'GUIDE' ? '🗺️ Local Guide' : user.role === 'BOTH' ? '🌍 Guide & Traveller' : '🧳 Traveller'}
                {guide?.city && ` • ${guide.city}`}
              </p>
            </div>
            {guide && (
              <Link to={`/guides/${guide.id}`} className="btn-primary">View Guide Profile</Link>
            )}
          </div>

          {/* Stats bar (Facebook-style) */}
          <div className="flex items-center gap-6 text-sm border-t border-gray-100 pt-3">
            <div className="text-center">
              <p className="font-bold text-gray-900">{connectionCount}</p>
              <p className="text-xs text-gray-500">Tours</p>
            </div>
            {guide && (
              <>
                <div className="text-center">
                  <p className="font-bold text-gray-900">{guide.totalReviews}</p>
                  <p className="text-xs text-gray-500">Reviews</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-yellow-500">⭐ {guide.avgRating?.toFixed(1) || '0.0'}</p>
                  <p className="text-xs text-gray-500">Rating</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-green-600">{guide.totalBookings}</p>
                  <p className="text-xs text-gray-500">Bookings</p>
                </div>
              </>
            )}
            <div className="text-center ml-auto">
              <p className="text-xs text-gray-400">Member since</p>
              <p className="font-medium text-xs">{format(new Date(user.createdAt), 'MMM yyyy')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4">
        {[
          { key: 'about', label: 'About' },
          guide && { key: 'guide', label: 'Guide Info' },
          { key: 'reels', label: `Reels (${user.reels?.length || 0})` },
        ].filter(Boolean).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${activeTab === tab.key ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* About */}
      {activeTab === 'about' && (
        <div className="card p-5">
          <h3 className="font-semibold mb-3">About {user.fullName}</h3>
          {guide?.bio ? (
            <p className="text-gray-700 leading-relaxed">{guide.bio}</p>
          ) : (
            <p className="text-gray-400 italic">No bio yet</p>
          )}
          {guide && (
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              {guide.languages?.length > 0 && (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  <span>Speaks: {guide.languages.join(', ')}</span>
                </div>
              )}
              {guide.expertiseTags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {guide.expertiseTags.map(t => (
                    <span key={t} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">{t}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Guide Info */}
      {activeTab === 'guide' && guide && (
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold mb-3">Pricing</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-lg font-bold text-green-600">₹{guide.hourlyRate}</p>
                <p className="text-xs text-gray-500">per hour</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-lg font-bold text-blue-600">₹{guide.halfDayRate}</p>
                <p className="text-xs text-gray-500">half day</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-lg font-bold text-purple-600">₹{guide.fullDayRate}</p>
                <p className="text-xs text-gray-500">full day</p>
              </div>
            </div>
            <Link to={`/book/${guide.id}`} className="btn-primary w-full text-center block mt-4">
              Book {user.fullName}
            </Link>
          </div>
        </div>
      )}

      {/* Reels */}
      {activeTab === 'reels' && (
        <div>
          {user.reels?.length === 0 ? (
            <div className="card p-12 text-center text-gray-500">
              <Film className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p>No reels posted yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {user.reels?.map(reel => (
                <div key={reel.id} className="relative aspect-square bg-black rounded-lg overflow-hidden group cursor-pointer">
                  {reel.thumbnailUrl ? (
                    <img src={reel.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                      <Film className="w-8 h-8 text-white/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-end p-2">
                    <div className="flex items-center gap-2 text-white text-xs">
                      <Heart className="w-3 h-3" /> {reel.likesCount}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
