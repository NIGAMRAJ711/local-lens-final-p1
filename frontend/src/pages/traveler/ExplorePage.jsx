import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/shared/Layout';
import { guideApi } from '../../lib/api';
import { Search, MapPin, Star, Filter, X, Camera, Clock, DollarSign } from 'lucide-react';

export default function ExplorePage() {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ city: '', category: '', minPrice: '', maxPrice: '', rating: '', isAvailable: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const categories = ['Food & Cuisine', 'History', 'Art & Culture', 'Nature', 'Photography', 'Adventure', 'Street Markets', 'Architecture', 'Nightlife'];

  const loadGuides = async (reset = false) => {
    setLoading(true);
    try {
      const params = { page: reset ? 1 : page, limit: 12, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) };
      if (search) params.city = search;
      const data = await guideApi.search(params);
      if (reset) { setGuides(data.guides || []); setPage(1); }
      else setGuides(prev => [...prev, ...(data.guides || [])]);
      setPagination(data.pagination);
    } catch {
      setGuides([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadGuides(true); }, [filters]);

  const clearFilters = () => setFilters({ city: '', category: '', minPrice: '', maxPrice: '', rating: '', isAvailable: '' });

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <Layout title="Explore Guides">
      {/* Search & Filter Bar */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input-field pl-9"
            placeholder="Search by city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadGuides(true)}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-medium text-sm transition ${showFilters ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:border-green-500'}`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && <span className="bg-white text-green-700 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{activeFilterCount}</span>}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Filter Guides</h3>
            <button onClick={clearFilters} className="text-xs text-red-500 hover:underline flex items-center gap-1">
              <X className="w-3 h-3" /> Clear all
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Category</label>
              <select className="input-field text-sm" value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
                <option value="">All categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Min Price (₹/hr)</label>
              <input type="number" className="input-field text-sm" placeholder="0" value={filters.minPrice}
                onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Max Price (₹/hr)</label>
              <input type="number" className="input-field text-sm" placeholder="5000" value={filters.maxPrice}
                onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Min Rating</label>
              <select className="input-field text-sm" value={filters.rating} onChange={e => setFilters(f => ({ ...f, rating: e.target.value }))}>
                <option value="">Any rating</option>
                {[3, 3.5, 4, 4.5].map(r => <option key={r} value={r}>⭐ {r}+</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Availability</label>
              <select className="input-field text-sm" value={filters.isAvailable} onChange={e => setFilters(f => ({ ...f, isAvailable: e.target.value }))}>
                <option value="">All guides</option>
                <option value="true">Available now</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {loading && guides.length === 0 ? (
        <div className="text-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-500 mt-3 text-sm">Finding guides...</p>
        </div>
      ) : guides.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No guides found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
          <button onClick={clearFilters} className="btn-primary mt-3">Clear Filters</button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">{pagination?.total || guides.length} guides found</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {guides.map(g => (
              <Link key={g.id} to={`/guides/${g.id}`} className="card hover:shadow-lg transition group">
                {/* Cover / Avatar */}
                <div className="h-32 bg-gradient-to-br from-green-400 to-emerald-600 relative">
                  <div className="absolute bottom-3 left-3 flex items-end gap-2">
                    {g.user?.avatarUrl ? (
                      <img src={g.user.avatarUrl} className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow" alt="" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center text-xl font-bold text-green-600 shadow">
                        {g.user?.fullName?.[0]}
                      </div>
                    )}
                    {g.isAvailable && (
                      <span className="bg-green-400 text-white text-xs px-2 py-0.5 rounded-full font-medium mb-1">● Online</span>
                    )}
                  </div>
                  {g.isPhotographer && (
                    <div className="absolute top-2 right-2 bg-white/90 rounded-full p-1">
                      <Camera className="w-4 h-4 text-purple-600" />
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition">{g.user?.fullName}</h3>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{g.avgRating?.toFixed(1) || '0.0'}</span>
                      <span className="text-gray-400 text-xs">({g.totalReviews})</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mb-2">
                    <MapPin className="w-3 h-3" />{g.city}, {g.country}
                  </p>
                  <p className="text-xs text-gray-600 line-clamp-2 mb-3">{g.bio}</p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {g.expertiseTags?.slice(0, 3).map(tag => (
                      <span key={tag} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-3 text-gray-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{g.totalBookings} tours</span>
                    </div>
                    <span className="text-green-600 font-bold">₹{g.hourlyRate}/hr</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {pagination && page < pagination.pages && (
            <div className="text-center mt-6">
              <button onClick={() => { setPage(p => p + 1); loadGuides(); }} disabled={loading}
                className="btn-outline px-8">
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
