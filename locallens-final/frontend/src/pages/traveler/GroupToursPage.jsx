import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { groupTourApi, uploadApi } from '../../lib/api';
import { Users, MapPin, Calendar, Clock, Filter, X, Plus, Share2, Image, ChevronDown, ChevronUp, CheckCircle, CreditCard } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

const CATEGORIES = ['Cultural','Food','Adventure','History','Nature','Photography','Night Life','Shopping','Beach','Spirituality'];

function formatTourDate(dateStr) {
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    if (!isValid(d)) return dateStr;
    return format(d, 'EEE, MMM d yyyy');
  } catch { return dateStr; }
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
  const [filters, setFilters] = useState({ city: '', category: '', minPrice: '', maxPrice: '' });
  const [pendingFilters, setPendingFilters] = useState({ city: '', category: '', minPrice: '', maxPrice: '' });

  const isGuide = user?.role === 'GUIDE' || user?.role === 'BOTH';

  const [createForm, setCreateForm] = useState({
    title: '', description: '', city: '', date: '', startTime: '', duration: '3 hours',
    maxMembers: 6, pricePerPerson: '', meetupPoint: '', category: [], coverImage: ''
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
    setFilters({ ...pendingFilters });
    loadData(pendingFilters);
    setShowFilters(false);
    toast.success('Filters applied');
  };

  const clearFilters = () => {
    const empty = { city: '', category: '', minPrice: '', maxPrice: '' };
    setFilters(empty);
    setPendingFilters(empty);
    loadData(empty);
    toast.info('Filters cleared');
  };

  const handleJoin = async (tourId, pricePerPerson) => {
    setJoiningId(tourId);
    try {
      await groupTourApi.join(tourId);
      await loadData();
      toast.success(`🎉 Joined! Payment of ₹${pricePerPerson} will be collected at meetup.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setJoiningId(null);
    }
  };

  const handleShare = async (tour) => {
    const text = `Join "${tour.title}" in ${tour.city} on ${formatTourDate(tour.date)} — ₹${tour.pricePerPerson}/person!`;
    const url = window.location.href;
    try {
      if (navigator.share && window.isSecureContext) {
        await navigator.share({ title: tour.title, text, url });
        toast.success('Tour shared successfully!');
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast.success('Tour link copied to clipboard!');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        navigator.clipboard.writeText(`${text} ${url}`).then(() => toast.success('Tour link copied to clipboard!'));
      }
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const data = await uploadApi.image(file);
      setCreateForm(f => ({ ...f, coverImage: data.url }));
      toast.success('Cover photo uploaded!');
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.title || !createForm.city || !createForm.date || !createForm.pricePerPerson) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      await groupTourApi.create(createForm);
      setShowCreate(false);
      setCreateForm({ title: '', description: '', city: '', date: '', startTime: '', duration: '3 hours', maxMembers: 6, pricePerPerson: '', meetupPoint: '', category: [], coverImage: '' });
      await loadData();
      toast.success('Group tour created! 🎉');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const isJoined = (tourId) => myJoined.some(t => t?.id === tourId);
  const displayTours = activeTab === 'discover' ? tours : myJoined.filter(Boolean);

  return (
    <Layout title="Group Tours">
      {/* Tabs + Create button */}
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
        {isGuide && (
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
          <button onClick={applyFilters} className="btn-primary text-sm px-4">Apply</button>
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
              <div key={tour.id} className="card hover:shadow-lg transition overflow-hidden">
                {/* Cover image */}
                <div className="h-44 relative overflow-hidden bg-gradient-to-br from-orange-400 to-pink-500">
                  {tour.coverImage ? (
                    <img src={tour.coverImage} className="w-full h-full object-cover" alt={tour.title}
                      onError={e => e.target.style.display = 'none'} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Users className="w-14 h-14 text-white/40" />
                    </div>
                  )}
                  {/* Spots badge */}
                  <div className={`absolute top-2 right-2 text-xs font-bold px-2.5 py-1 rounded-full ${spotsLeft === 0 ? 'bg-red-500 text-white' : spotsLeft <= 2 ? 'bg-orange-400 text-white' : 'bg-white/90 text-gray-800'}`}>
                    {spotsLeft === 0 ? 'Full' : `${spotsLeft} spot${spotsLeft > 1 ? 's' : ''} left`}
                  </div>
                  {/* Categories */}
                  <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap">
                    {tour.category?.slice(0, 2).map(c => (
                      <span key={c} className="bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-full">{c}</span>
                    ))}
                  </div>
                  {joined && (
                    <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Joined
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{tour.title}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{tour.description}</p>

                  {/* Tour details */}
                  <div className="space-y-1.5 text-xs text-gray-600 mb-3">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-green-500 flex-shrink-0" />
                      <span>{tour.city}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-blue-500 flex-shrink-0" />
                      <span className="font-medium">{formatTourDate(tour.date)}</span>
                      {tour.startTime && <span className="text-gray-400">at {tour.startTime}</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-orange-500 flex-shrink-0" />
                      <span>{tour.duration}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-purple-500 flex-shrink-0" />
                        <span>{memberCount}/{tour.maxMembers} members</span>
                      </div>
                      <span className="text-green-600 font-bold text-sm">₹{tour.pricePerPerson}<span className="font-normal text-gray-400">/person</span></span>
                    </div>
                  </div>

                  {/* Expand for more info */}
                  <button onClick={() => setExpandedTour(isExpanded ? null : tour.id)}
                    className="flex items-center gap-1 text-xs text-green-600 hover:underline mb-2">
                    {isExpanded ? <><ChevronUp className="w-3 h-3" />Less info</> : <><ChevronDown className="w-3 h-3" />More details</>}
                  </button>

                  {isExpanded && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs text-gray-600 space-y-1.5">
                      {tour.meetupPoint && (
                        <div className="flex gap-1.5">
                          <span className="font-medium text-gray-700">📍 Meetup:</span>
                          <span>{tour.meetupPoint}</span>
                        </div>
                      )}
                      {/* Guide info */}
                      {tour.guide?.user && (
                        <div className="flex items-center gap-2 pt-1 border-t border-gray-200">
                          {tour.guide.user.avatarUrl ? (
                            <img src={tour.guide.user.avatarUrl} className="w-6 h-6 rounded-full object-cover" alt="" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center text-xs font-bold text-green-700">
                              {tour.guide.user.fullName?.[0]}
                            </div>
                          )}
                          <span>Guide: <span className="font-medium">{tour.guide.user.fullName}</span></span>
                        </div>
                      )}
                      {/* Members */}
                      {tour.members?.length > 0 && (
                        <div className="pt-1 border-t border-gray-200">
                          <p className="font-medium text-gray-700 mb-1">Members joined:</p>
                          <div className="flex -space-x-1.5">
                            {tour.members.slice(0, 6).map((m, i) => (
                              m?.user?.avatarUrl ? (
                                <img key={i} src={m.user.avatarUrl} className="w-6 h-6 rounded-full border border-white object-cover" alt="" />
                              ) : (
                                <div key={i} className="w-6 h-6 rounded-full border border-white bg-green-300 flex items-center justify-center text-xs font-bold text-white">
                                  {m?.user?.fullName?.[0] || '?'}
                                </div>
                              )
                            ))}
                            {memberCount > 6 && <span className="text-gray-500 text-xs ml-1 self-center">+{memberCount - 6}</span>}
                          </div>
                        </div>
                      )}
                      {/* Payment info */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-gray-200 text-green-700">
                        <CreditCard className="w-3 h-3" />
                        <span>Payment of ₹{tour.pricePerPerson} collected at meetup</span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={() => handleShare(tour)}
                      className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition" title="Share">
                      <Share2 className="w-4 h-4 text-gray-500" />
                    </button>
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
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Create Group Tour</h2>
                <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-3">
                {/* Cover photo */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Cover Photo</label>
                  {createForm.coverImage ? (
                    <div className="relative h-32 rounded-xl overflow-hidden">
                      <img src={createForm.coverImage} className="w-full h-full object-cover" alt="" />
                      <button type="button" onClick={() => setCreateForm(f => ({ ...f, coverImage: '' }))}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-green-500 transition">
                      <Image className="w-8 h-8 text-gray-400 mb-1" />
                      <span className="text-xs text-gray-500">{uploadingCover ? 'Uploading...' : 'Click to upload cover photo'}</span>
                      <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" disabled={uploadingCover} />
                    </label>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Title *</label>
                  <input className="input-field text-sm" placeholder="e.g. Old Town Food Walk" value={createForm.title}
                    onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} required />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Description *</label>
                  <textarea className="input-field text-sm" rows={3} placeholder="Describe the tour experience..."
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
                    <input type="number" className="input-field text-sm" min="2" max="50" value={createForm.maxMembers}
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
