import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../../components/shared/Layout';
import { useToast } from '../../context/ToastContext';
import { guideApi } from '../../lib/api';
import { Camera, Clock, Filter, MapPin, Search, Sparkles, Star, X } from 'lucide-react';

const EMPTY_FILTERS = { city: '', category: '', minPrice: '', maxPrice: '', rating: '', isAvailable: '' };
const CATEGORIES = ['Food & Cuisine','History','Art & Culture','Nature','Photography','Adventure','Street Markets','Architecture','Nightlife','Spirituality','Beach'];

function savedFilters() {
  try { return JSON.parse(localStorage.getItem('exploreFilters') || '{}'); }
  catch { return {}; }
}

function GuideCard({ guide, recommended = false }) {
  return (
    <Link to={`/guides/${guide.id}`} className="card hover:shadow-xl transition group overflow-hidden">
      <div className="h-32 relative overflow-hidden">
        {guide.coverImage ? <img src={guide.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="" /> : <div className="w-full h-full bg-gradient-to-br from-green-400 to-emerald-600" />}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
        <div className="absolute bottom-3 left-3 flex items-end gap-2">
          {guide.user?.avatarUrl ? <img src={guide.user.avatarUrl} className="w-14 h-14 rounded-xl border-2 border-white shadow object-cover" alt="" /> : <div className="w-14 h-14 rounded-xl border-2 border-white shadow bg-green-500 flex items-center justify-center text-xl font-bold text-white">{guide.user?.fullName?.[0]}</div>}
          {guide.isAvailable && <span className="bg-green-400 text-white text-xs px-2 py-0.5 rounded-full font-medium mb-1">Online</span>}
        </div>
        {recommended && <div className="absolute top-2 left-2 bg-white text-green-700 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1"><Sparkles className="w-3 h-3" /> For you</div>}
        {guide.isPhotographer && <div className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5"><Camera className="w-3.5 h-3.5 text-purple-600" /></div>}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition line-clamp-1">{guide.user?.fullName}</h3>
          <div className="flex items-center gap-0.5 text-sm flex-shrink-0 ml-2">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span className="font-medium text-gray-700">{guide.avgRating?.toFixed(1) || '0.0'}</span>
          </div>
        </div>
        <p className="text-sm text-gray-500 flex items-center gap-1 mb-2"><MapPin className="w-3 h-3" />{guide.city}, {guide.country}</p>
        <p className="text-xs text-gray-600 line-clamp-2 mb-3">{guide.bio}</p>
        <div className="flex flex-wrap gap-1 mb-3">
          {(guide.badges || []).slice(0, 2).map(b => <span key={b.id} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{b.label}</span>)}
          {guide.expertiseTags?.slice(0, 2).map(tag => <span key={tag} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{tag}</span>)}
        </div>
        <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-3">
          <span className="flex items-center gap-1 text-gray-500 text-xs"><Clock className="w-3 h-3" />{guide.totalBookings} tours</span>
          <span className="text-green-600 font-bold">Rs{guide.hourlyRate}/hr</span>
        </div>
      </div>
    </Link>
  );
}

export default function ExplorePage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilters = useMemo(() => ({ ...EMPTY_FILTERS, ...savedFilters(), ...Object.fromEntries(searchParams.entries()) }), []);
  const [guides, setGuides] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState(searchParams.get('city') || '');
  const [pendingFilters, setPendingFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [pagination, setPagination] = useState(null);

  const activeCount = Object.values(appliedFilters).filter(Boolean).length;

  useEffect(() => {
    loadGuides(1, appliedFilters, search);
    guideApi.recommend().then(d => setRecommendations(d.recommendations || [])).catch(() => {});
  }, []);

  const syncFilters = (filters, citySearch) => {
    localStorage.setItem('exploreFilters', JSON.stringify(filters));
    const params = new URLSearchParams();
    if (citySearch) params.set('city', citySearch);
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    setSearchParams(params, { replace: true });
  };

  const loadGuides = async (page = 1, filters = appliedFilters, citySearch = search) => {
    setLoading(true);
    try {
      const params = { page, limit: 12 };
      if (citySearch) params.city = citySearch;
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const data = await guideApi.search(params);
      setGuides(data.guides || []);
      setPagination(data.pagination);
      syncFilters(filters, citySearch);
    } catch {
      toast.error('Failed to load guides');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadGuides(1, appliedFilters, search);
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...pendingFilters });
    setShowFilters(false);
    loadGuides(1, pendingFilters, search);
    if (Object.values(pendingFilters).some(Boolean)) toast.success('Filters applied');
  };

  const handleClearFilters = () => {
    setPendingFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setSearch('');
    localStorage.removeItem('exploreFilters');
    setSearchParams({}, { replace: true });
    loadGuides(1, EMPTY_FILTERS, '');
  };

  return (
    <Layout title="Explore Guides">
      {recommendations.length > 0 && (
        <section className="mb-7">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-green-600" />
            <h2 className="font-bold text-gray-900">Recommended For You</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendations.slice(0, 3).map(g => <GuideCard key={g.id} guide={g} recommended />)}
          </div>
        </section>
      )}

      <form onSubmit={handleSearch} className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input-field pl-9" placeholder="Search by city..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary px-5">Search</button>
      </form>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${activeCount ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'}`}>
          <Filter className="w-3.5 h-3.5" /> Filters {activeCount > 0 && `(${activeCount})`}
        </button>
        <button onClick={() => { const next = { ...appliedFilters, rating: appliedFilters.rating === '4' ? '' : '4' }; setAppliedFilters(next); setPendingFilters(next); loadGuides(1,next,search); }} className="px-3 py-1.5 rounded-full text-sm border bg-white">Top Rated</button>
        <button onClick={() => { const next = { ...appliedFilters, isAvailable: appliedFilters.isAvailable === 'true' ? '' : 'true' }; setAppliedFilters(next); setPendingFilters(next); loadGuides(1,next,search); }} className="px-3 py-1.5 rounded-full text-sm border bg-white">Available Now</button>
        {activeCount > 0 && <button onClick={handleClearFilters} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm text-red-600 border border-red-200"><X className="w-3.5 h-3.5" /> Clear Filters</button>}
      </div>

      {showFilters && (
        <div className="card p-5 mb-5 border-2 border-green-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <select className="input-field text-sm" value={pendingFilters.category} onChange={e => setPendingFilters(f => ({ ...f, category: e.target.value }))}>
              <option value="">All categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" className="input-field text-sm" placeholder="Min price" value={pendingFilters.minPrice} onChange={e => setPendingFilters(f => ({ ...f, minPrice: e.target.value }))} />
            <input type="number" className="input-field text-sm" placeholder="Max price" value={pendingFilters.maxPrice} onChange={e => setPendingFilters(f => ({ ...f, maxPrice: e.target.value }))} />
            <select className="input-field text-sm" value={pendingFilters.rating} onChange={e => setPendingFilters(f => ({ ...f, rating: e.target.value }))}>
              <option value="">Any rating</option>
              {[3, 3.5, 4, 4.5].map(r => <option key={r} value={r}>{r}+ stars</option>)}
            </select>
            <select className="input-field text-sm" value={pendingFilters.isAvailable} onChange={e => setPendingFilters(f => ({ ...f, isAvailable: e.target.value }))}>
              <option value="">All guides</option>
              <option value="true">Available now only</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={handleClearFilters} className="btn-secondary flex-1 text-sm">Clear All</button>
            <button onClick={handleApplyFilters} className="btn-primary flex-1 text-sm">Apply Filters</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16"><div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto" /></div>
      ) : guides.length === 0 ? (
        <div className="text-center py-16 text-gray-500"><Search className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p className="font-medium text-lg">No guides found</p><button onClick={handleClearFilters} className="btn-primary mt-4">Clear Filters</button></div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">{pagination?.total || guides.length} guides found</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{guides.map(g => <GuideCard key={g.id} guide={g} />)}</div>
          {pagination && pagination.pages > 1 && <div className="flex justify-center gap-2 mt-8">{Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => i + 1).map(p => <button key={p} onClick={() => loadGuides(p, appliedFilters, search)} className={`w-9 h-9 rounded-lg text-sm font-medium ${p === pagination.page ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{p}</button>)}</div>}
        </>
      )}
    </Layout>
  );
}
