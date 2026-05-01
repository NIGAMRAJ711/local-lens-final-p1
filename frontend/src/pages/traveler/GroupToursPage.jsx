import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/shared/Layout';
import { useAuth } from '../../context/AuthContext';
import { groupTourApi, uploadApi } from '../../lib/api';
import { Users, MapPin, Calendar, Clock, DollarSign, Filter, X, Plus, Share2, ChevronRight, Camera, Image } from 'lucide-react';
import { format } from 'date-fns';

export default function GroupToursPage() {
  const { user } = useAuth();
  const [tours, setTours] = useState([]);
  const [myJoined, setMyJoined] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState('discover');
  const [filters, setFilters] = useState({ city: '', category: '', minPrice: '', maxPrice: '' });
  const [joiningId, setJoiningId] = useState(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const categories = ['Cultural', 'Food', 'Adventure', 'History', 'Nature', 'Photography', 'Night Life', 'Shopping'];

  const [createForm, setCreateForm] = useState({
    title: '', description: '', city: '', date: '', startTime: '', duration: '3 hours',
    maxMembers: 6, pricePerPerson: '', meetupPoint: '', itinerary: [''], category: [], coverImage: ''
  });

  const isGuide = user?.role === 'GUIDE' || user?.role === 'BOTH';

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([,v]) => v));
      const [t, j] = await Promise.all([
        groupTourApi.list(params).catch(() => ({ tours: [] })),
        groupTourApi.myJoined().catch(() => ({ tours: [] })),
      ]);
      setTours(t.tours || []);
      setMyJoined(j.tours || []);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => { setLoading(true); loadData(); setShowFilters(false); };
  const clearFilters = () => { setFilters({ city: '', category: '', minPrice: '', maxPrice: '' }); };

  const handleJoin = async (tourId) => {
    setJoiningId(tourId);
    try {
      await groupTourApi.join(tourId);
      await loadData();
      alert('Successfully joined the tour!');
    } catch (err) {
      alert(err.message);
    } finally {
      setJoiningId(null);
    }
  };

  const handleShare = async (tour) => {
    const text = `Join me on "${tour.title}" tour in ${tour.city} on ${format(new Date(tour.date), 'MMM d, yyyy')}!`;
    if (navigator.share) {
      await navigator.share({ title: tour.title, text, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(text + ' ' + window.location.href);
      alert('Tour link copied to clipboard!');
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const data = await uploadApi.image(file);
      setCreateForm(f => ({ ...f, coverImage: data.url }));
    } catch (err) {
      alert('Image upload failed: ' + err.message);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await groupTourApi.create({ ...createForm, itinerary: createForm.itinerary.filter(Boolean), category: createForm.category });
      setShowCreate(false);
      setCreateForm({ title: '', description: '', city: '', date: '', startTime: '', duration: '3 hours', maxMembers: 6, pricePerPerson: '', meetupPoint: '', itinerary: [''], category: [], coverImage: '' });
      await loadData();
      alert('Group tour created!');
    } catch (err) {
      alert(err.message);
    }
  };

  const isJoined = (tourId) => myJoined.some(t => t.id === tourId);

  const displayTours = activeTab === 'discover' ? tours : myJoined;

  return (
    <Layout title="Group Tours">
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'discover', label: '🌍 Discover Tours' },
          { key: 'joined', label: `📋 My Tours (${myJoined.length})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab.key ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-green-400'}`}>
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

      {/* Filters */}
      {activeTab === 'discover' && (
        <div className="flex gap-2 mb-4">
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${showFilters ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:border-green-500'}`}>
            <Filter className="w-4 h-4" /> Filters
          </button>
          <input className="input-field flex-1 text-sm" placeholder="Search by city..."
            value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && applyFilters()} />
        </div>
      )}

      {showFilters && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Filter Tours</h3>
            <button onClick={clearFilters} className="text-xs text-red-500 flex items-center gap-1"><X className="w-3 h-3" /> Clear</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Category</label>
              <select className="input-field text-sm" value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
                <option value="">All</option>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Min Price (₹)</label>
              <input type="number" className="input-field text-sm" value={filters.minPrice}
                onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Max Price (₹)</label>
              <input type="number" className="input-field text-sm" value={filters.maxPrice}
                onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))} />
            </div>
            <div className="flex items-end">
              <button onClick={applyFilters} className="btn-primary w-full text-sm">Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Tours Grid */}
      {loading ? (
        <div className="text-center py-16"><div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto"/></div>
      ) : displayTours.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">{activeTab === 'joined' ? "You haven't joined any tours yet" : 'No tours found'}</p>
          {activeTab === 'joined' && <button onClick={() => setActiveTab('discover')} className="btn-primary mt-3">Discover Tours</button>}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayTours.map(tour => {
            const memberCount = tour._count?.members || tour.members?.length || 0;
            const spotsLeft = tour.maxMembers - memberCount;
            const joined = isJoined(tour.id);

            return (
              <div key={tour.id} className="card hover:shadow-lg transition">
                {/* Tour Cover Image */}
                <div className="h-40 bg-gradient-to-br from-orange-400 to-pink-500 relative overflow-hidden">
                  {tour.coverImage ? (
                    <img src={tour.coverImage} className="w-full h-full object-cover" alt={tour.title} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Users className="w-12 h-12 text-white/50" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-white/90 rounded-full px-2 py-0.5 text-xs font-medium">
                    {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Full'}
                  </div>
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    {tour.category?.slice(0, 2).map(c => (
                      <span key={c} className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">{c}</span>
                    ))}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{tour.title}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{tour.description}</p>

                  <div className="space-y-1.5 text-xs text-gray-600 mb-3">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-green-500" /> {tour.city}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-blue-500" />
                      {format(new Date(tour.date), 'MMM d, yyyy')} • {tour.startTime}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-orange-500" /> {tour.duration}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-purple-500" />
                        {memberCount}/{tour.maxMembers} members
                      </div>
                      <span className="text-green-600 font-bold text-sm">₹{tour.pricePerPerson}/person</span>
                    </div>
                  </div>

                  {/* Guide info */}
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
                    {tour.guide?.user?.avatarUrl ? (
                      <img src={tour.guide.user.avatarUrl} className="w-6 h-6 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center text-xs font-bold text-green-700">
                        {tour.guide?.user?.fullName?.[0]}
                      </div>
                    )}
                    <span className="text-xs text-gray-600">Guide: {tour.guide?.user?.fullName}</span>
                  </div>

                  {/* Members avatars */}
                  {tour.members && tour.members.length > 0 && (
                    <div className="flex items-center gap-1 mb-3">
                      <div className="flex -space-x-2">
                        {tour.members.slice(0, 5).map(m => (
                          m.user?.avatarUrl ? (
                            <img key={m.id || m.user.id} src={m.user.avatarUrl} className="w-6 h-6 rounded-full border-2 border-white object-cover" alt="" />
                          ) : (
                            <div key={m.id || m.user.id} className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                              {m.user?.fullName?.[0]}
                            </div>
                          )
                        ))}
                      </div>
                      {memberCount > 5 && <span className="text-xs text-gray-500 ml-1">+{memberCount - 5} more</span>}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleShare(tour)}
                      className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                      title="Share"
                    >
                      <Share2 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => !joined && spotsLeft > 0 && handleJoin(tour.id)}
                      disabled={joined || spotsLeft === 0 || joiningId === tour.id}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                        joined ? 'bg-green-50 text-green-600 border border-green-200' :
                        spotsLeft === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                        'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {joiningId === tour.id ? 'Joining...' : joined ? '✓ Joined' : spotsLeft === 0 ? 'Tour Full' : 'Join Tour'}
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
                <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-3">
                {/* Cover Image */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Cover Photo</label>
                  <div className="relative">
                    {createForm.coverImage ? (
                      <div className="relative h-32 rounded-lg overflow-hidden">
                        <img src={createForm.coverImage} className="w-full h-full object-cover" alt="" />
                        <button type="button" onClick={() => setCreateForm(f => ({ ...f, coverImage: '' }))}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 transition">
                        <Image className="w-8 h-8 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-500">{uploadingCover ? 'Uploading...' : 'Click to upload cover photo'}</span>
                        <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Title *</label>
                  <input className="input-field text-sm" placeholder="e.g. Old Town Food Walk" value={createForm.title}
                    onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Description *</label>
                  <textarea className="input-field text-sm" rows={3} placeholder="Describe the tour experience..."
                    value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} required />
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
                    <input type="number" className="input-field text-sm" placeholder="500" value={createForm.pricePerPerson}
                      onChange={e => setCreateForm(f => ({ ...f, pricePerPerson: e.target.value }))} required />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Meetup Point *</label>
                  <input className="input-field text-sm" placeholder="Where to meet" value={createForm.meetupPoint}
                    onChange={e => setCreateForm(f => ({ ...f, meetupPoint: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Categories</label>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map(c => (
                      <button type="button" key={c}
                        onClick={() => setCreateForm(f => ({
                          ...f, category: f.category.includes(c) ? f.category.filter(x => x !== c) : [...f.category, c]
                        }))}
                        className={`text-xs px-2.5 py-1 rounded-full transition ${createForm.category.includes(c) ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" className="btn-primary flex-1">Create Tour</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
