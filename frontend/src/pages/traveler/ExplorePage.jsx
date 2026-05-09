import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/shared/Layout';
import { useToast } from '../../context/ToastContext';
import { guideApi } from '../../lib/api';
import { Search, MapPin, Star, Filter, X, Camera, Clock, Locate, SlidersHorizontal } from 'lucide-react';

const CATEGORIES = ['Food & Cuisine','History','Art & Culture','Nature','Photography','Adventure','Street Markets','Architecture','Nightlife','Spirituality','Beach'];

export default function ExplorePage() {
  const toast = useToast();
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState(null);
  const [nearMeActive, setNearMeActive] = useState(false);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);

  const [pendingFilters, setPendingFilters] = useState({ city:'', category:'', minPrice:'', maxPrice:'', rating:'', isAvailable:'', isPhotographer:'' });
  const [appliedFilters, setAppliedFilters] = useState({ city:'', category:'', minPrice:'', maxPrice:'', rating:'', isAvailable:'', isPhotographer:'' });

  const activeCount = Object.values(appliedFilters).filter(Boolean).length;

  useEffect(() => { loadGuides(1, appliedFilters, search); }, []);

  const loadGuides = async (page=1, filters=appliedFilters, searchVal=search, gpsCoords=null) => {
    setLoading(true);
    try {
      const params = { page, limit: 12 };
      if (searchVal) params.search = searchVal;
      if (gpsCoords) { params.lat = gpsCoords.lat; params.lng = gpsCoords.lng; params.radius = 50; }
      Object.entries(filters).forEach(([k,v]) => { if (v) params[k] = v; });
      const data = await guideApi.search(params);
      setGuides(data.guides || []);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load guides'); }
    finally { setLoading(false); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setNearMeActive(false);
    loadGuides(1, appliedFilters, search);
  };

  const handleNearMe = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported by your browser'); return; }
    setNearMeLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNearMeActive(true);
        setNearMeLoading(false);
        loadGuides(1, appliedFilters, '', { lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success('Showing guides near you 📍');
      },
      () => { setNearMeLoading(false); toast.error('Could not get your location. Please allow location access.'); }
    );
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...pendingFilters });
    setShowFilters(false);
    setPriceOpen(false);
    loadGuides(1, pendingFilters, search);
  };

  const togglePill = (key, value) => {
    const newF = { ...appliedFilters, [key]: appliedFilters[key] === value ? '' : value };
    setAppliedFilters(newF);
    setPendingFilters(newF);
    loadGuides(1, newF, search);
  };

  const clearAll = () => {
    const e = { city:'', category:'', minPrice:'', maxPrice:'', rating:'', isAvailable:'', isPhotographer:'' };
    setAppliedFilters(e); setPendingFilters(e); setSearch(''); setNearMeActive(false);
    loadGuides(1, e, '');
    toast.info('Filters cleared');
  };
    if (Object.values(pendingFilters).some(Boolean)) {
      toast.success('Filters applied');
    }
  };

  const handleClearFilters = () => {
    const empty = { city: '', category: '', minPrice: '', maxPrice: '', rating: '', isAvailable: '' };
    setPendingFilters(empty);
    setAppliedFilters(empty);
    setSearch('');
    loadGuides(1, empty, '');
    toast.info('Filters cleared');
  };

  return (
    <Layout title="Explore Guides">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input-field pl-9"
            placeholder="Search guides by city, name, tags..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary px-5">Search</button>
        <button type="button" onClick={() => { setPendingFilters(appliedFilters); setShowFilters(!showFilters); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-medium text-sm transition relative ${showFilters ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:border-green-500'}`}>
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{activeCount}</span>}
        </button>
      </form>

      {/* Quick pill filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        <button onClick={handleNearMe} disabled={nearMeLoading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition border flex-shrink-0 ${nearMeActive ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200 hover:border-green-400'}`}>
          {nearMeLoading ? <div className="animate-spin w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" /> : <Locate className="w-3.5 h-3.5" />}
          Near Me
        </button>
        <button onClick={() => setPriceOpen(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition border flex-shrink-0 ${(appliedFilters.minPrice||appliedFilters.maxPrice) ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200 hover:border-green-400'}`}>
          ₹ Price
        </button>
        <button onClick={() => togglePill('rating','4')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition border flex-shrink-0 ${appliedFilters.rating==='4' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200 hover:border-green-400'}`}>
          ⭐ 4+ Rating
        </button>
        <button onClick={() => togglePill('isPhotographer','true')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition border flex-shrink-0 ${appliedFilters.isPhotographer==='true' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200 hover:border-green-400'}`}>
          📷 Photographer
        </button>
        <button onClick={() => togglePill('isAvailable','true')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition border flex-shrink-0 ${appliedFilters.isAvailable==='true' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200 hover:border-green-400'}`}>
          <Clock className="w-3.5 h-3.5" /> Available Now
        </button>
        {activeCount > 0 && (
          <button onClick={clearAll} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm text-red-500 border border-red-200 hover:bg-red-50 whitespace-nowrap flex-shrink-0 transition">
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      {/* Price range dropdown */}
      {priceOpen && (
        <div className="card p-4 mb-4 border-2 border-green-200">
          <p className="text-sm font-semibold text-gray-700 mb-3">Price per hour (₹)</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Min ₹</label>
              <input type="number" className="input-field text-sm" placeholder="0" min="0" step="100"
                value={pendingFilters.minPrice} onChange={e => setPendingFilters(f => ({ ...f, minPrice: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Max ₹</label>
              <input type="number" className="input-field text-sm" placeholder="5000" min="0" step="100"
                value={pendingFilters.maxPrice} onChange={e => setPendingFilters(f => ({ ...f, maxPrice: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setPendingFilters(f => ({...f,minPrice:'',maxPrice:''})); setAppliedFilters(f => ({...f,minPrice:'',maxPrice:''})); setPriceOpen(false); loadGuides(1,{...appliedFilters,minPrice:'',maxPrice:''},search); }} className="btn-secondary text-sm flex-1">Clear</button>
            <button onClick={handleApplyFilters} className="btn-primary text-sm flex-1">Apply</button>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(appliedFilters).filter(([,v]) => v).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1 text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
              {k === 'isAvailable' ? 'Available Now' : k === 'isPhotographer' ? 'Photographer' : k === 'rating' ? `⭐ ${v}+` : `${k}: ${v}`}
              <button onClick={() => {
                const updated = { ...appliedFilters, [k]: '' };
                setAppliedFilters(updated);
                setPendingFilters(updated);
                loadGuides(1, updated, search);
              }}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button onClick={handleClearFilters} className="text-xs text-red-500 hover:underline px-1">
            Clear all
          </button>
        </div>
      )}

      {/* Filters panel */}
      {showFilters && (
        <div className="card p-5 mb-5 border-2 border-green-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 text-sm">Filter Guides</h3>
            <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Category</label>
              <select className="input-field text-sm" value={pendingFilters.category}
                onChange={e => setPendingFilters(f => ({ ...f, category: e.target.value }))}>
                <option value="">All categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Min Price (₹/hr)</label>
              <input type="number" className="input-field text-sm" placeholder="e.g. 200"
                value={pendingFilters.minPrice}
                onChange={e => setPendingFilters(f => ({ ...f, minPrice: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Max Price (₹/hr)</label>
              <input type="number" className="input-field text-sm" placeholder="e.g. 2000"
                value={pendingFilters.maxPrice}
                onChange={e => setPendingFilters(f => ({ ...f, maxPrice: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Min Rating</label>
              <select className="input-field text-sm" value={pendingFilters.rating}
                onChange={e => setPendingFilters(f => ({ ...f, rating: e.target.value }))}>
                <option value="">Any rating</option>
                {[3, 3.5, 4, 4.5].map(r => <option key={r} value={r}>⭐ {r}+</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Availability</label>
              <select className="input-field text-sm" value={pendingFilters.isAvailable}
                onChange={e => setPendingFilters(f => ({ ...f, isAvailable: e.target.value }))}>
                <option value="">All guides</option>
                <option value="true">Available now only</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleClearFilters} className="btn-secondary flex-1 text-sm">
              Clear All
            </button>
            <button onClick={handleApplyFilters} className="btn-primary flex-1 text-sm">
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-500 mt-3 text-sm">Finding guides...</p>
        </div>
      ) : guides.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-lg">No guides found</p>
          <p className="text-sm mt-1">Try a different city or clear filters</p>
          <button onClick={handleClearFilters} className="btn-primary mt-4">Clear Filters</button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {pagination?.total || guides.length} guides found
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {guides.map(g => (
              <Link key={g.id} to={`/guides/${g.id}`} className="card hover:shadow-xl transition group">
                {/* Cover area */}
                <div className="h-32 relative overflow-hidden">
                  {g.coverImage ? (
                    <img src={g.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-green-400 to-emerald-600" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
                  <div className="absolute bottom-3 left-3 flex items-end gap-2">
                    {g.user?.avatarUrl ? (
                      <img src={g.user.avatarUrl} className="w-14 h-14 rounded-xl border-2 border-white shadow object-cover" alt="" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl border-2 border-white shadow bg-green-500 flex items-center justify-center text-xl font-bold text-white">
                        {g.user?.fullName?.[0]}
                      </div>
                    )}
                    {g.isAvailable && (
                      <span className="bg-green-400 text-white text-xs px-2 py-0.5 rounded-full font-medium mb-1">● Online</span>
                    )}
                  </div>
                  {g.isPhotographer && (
                    <div className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5">
                      <Camera className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition line-clamp-1">
                      {g.user?.fullName}
                    </h3>
                    <div className="flex items-center gap-0.5 text-sm flex-shrink-0 ml-2">
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium text-gray-700">{g.avgRating?.toFixed(1) || '0.0'}</span>
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
                    <span className="flex items-center gap-1 text-gray-500 text-xs">
                      <Clock className="w-3 h-3" />{g.totalBookings} tours
                    </span>
                    <span className="text-green-600 font-bold">₹{g.hourlyRate}/hr</span>
                    {g.distanceKm != null && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{g.distanceKm} km away</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).slice(0, 5).map(p => (
                <button key={p} onClick={() => loadGuides(p, appliedFilters, search)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition ${p === pagination.page ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-green-400'}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
