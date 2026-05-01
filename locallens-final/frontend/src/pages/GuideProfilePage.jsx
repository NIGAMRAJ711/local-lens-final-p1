import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { guideApi } from '../lib/api';
import { MapPin, Star, Clock, DollarSign, Camera, Globe, Phone, Calendar, Heart, Film, Award, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function GuideProfilePage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');

  useEffect(() => {
    guideApi.getById(id).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <Layout><div className="text-center py-16"><div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto"/></div></Layout>;
  if (!data?.guide) return <Layout><div className="text-center py-16 text-gray-500">Guide not found</div></Layout>;

  const { guide, reviews, reels } = data;

  return (
    <Layout>
      {/* Cover + Profile */}
      <div className="card overflow-hidden mb-6">
        <div className="h-48 bg-gradient-to-r from-green-500 to-emerald-400 relative">
          <div className="absolute inset-0 opacity-20 bg-[url('https://picsum.photos/seed/guide/1200/400')] bg-cover bg-center" />
        </div>
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-12 mb-4">
            {guide.user?.avatarUrl ? (
              <img src={guide.user.avatarUrl} className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg object-cover" alt="" />
            ) : (
              <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg bg-green-200 flex items-center justify-center text-3xl font-bold text-green-700">
                {guide.user?.fullName?.[0]}
              </div>
            )}
            <div className="flex-1 pt-14">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{guide.user?.fullName}</h1>
                  <p className="text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-4 h-4" />{guide.city}, {guide.country}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/book/${guide.id}`} className="btn-primary">Book Now</Link>
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-yellow-600">
              <Star className="w-4 h-4 fill-yellow-400" />
              <span className="font-bold">{guide.avgRating?.toFixed(1) || '0.0'}</span>
              <span className="text-gray-500">({guide.totalReviews} reviews)</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Award className="w-4 h-4" />
              <span>{guide.totalBookings} tours completed</span>
            </div>
            {guide.isPhotographer && (
              <div className="flex items-center gap-1.5 text-purple-600">
                <Camera className="w-4 h-4" />
                <span>Photography Guide</span>
              </div>
            )}
            <div className={`flex items-center gap-1.5 ${guide.isAvailable ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${guide.isAvailable ? 'bg-green-500' : 'bg-gray-400'}`} />
              {guide.isAvailable ? 'Available' : 'Offline'}
            </div>
          </div>

          {/* Languages */}
          <div className="flex flex-wrap gap-2 mt-3">
            {guide.languages?.map(lang => (
              <span key={lang} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                <Globe className="w-3 h-3" />{lang}
              </span>
            ))}
            {guide.expertiseTags?.map(tag => (
              <span key={tag} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">{tag}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left: Pricing */}
        <div className="md:col-span-1 space-y-4">
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Pricing</h3>
            <div className="space-y-2">
              {[
                { label: '1 Hour', value: guide.hourlyRate, icon: Clock },
                { label: 'Half Day', value: guide.halfDayRate, icon: Clock },
                { label: 'Full Day', value: guide.fullDayRate, icon: Clock },
                guide.photographyRate && { label: 'Photography', value: guide.photographyRate, icon: Camera },
              ].filter(Boolean).map(item => (
                <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <item.icon className="w-3.5 h-3.5" />{item.label}
                  </div>
                  <span className="font-semibold text-green-600">₹{item.value}</span>
                </div>
              ))}
            </div>
            <Link to={`/book/${guide.id}`} className="btn-primary w-full text-center block mt-4">
              Book This Guide
            </Link>
          </div>

          {/* Hidden Gems */}
          {guide.hiddenGems?.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold text-gray-900 mb-3">🔓 Hidden Gems</h3>
              <div className="space-y-2">
                {guide.hiddenGems.map(gem => (
                  <div key={gem.id} className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-orange-500" />
                    <div>
                      <p className="font-medium text-gray-800">{gem.name}</p>
                      <p className="text-xs text-gray-500">{gem.category} • {gem.city}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Tabs */}
        <div className="md:col-span-2">
          {/* Tab Nav */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4">
            {[
              { key: 'about', label: 'About' },
              { key: 'reviews', label: `Reviews (${guide.totalReviews})` },
              { key: 'reels', label: `Reels (${reels?.length || 0})` },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition ${activeTab === tab.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* About */}
          {activeTab === 'about' && (
            <div className="card p-5">
              <p className="text-gray-700 leading-relaxed mb-4">{guide.bio}</p>
              <p className="text-sm text-gray-500">
                Member since {format(new Date(guide.user?.createdAt || new Date()), 'MMMM yyyy')}
              </p>
            </div>
          )}

          {/* Reviews */}
          {activeTab === 'reviews' && (
            <div className="space-y-3">
              {reviews?.length === 0 ? (
                <div className="card p-8 text-center text-gray-500">No reviews yet</div>
              ) : (
                reviews?.map(r => (
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
                        <p className="text-xs text-gray-500">{format(new Date(r.createdAt), 'MMM d, yyyy')}</p>
                      </div>
                      <div className="ml-auto flex items-center gap-0.5">
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
                ))
              )}
            </div>
          )}

          {/* Reels */}
          {activeTab === 'reels' && (
            <div>
              {reels?.length === 0 ? (
                <div className="card p-8 text-center text-gray-500">No reels posted yet</div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {reels?.map(reel => (
                    <div key={reel.id} className="relative aspect-square bg-black rounded-lg overflow-hidden cursor-pointer group">
                      {reel.thumbnailUrl ? (
                        <img src={reel.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-8 h-8 text-white/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-end p-2">
                        <div className="flex items-center gap-2 text-white text-xs">
                          <Heart className="w-3 h-3" />{reel.likesCount}
                        </div>
                      </div>
                    </div>
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
