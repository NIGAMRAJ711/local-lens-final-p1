import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { groupTourApi, uploadApi } from '../../lib/api';
import { Users, MapPin, Calendar, Clock, Filter, X, Plus, Share2, Image, ChevronDown, ChevronUp, CheckCircle, CreditCard, MessageCircle } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

const CATEGORIES = ['Cultural','Food','Adventure','History','Nature','Photography','Night Life','Shopping','Beach','Spirituality','Heritage'];

const CITY_GRADIENTS = {
  Mumbai: 'linear-gradient(135deg,#f093fb,#f5576c)',
  Delhi: 'linear-gradient(135deg,#4facfe,#00f2fe)',
  Jaipur: 'linear-gradient(135deg,#fa709a,#fee140)',
  Goa: 'linear-gradient(135deg,#43e97b,#38f9d7)',
  Varanasi: 'linear-gradient(135deg,#f6d365,#fda085)',
  Kochi: 'linear-gradient(135deg,#0fd850,#f9f047)',
  Udaipur: 'linear-gradient(135deg,#a18cd1,#fbc2eb)',
  Bangalore: 'linear-gradient(135deg,#667eea,#764ba2)',
};

function formatTourDate(d) {
  try {
    const dt = typeof d === 'string' ? parseISO(d) : new Date(d);
    if (!isValid(dt)) return d;
    return format(dt, 'EEE, MMM d yyyy');
  } catch { return d; }
}

// Photo carousel with scroll-snap
function PhotoCarousel({ photos, coverImage, city, title }) {
  const [idx, setIdx] = useState(0);
  const imgs = photos?.length ? photos : coverImage ? [coverImage] : [];
  const gradient = CITY_GRADIENTS[city] || 'linear-gradient(135deg,#11998e,#38ef7d)';

  if (!imgs.length) return (
    <div className="h-48 flex items-center justify-center" style={{ background: gradient }}>
      <Users className="w-14 h-14 text-white/30" />
    </div>
  );

  return (
    <div className="relative overflow-hidden" style={{ height: 200 }}>
      {/* Scrollable strip */}
      <div className="flex h-full" style={{ scrollSnapType: 'x mandatory', overflowX: 'auto', scrollbarWidth: 'none' }}
        id={`carousel-${title?.slice(0,10)}`}
        onScroll={e => {
          const el = e.target;
          setIdx(Math.round(el.scrollLeft / el.offsetWidth));
        }}>
        {imgs.map((url, i) => (
          <div key={i} className="flex-shrink-0 w-full h-full" style={{ scrollSnapAlign: 'start' }}>
            <img src={url} alt="" className="w-full h-full object-cover"
              onError={e => { e.target.style.display='none'; e.target.parentElement.style.background=gradient; }} />
          </div>
        ))}
      </div>
      {/* Dot indicators */}
      {imgs.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {imgs.map((_, i) => (
            <button key={i}
              onClick={() => {
                const el = document.getElementById(`carousel-${title?.slice(0,10)}`);
                el?.scrollTo({ left: i * el.offsetWidth, behavior: 'smooth' });
                setIdx(i);
              }}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? 'bg-white w-3' : 'bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Overlapping member avatars stack
function MemberAvatars({ members, maxMembers }) {
  const count = members?.length || 0;
  const show = members?.slice(0, 5) || [];
  const extra = count > 5 ? count - 5 : 0;
  const pct = maxMembers > 0 ? Math.min(100, (count / maxMembers) * 100) : 0;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex" style={{ direction: 'ltr' }}>
          {show.map((m, i) => (
            <div key={i} className="rounded-full border-2 border-white overflow-hidden flex-shrink-0"
              style={{ width: 28, height: 28, marginLeft: i === 0 ? 0 : -8, zIndex: show.length - i }}>
              {m?.user?.avatarUrl ? (
                <img src={m.user.avatarUrl} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: `hsl(${(i * 60) % 360},60%,55%)` }}>
                  {m?.user?.fullName?.[0] || '?'}
                </div>
              )}
            </div>
          ))}
          {extra > 0 && (
            <div className="rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0"
              style={{ width: 28, height: 28, marginLeft: -8 }}>
              +{extra}
            </div>
          )}
        </div>
        <span className="text-xs text-gray-500">{count}/{maxMembers} joined</span>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function GroupToursPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [tours, setTours] = useState([]);
  const [myJoined, setMyJoined] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState('discover');
  const [expandedTour, setExpandedTour] = useState(null);
  const [joiningId, setJoiningId] = useState(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [filters, setFilters] = useState({ city: '', category: '', minPrice: '', maxPrice: '' });
  const [pendingFilters, setPendingFilters] = useState({ city: '', category: '', minPrice: '', maxPrice: '' });

  const [createForm, setCreateForm] = useState({
    title: '', description: '', city: '', date: '', startTime: '', duration: '3 hours',
    maxMembers: 8, pricePerPerson: '', meetupPoint: '', category: [],
    whatsappLink: '', photos: [],
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async (f = filters) => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(f).filter(([,v]) => v));
      const [t, j] = await Promise.all([
        groupTourApi.list(params).catch(() => ({ tours: [] })),
        user ? groupTourApi.myJoined().catch(() => ({ tours: [] })) : Promise.resolve({ tours: [] }),
      ]);
      setTours(t.tours || []);
      setMyJoined((j.tours || []).filter(Boolean));
    } finally { setLoading(false); }
  };

  const applyFilters = () => { setFilters({...pendingFilters}); loadData(pendingFilters); setShowFilters(false); };
  const clearFilters = () => {
    const e = { city:'', category:'', minPrice:'', maxPrice:'' };
    setFilters(e); setPendingFilters(e); loadData(e);
    toast.info('Filters cleared');
  };

  const handleJoin = async (tourId, pricePerPerson, title) => {
    if (!user) { toast.error('Please log in to join tours'); return; }
    setJoiningId(tourId);
    try {
      await groupTourApi.join(tourId);
      await loadData();
      toast.success("You're in! 🥳", `You joined "${title}". Payment of ₹${pricePerPerson} at meetup.`);
    } catch (err) { toast.error(err.message); }
    finally { setJoiningId(null); }
  };

  const handleShare = async (tour) => {
    const text = `Join "${tour.title}" in ${tour.city} on ${formatTourDate(tour.date)} — ₹${tour.pricePerPerson}/person!`;
    try {
      if (navigator.share) await navigator.share({ title: tour.title, text, url: window.location.href });
      else { await navigator.clipboard.writeText(text); toast.success('Copied!', 'Tour details copied to clipboard'); }
    } catch {}
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (createForm.photos.length + files.length > 5) { toast.error('Max 5 photos allowed'); return; }
    setUploadingPhotos(true);
    try {
      const uploaded = await Promise.all(files.map(f => uploadApi.image(f)));
      const urls = uploaded.map(r => r.url);
      setCreateForm(f => ({ ...f, photos: [...f.photos, ...urls] }));
      toast.success(`${urls.length} photo${urls.length > 1 ? 's' : ''} uploaded!`);
    } catch (err) { toast.error('Upload failed: ' + err.message); }
    finally { setUploadingPhotos(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.title || !createForm.city || !createForm.date || !createForm.pricePerPerson) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      await groupTourApi.create({
        ...createForm,
        coverImage: createForm.photos[0] || '',
      });
      setShowCreate(false);
      setCreateForm({ title:'', description:'', city:'', date:'', startTime:'', duration:'3 hours', maxMembers:8, pricePerPerson:'', meetupPoint:'', category:[], whatsappLink:'', photos:[] });
      await loadData();
      toast.success('Group tour created! 🎉', 'Your tour is now visible to travelers');
    } catch (err) { toast.error(err.message); }
  };

  const isJoined = (tourId) => myJoined.some(t => t?.id === tourId);
  const displayTours = activeTab === 'discover' ? tours : myJoined.filter(Boolean);

  return (
    <Layout title="Group Tours">
      {/* Header row — Create open to ALL logged-in users */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[
          { key: 'discover', label: '🌍 Discover' },
          { key: 'joined', label: `📋 My Tours (${myJoined.length})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === tab.key ? 'bg-green-600 text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:border-green-400'}`}>
            {tab.label}
          </button>
        ))}
        {user && (
          <button onClick={() => setShowCreate(true)}
            className="ml-auto flex items-center gap-1.5 btn-primary text-sm">
            <Plus className="w-4 h-4" /> Create Tour
          </button>
        )}
      </div>

      {/* Filter row */}
      {activeTab === 'discover' && (
        <div className="flex gap-2 mb-4">
          <input className="input-field flex-1 text-sm" placeholder="Search by city..."
            value={pendingFilters.city} onChange={e => setPendingFilters(f => ({ ...f, city: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && applyFilters()} />
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition ${showFilters ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'}`}>
            <Filter className="w-4 h-4" /> Filters
          </button>
          <button onClick={applyFilters} className="btn-primary text-sm px-4">Search</button>
        </div>
      )}

      {showFilters && (
        <div className="card p-4 mb-4 border-2 border-green-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">Filter Tours</h3>
            <button onClick={() => setShowFilters(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Category</label>
              <select className="input-field text-sm" value={pendingFilters.category}
                onChange={e => setPendingFilters(f => ({ ...f, category: e.target.value }))}>
                <option value="">All</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Min Price (₹)</label>
              <input type="number" className="input-field text-sm" placeholder="0"
                value={pendingFilters.minPrice} onChange={e => setPendingFilters(f => ({ ...f, minPrice: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Max Price (₹)</label>
              <input type="number" className="input-field text-sm" placeholder="5000"
                value={pendingFilters.maxPrice} onChange={e => setPendingFilters(f => ({ ...f, maxPrice: e.target.value }))} />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={applyFilters} className="btn-primary flex-1 text-sm">Apply</button>
              <button onClick={clearFilters} className="btn-secondary text-sm px-3">Clear</button>
            </div>
          </div>
        </div>
      )}

      {/* Tours grid */}
      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto" />
        </div>
      ) : displayTours.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-lg">{activeTab === 'joined' ? 'No tours joined yet' : 'No tours found'}</p>
          {activeTab === 'joined' && <button onClick={() => setActiveTab('discover')} className="btn-primary mt-3">Browse Tours</button>}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayTours.filter(Boolean).map(tour => {
            const memberCount = tour._count?.members || tour.members?.length || 0;
            const spotsLeft = tour.maxMembers - memberCount;
            const joined = isJoined(tour.id);
            const isExpanded = expandedTour === tour.id;

            return (
              <div key={tour.id} className="card hover:shadow-xl transition-shadow overflow-hidden flex flex-col">
                {/* Photo carousel */}
                <div className="relative">
                  <PhotoCarousel photos={tour.photos} coverImage={tour.coverImage} city={tour.city} title={tour.title} />
                  {/* Spots badge */}
                  <div className={`absolute top-2 right-2 text-xs font-bold px-2.5 py-1 rounded-full ${spotsLeft === 0 ? 'bg-red-500 text-white' : spotsLeft <= 2 ? 'bg-orange-400 text-white' : 'bg-white/90 text-gray-800'}`}>
                    {spotsLeft === 0 ? 'Full' : `${spotsLeft} spot${spotsLeft > 1 ? 's' : ''} left`}
                  </div>
                  {joined && (
                    <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Joined
                    </div>
                  )}
                  {/* Category pills */}
                  <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap max-w-[80%]">
                    {tour.category?.slice(0, 3).map(c => (
                      <span key={c} className="bg-black/50 backdrop-blur text-white text-xs px-2 py-0.5 rounded-full">{c}</span>
                    ))}
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-gray-900 mb-1 text-base line-clamp-1">{tour.title}</h3>

                  {/* Tour meta */}
                  <div className="space-y-1 text-xs text-gray-600 mb-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-green-500" />
                      <span>{tour.city}</span>
                      {tour.meetupPoint && <span className="text-gray-400">· {tour.meetupPoint}</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-blue-500" />
                      <span className="font-medium">{formatTourDate(tour.date)}</span>
                      {tour.startTime && <span className="text-gray-400">at {tour.startTime}</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-orange-500" />
                        <span>{tour.duration}</span>
                      </div>
                      <span className="text-green-600 font-bold">₹{tour.pricePerPerson}<span className="font-normal text-gray-400">/person</span></span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className={`text-xs text-gray-500 mb-2 ${isExpanded ? '' : 'line-clamp-2'}`}>{tour.description}</p>

                  {/* Member avatars */}
                  {tour.members && <MemberAvatars members={tour.members} maxMembers={tour.maxMembers} />}

                  {/* Expand toggle */}
                  <button onClick={() => setExpandedTour(isExpanded ? null : tour.id)}
                    className="flex items-center gap-1 text-xs text-green-600 hover:underline mt-2 mb-2">
                    {isExpanded ? <><ChevronUp className="w-3 h-3" />Less</> : <><ChevronDown className="w-3 h-3" />More details</>}
                  </button>

                  {isExpanded && (
                    <div className="bg-gray-50 rounded-xl p-3 mb-3 text-xs text-gray-600 space-y-2">
                      {tour.guide?.user && (
                        <div className="flex items-center gap-2">
                          {tour.guide.user.avatarUrl ? (
                            <img src={tour.guide.user.avatarUrl} className="w-6 h-6 rounded-full object-cover" alt="" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center text-xs font-bold text-green-700">
                              {tour.guide.user.fullName?.[0]}
                            </div>
                          )}
                          <span>Hosted by <span className="font-medium">{tour.guide.user.fullName}</span></span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-green-700">
                        <CreditCard className="w-3 h-3" />
                        <span>₹{tour.pricePerPerson} collected at meetup</span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto">
                    <button onClick={() => handleShare(tour)}
                      className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition" title="Share">
                      <Share2 className="w-4 h-4 text-gray-500" />
                    </button>

                    {/* WhatsApp button */}
                    {tour.whatsappLink && (
                      <a href={tour.whatsappLink} target="_blank" rel="noopener noreferrer"
                        className="p-2 border border-green-200 bg-green-50 rounded-xl hover:bg-green-100 transition" title="WhatsApp Group">
                        <MessageCircle className="w-4 h-4 text-green-600" />
                      </a>
                    )}

                    <button
                      onClick={() => !joined && spotsLeft > 0 && handleJoin(tour.id, tour.pricePerPerson, tour.title)}
                      disabled={joined || spotsLeft === 0 || joiningId === tour.id}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
                        joined ? 'bg-green-50 text-green-700 border border-green-200' :
                        spotsLeft === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                        'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                      }`}>
                      {joiningId === tour.id ? (
                        <span className="flex items-center justify-center gap-1.5">
                          <div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                          Joining...
                        </span>
                      ) : joined ? '✓ Joined' : spotsLeft === 0 ? 'Tour Full' : 'Join Tour'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Tour Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Create Group Tour</h2>
                <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-3">
                {/* Photos upload (up to 5) */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Photos (up to 5)</label>
                  <div className="flex gap-2 flex-wrap">
                    {createForm.photos.map((url, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
                        <img src={url} className="w-full h-full object-cover" alt="" />
                        <button type="button"
                          onClick={() => setCreateForm(f => ({ ...f, photos: f.photos.filter((_, j) => j !== i) }))}
                          className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
                          ×
                        </button>
                      </div>
                    ))}
                    {createForm.photos.length < 5 && (
                      <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-green-400 transition">
                        <Image className="w-6 h-6 text-gray-400 mb-0.5" />
                        <span className="text-xs text-gray-400">{uploadingPhotos ? '...' : 'Add'}</span>
                        <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhotos} />
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Title *</label>
                  <input className="input-field text-sm" placeholder="e.g. Mumbai Street Food Crawl 🍢" value={createForm.title}
                    onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} required />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
                  <textarea className="input-field text-sm" rows={3} placeholder="Describe the experience..."
                    value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">City *</label>
                    <input className="input-field text-sm" placeholder="City" value={createForm.city}
                      onChange={e => setCreateForm(f => ({ ...f, city: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Date *</label>
                    <input type="date" className="input-field text-sm" value={createForm.date}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setCreateForm(f => ({ ...f, date: e.target.value }))} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Start Time *</label>
                    <input type="time" className="input-field text-sm" value={createForm.startTime}
                      onChange={e => setCreateForm(f => ({ ...f, startTime: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Duration</label>
                    <input className="input-field text-sm" placeholder="e.g. 3 hours" value={createForm.duration}
                      onChange={e => setCreateForm(f => ({ ...f, duration: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Max Members</label>
                    <input type="number" className="input-field text-sm" min="2" max="20" value={createForm.maxMembers}
                      onChange={e => setCreateForm(f => ({ ...f, maxMembers: parseInt(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Price/Person (₹) *</label>
                    <input type="number" className="input-field text-sm" placeholder="499" value={createForm.pricePerPerson}
                      onChange={e => setCreateForm(f => ({ ...f, pricePerPerson: e.target.value }))} required />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Meetup Point *</label>
                  <input className="input-field text-sm" placeholder="Exact meeting location" value={createForm.meetupPoint}
                    onChange={e => setCreateForm(f => ({ ...f, meetupPoint: e.target.value }))} required />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    WhatsApp Group Link <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <input className="input-field text-sm" placeholder="https://chat.whatsapp.com/..." value={createForm.whatsappLink}
                    onChange={e => setCreateForm(f => ({ ...f, whatsappLink: e.target.value }))} />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Categories</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map(c => (
                      <button type="button" key={c}
                        onClick={() => setCreateForm(f => ({
                          ...f, category: f.category.includes(c) ? f.category.filter(x => x !== c) : [...f.category, c]
                        }))}
                        className={`text-xs px-2.5 py-1 rounded-full transition font-medium ${createForm.category.includes(c) ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" className="btn-primary flex-1">Create Tour 🎉</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
