import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { groupTourApi, uploadApi } from '../../lib/api';
import { Users, MapPin, Calendar, Clock, Filter, X, Plus, Share2, Image, ChevronDown, ChevronUp, CheckCircle, CreditCard, MessageCircle } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

const CATEGORIES = ['Adventure','Food','Culture','Photography','Nature','Heritage','Nightlife','Shopping','Beach','Spirituality'];

const CITY_GRADIENTS = {
  'Mumbai':    'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)',
  'Delhi':     'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)',
  'Jaipur':    'linear-gradient(135deg,#fa709a 0%,#fee140 100%)',
  'Goa':       'linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)',
  'Varanasi':  'linear-gradient(135deg,#f6d365 0%,#fda085 100%)',
  'Kochi':     'linear-gradient(135deg,#0fd850 0%,#f9f047 100%)',
  'Udaipur':   'linear-gradient(135deg,#a18cd1 0%,#fbc2eb 100%)',
  'Bangalore': 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
};

function formatTourDate(dateStr) {
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    if (!isValid(d)) return dateStr;
    return format(d, 'EEE, MMM d yyyy');
  } catch { return dateStr; }
}

// Photo carousel with CSS scroll-snap
function PhotoCarousel({ photos, city, height = 200 }) {
  const [idx, setIdx] = useState(0);
  const gradient = CITY_GRADIENTS[city] || 'linear-gradient(135deg,#11998e 0%,#38ef7d 100%)';
  if (!photos?.length) {
    return (
      <div style={{ height, background: gradient, borderRadius: '12px 12px 0 0' }}
        className="flex items-center justify-center">
        <p className="text-white font-bold text-lg drop-shadow">{city}</p>
      </div>
    );
  }
  return (
    <div style={{ height, borderRadius: '12px 12px 0 0', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', height: '100%', transform: `translateX(-${idx * 100}%)`, transition: 'transform 0.35s ease', width: `${photos.length * 100}%` }}>
        {photos.map((url, i) => (
          <div key={i} style={{ width: `${100 / photos.length}%`, flexShrink: 0 }}>
            <img src={url} alt="" style={{ width: '100%', height, objectFit: 'cover' }} />
          </div>
        ))}
      </div>
      {photos.length > 1 && (
        <>
          {idx > 0 && <button onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }} style={{ position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',background:'rgba(0,0,0,0.45)',border:'none',color:'white',borderRadius:'50%',width:28,height:28,cursor:'pointer',fontSize:14 }}>‹</button>}
          {idx < photos.length - 1 && <button onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }} style={{ position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'rgba(0,0,0,0.45)',border:'none',color:'white',borderRadius:'50%',width:28,height:28,cursor:'pointer',fontSize:14 }}>›</button>}
          <div style={{ position:'absolute',bottom:8,left:0,right:0,display:'flex',justifyContent:'center',gap:4 }}>
            {photos.map((_,i) => <div key={i} style={{ width: i===idx?16:6,height:6,borderRadius:3,background: i===idx?'white':'rgba(255,255,255,0.5)',transition:'width 0.2s' }} />)}
          </div>
        </>
      )}
    </div>
  );
}

// Member avatars stack
function MemberAvatars({ members, max, joined, memberCount }) {
  const show = members?.slice(0, 5) || [];
  const extra = memberCount > 5 ? memberCount - 5 : 0;
  const pct = max > 0 ? Math.round((memberCount / max) * 100) : 0;
  const COLORS = ['#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6'];
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex" style={{ gap: -8 }}>
          {show.map((m, i) => (
            <div key={i} style={{ width:32,height:32,borderRadius:'50%',border:'2px solid white',marginLeft: i===0?0:-8,flexShrink:0,overflow:'hidden',background:COLORS[i%COLORS.length],display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:700,fontSize:12,zIndex:show.length-i }}>
              {m?.user?.avatarUrl
                ? <img src={m.user.avatarUrl} style={{ width:'100%',height:'100%',objectFit:'cover' }} alt="" />
                : (m?.user?.fullName?.[0] || '?')
              }
            </div>
          ))}
          {extra > 0 && <div style={{ width:32,height:32,borderRadius:'50%',border:'2px solid white',marginLeft:-8,background:'#6b7280',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:10,fontWeight:700 }}>+{extra}</div>}
        </div>
        <span className="text-xs text-gray-500">{memberCount}/{max} spots filled</span>
      </div>
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
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [filters, setFilters] = useState({ city: '', category: '', minPrice: '', maxPrice: '' });
  const [pendingFilters, setPendingFilters] = useState({ city: '', category: '', minPrice: '', maxPrice: '' });

  const [createForm, setCreateForm] = useState({
    title: '', description: '', city: '', date: '', startTime: '', duration: '3 hours',
    maxMembers: 6, pricePerPerson: '', meetupPoint: '', category: [], coverImage: '', photos: [], whatsappLink: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async (f = filters) => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(f).filter(([,v]) => v));
      const [t, j] = await Promise.all([
        groupTourApi.list(params).catch(() => ({ tours: [] })),
        groupTourApi.myJoined().catch(() => ({ tours: [] })),
      ]);
      setTours(t.tours || []);
      setMyJoined((j.tours || []).filter(Boolean));
    } finally { setLoading(false); }
  };

  const applyFilters = () => {
    setFilters({ ...pendingFilters }); loadData(pendingFilters);
    setShowFilters(false); toast.success('Filters applied');
  };

  const clearFilters = () => {
    const empty = { city: '', category: '', minPrice: '', maxPrice: '' };
    setFilters(empty); setPendingFilters(empty); loadData(empty); toast.info('Filters cleared');
  };

  const handleJoin = async (tourId, pricePerPerson) => {
    setJoiningId(tourId);
    try {
      await groupTourApi.join(tourId);
      await loadData();
      toast.success("You're in! 🥳", `Payment of ₹${pricePerPerson} collected at meetup`);
    } catch (err) {
      toast.error(err.message);
    } finally { setJoiningId(null); }
  };

  const handleShare = async (tour) => {
    const text = `Join "${tour.title}" in ${tour.city} on ${formatTourDate(tour.date)} — ₹${tour.pricePerPerson}/person!`;
    try {
      if (navigator.share) await navigator.share({ title: tour.title, text, url: window.location.href });
      else { await navigator.clipboard.writeText(text + ' ' + window.location.href); toast.success('Tour link copied!'); }
    } catch {}
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploadingCover(true);
    try {
      const data = await uploadApi.image(file);
      setCreateForm(f => ({ ...f, coverImage: data.url }));
      toast.success('Cover uploaded!');
    } catch (err) { toast.error('Upload failed: ' + err.message); }
    finally { setUploadingCover(false); }
  };

  const handlePhotosUpload = async (e) => {
    const files = Array.from(e.target.files).slice(0, 5 - createForm.photos.length);
    if (!files.length) return;
    setUploadingPhotos(true);
    try {
      const urls = await Promise.all(files.map(f => uploadApi.image(f).then(d => d.url)));
      setCreateForm(f => ({ ...f, photos: [...f.photos, ...urls].slice(0, 5) }));
      toast.success(`${urls.length} photo${urls.length > 1 ? 's' : ''} added!`);
    } catch (err) { toast.error('Upload failed: ' + err.message); }
    finally { setUploadingPhotos(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await groupTourApi.create(createForm);
      setShowCreate(false);
      setCreateForm({ title:'',description:'',city:'',date:'',startTime:'',duration:'3 hours',maxMembers:6,pricePerPerson:'',meetupPoint:'',category:[],coverImage:'',photos:[],whatsappLink:'' });
      await loadData();
      toast.success('Tour created! 🎉', 'People can now discover and join your tour');
    } catch (err) { toast.error(err.message); }
  };

  const displayTours = activeTab === 'discover' ? tours : myJoined;

  return (
    <Layout title="Group Tours">
      {/* Top action bar */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('discover')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === 'discover' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Discover
          </button>
          <button onClick={() => setActiveTab('joined')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === 'joined' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            My Tours ({myJoined.length})
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
            <Filter className="w-4 h-4" /> Filter
          </button>
          {/* Create Tour — all logged-in users */}
          {user && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition shadow-sm">
              <Plus className="w-4 h-4" /> Create Tour
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card p-4 mb-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input className="input-field text-sm" placeholder="City" value={pendingFilters.city}
              onChange={e => setPendingFilters(f => ({ ...f, city: e.target.value }))} />
            <select className="input-field text-sm" value={pendingFilters.category}
              onChange={e => setPendingFilters(f => ({ ...f, category: e.target.value }))}>
              <option value="">All categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" className="input-field text-sm" placeholder="Min ₹" value={pendingFilters.minPrice}
              onChange={e => setPendingFilters(f => ({ ...f, minPrice: e.target.value }))} />
            <input type="number" className="input-field text-sm" placeholder="Max ₹" value={pendingFilters.maxPrice}
              onChange={e => setPendingFilters(f => ({ ...f, maxPrice: e.target.value }))} />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={clearFilters} className="btn-secondary text-sm flex-1">Clear</button>
            <button onClick={applyFilters} className="btn-primary text-sm flex-1">Apply</button>
          </div>
        </div>
      )}

      {/* Tour Grid */}
      {loading ? (
        <div className="text-center py-16"><div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto" /></div>
      ) : displayTours.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="font-semibold text-gray-700">{activeTab === 'joined' ? "You haven't joined any tours yet" : "No tours found"}</p>
          <p className="text-sm mt-1">{activeTab === 'joined' ? 'Discover and join tours above' : 'Be the first — create one!'}</p>
          {activeTab !== 'joined' && user && (
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4 inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create a Tour
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayTours.map(tour => {
            if (!tour) return null;
            const memberCount = tour._count?.members || tour.members?.length || 0;
            const spotsLeft = (tour.maxMembers || 0) - memberCount;
            const joined = myJoined.some(t => t?.id === tour.id);
            const isExpanded = expandedTour === tour.id;
            const allPhotos = tour.photos?.length ? tour.photos : (tour.coverImage ? [tour.coverImage] : []);

            return (
              <div key={tour.id} className="card overflow-hidden hover:shadow-md transition-shadow">
                {/* Photo carousel */}
                <div className="relative">
                  <PhotoCarousel photos={allPhotos} city={tour.city} height={200} />
                  <div className={`absolute top-2 right-2 text-xs font-bold px-2.5 py-1 rounded-full ${spotsLeft === 0 ? 'bg-red-500 text-white' : spotsLeft <= 2 ? 'bg-orange-400 text-white' : 'bg-white/90 text-gray-800'}`}>
                    {spotsLeft === 0 ? 'Full' : `${spotsLeft} spot${spotsLeft > 1 ? 's' : ''} left`}
                  </div>
                  {joined && (
                    <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Joined
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap">
                    {tour.category?.slice(0, 2).map(c => (
                      <span key={c} className="bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-full">{c}</span>
                    ))}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-1">{tour.title}</h3>
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{tour.description}</p>

                  {/* Details */}
                  <div className="space-y-1.5 text-xs text-gray-600 mb-3">
                    <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-green-500 flex-shrink-0" />{tour.city}</div>
                    <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-blue-500 flex-shrink-0" />
                      <span className="font-medium">{formatTourDate(tour.date)}</span>
                      {tour.startTime && <span className="text-gray-400">at {tour.startTime}</span>}
                    </div>
                    <div className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-orange-500 flex-shrink-0" />{tour.duration}</div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5"><Users className="w-3 h-3 text-purple-500 flex-shrink-0" />{memberCount}/{tour.maxMembers} members</div>
                      <span className="text-green-600 font-bold text-sm">₹{tour.pricePerPerson}<span className="font-normal text-gray-400">/person</span></span>
                    </div>
                  </div>

                  {/* Member avatars */}
                  {(tour.members?.length > 0 || memberCount > 0) && (
                    <MemberAvatars members={tour.members} max={tour.maxMembers} joined={joined} memberCount={memberCount} />
                  )}

                  {/* Expand */}
                  <button onClick={() => setExpandedTour(isExpanded ? null : tour.id)}
                    className="flex items-center gap-1 text-xs text-green-600 hover:underline mb-2">
                    {isExpanded ? <><ChevronUp className="w-3 h-3" />Less</> : <><ChevronDown className="w-3 h-3" />More details</>}
                  </button>

                  {isExpanded && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs text-gray-600 space-y-1.5">
                      {tour.meetupPoint && <div className="flex gap-1.5"><span className="font-medium text-gray-700">📍 Meetup:</span><span>{tour.meetupPoint}</span></div>}
                      {tour.guide?.user && (
                        <div className="flex items-center gap-2 pt-1 border-t border-gray-200">
                          {tour.guide.user.avatarUrl ? <img src={tour.guide.user.avatarUrl} className="w-6 h-6 rounded-full object-cover" alt="" /> : <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center text-xs font-bold text-green-700">{tour.guide.user.fullName?.[0]}</div>}
                          <span>Guide: <span className="font-medium">{tour.guide.user.fullName}</span></span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-gray-200 text-green-700">
                        <CreditCard className="w-3 h-3" /><span>₹{tour.pricePerPerson} collected at meetup</span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={() => handleShare(tour)} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition" title="Share">
                      <Share2 className="w-4 h-4 text-gray-500" />
                    </button>
                    {/* WhatsApp button */}
                    {tour.whatsappLink && (
                      <a href={tour.whatsappLink} target="_blank" rel="noopener noreferrer"
                        className="p-2 border border-green-200 rounded-xl hover:bg-green-50 transition" title="WhatsApp Group"
                        onClick={e => e.stopPropagation()}>
                        <MessageCircle className="w-4 h-4 text-green-600" />
                      </a>
                    )}
                    <button
                      onClick={() => !joined && spotsLeft > 0 && handleJoin(tour.id, tour.pricePerPerson)}
                      disabled={joined || spotsLeft === 0 || joiningId === tour.id}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
                        joined ? 'bg-green-50 text-green-700 border border-green-200' :
                        spotsLeft === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                        'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                      }`}>
                      {joiningId === tour.id ? (
                        <span className="flex items-center justify-center gap-1.5">
                          <div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />Joining...
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
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Create Group Tour</h2>
                <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleCreate} className="space-y-3">
                {/* Photos upload */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Photos (up to 5)</label>
                  {createForm.photos.length > 0 ? (
                    <div className="flex gap-2 flex-wrap mb-2">
                      {createForm.photos.map((url, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden">
                          <img src={url} className="w-full h-full object-cover" alt="" />
                          <button type="button" onClick={() => setCreateForm(f => ({ ...f, photos: f.photos.filter((_,j) => j !== i) }))}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {createForm.photos.length < 5 && (
                        <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-green-500 transition">
                          <Plus className="w-6 h-6 text-gray-400" />
                          <input type="file" accept="image/*" multiple onChange={handlePhotosUpload} className="hidden" disabled={uploadingPhotos} />
                        </label>
                      )}
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-green-500 transition">
                      <Image className="w-7 h-7 text-gray-400 mb-1" />
                      <span className="text-xs text-gray-500">{uploadingPhotos ? 'Uploading...' : 'Add up to 5 photos'}</span>
                      <input type="file" accept="image/*" multiple onChange={handlePhotosUpload} className="hidden" disabled={uploadingPhotos} />
                    </label>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Title *</label>
                  <input className="input-field text-sm" placeholder="e.g. Old Town Food Walk" value={createForm.title}
                    onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} required />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
                  <textarea className="input-field text-sm" rows={3} placeholder="Describe the tour..."
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
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Start Time</label>
                    <input type="time" className="input-field text-sm" value={createForm.startTime}
                      onChange={e => setCreateForm(f => ({ ...f, startTime: e.target.value }))} />
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
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Meetup Point</label>
                  <input className="input-field text-sm" placeholder="Exact meeting location" value={createForm.meetupPoint}
                    onChange={e => setCreateForm(f => ({ ...f, meetupPoint: e.target.value }))} />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">WhatsApp Group Link <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input className="input-field text-sm" placeholder="https://chat.whatsapp.com/..." value={createForm.whatsappLink}
                    onChange={e => setCreateForm(f => ({ ...f, whatsappLink: e.target.value }))} />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Categories</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map(c => (
                      <button type="button" key={c}
                        onClick={() => setCreateForm(f => ({ ...f, category: f.category.includes(c) ? f.category.filter(x => x !== c) : [...f.category, c] }))}
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
