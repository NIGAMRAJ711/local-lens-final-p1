import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { mapApi, guideApi, uploadApi } from '../lib/api';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import { MapPin, Star, Locate, X, Plus, Image, Lock, Unlock } from 'lucide-react';

const GEM_CATEGORIES = ['Food Spot','Viewpoint','Street Art','Nature','Architecture','Market','Beach','Temple'];

export default function MapPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const toast = useToast();
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef({});
  const [guides, setGuides] = useState([]);
  const [gems, setGems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [citySearch, setCitySearch] = useState('');
  const [showLayer, setShowLayer] = useState('both');
  const [L, setL] = useState(null);

  // Drop-pin mode state
  const [dropMode, setDropMode] = useState(false);
  const [dropLatLng, setDropLatLng] = useState(null);
  const [showGemForm, setShowGemForm] = useState(false);
  const [gemForm, setGemForm] = useState({ name:'', category:'Food Spot', description:'', isLocked:false, photos:[] });
  const [uploadingGemPhotos, setUploadingGemPhotos] = useState(false);
  const [submittingGem, setSubmittingGem] = useState(false);

  const isGuide = user?.role === 'GUIDE' || user?.role === 'BOTH';

  useEffect(() => {
    import('leaflet').then(leaflet => {
      const Lmod = leaflet.default;
      delete Lmod.Icon.Default.prototype._getIconUrl;
      Lmod.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      setL(Lmod);
      if (mapRef.current && !leafletMap.current) {
        leafletMap.current = Lmod.map(mapRef.current).setView([20.5937, 78.9629], 5);
        Lmod.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(leafletMap.current);
        loadData(Lmod);
        getUserLocation(Lmod);
      }
    });
    return () => { if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; } };
  }, []);

  // Drop pin map click handler
  useEffect(() => {
    if (!leafletMap.current || !L) return;
    const map = leafletMap.current;
    const handler = (e) => {
      if (!dropMode) return;
      setDropLatLng(e.latlng);
      setShowGemForm(true);
      setDropMode(false);
      map.getContainer().style.cursor = '';
    };
    map.on('click', handler);
    if (dropMode) map.getContainer().style.cursor = 'crosshair';
    else map.getContainer().style.cursor = '';
    return () => map.off('click', handler);
  }, [dropMode, L]);

  useEffect(() => {
    if (!socket || !L) return;
    socket.on('guide:location-updated', ({ guideId, latitude, longitude }) => {
      setGuides(prev => prev.map(g => g.userId === guideId ? { ...g, latitude, longitude } : g));
      if (markersRef.current[`guide_${guideId}`] && leafletMap.current) {
        markersRef.current[`guide_${guideId}`].setLatLng([latitude, longitude]);
      }
    });
    return () => socket.off('guide:location-updated');
  }, [socket, L]);

  useEffect(() => {
    if (!user || (user.role !== 'GUIDE' && user.role !== 'BOTH')) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        await guideApi.updateLocation(pos.coords.latitude, pos.coords.longitude);
        if (socket) socket.emit('guide:location-update', { latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch {}
    });
  }, [user, socket]);

  const getUserLocation = (Lmod) => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      if (leafletMap.current && Lmod) {
        leafletMap.current.setView([latitude, longitude], 12);
        const userIcon = Lmod.divIcon({
          html: `<div style="background:#3b82f6;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>`,
          className: '', iconSize: [16, 16], iconAnchor: [8, 8],
        });
        Lmod.marker([latitude, longitude], { icon: userIcon }).addTo(leafletMap.current).bindPopup('<b>📍 You are here</b>');
      }
    }, () => {});
  };

  const loadData = async (Lmod) => {
    try {
      const [g, gem] = await Promise.all([
        mapApi.getGuides({}).catch(() => ({ guides: [] })),
        mapApi.getHiddenGems({}).catch(() => ({ gems: [] })),
      ]);
      setGuides(g.guides || []);
      setGems(gem.gems || []);
      renderMarkers(g.guides || [], gem.gems || [], 'both', Lmod || L);
    } finally { setLoading(false); }
  };

  const makeGuideIcon = (Lmod, guide) => {
    const name = guide.user?.fullName || guide.fullName || 'G';
    const avatar = guide.user?.avatarUrl || guide.avatarUrl || '';
    const available = guide.isAvailable;
    const color = available ? '#22c55e' : '#94a3b8';
    const hourlyRate = guide.hourlyRate || 0;
    return Lmod.divIcon({
      html: `<div style="position:relative;width:52px;height:60px;">
        <div style="width:52px;height:52px;border-radius:50%;border:3px solid ${color};box-shadow:0 2px 12px rgba(0,0,0,0.25);overflow:hidden;background:#e5e7eb;cursor:pointer;">
          ${avatar
            ? `<img src="${avatar}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.parentElement.innerHTML='<div style=\\'width:100%;height:100%;background:#22c55e;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:18px;\\'>${name[0]}</div>'" />`
            : `<div style="width:100%;height:100%;background:#22c55e;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:18px;">${name[0]}</div>`
          }
        </div>
        <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);background:${color};color:white;font-size:9px;font-weight:700;padding:2px 6px;border-radius:5px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.2);">₹${hourlyRate}/hr</div>
      </div>`,
      className: '', iconSize: [52, 60], iconAnchor: [26, 60],
    });
  };

  const makeGemIcon = (Lmod, isLocked) => Lmod.divIcon({
    html: `<div style="width:36px;height:36px;border-radius:50%;background:#1a1a2e;display:flex;align-items:center;justify-content:center;font-size:18px;border:2px solid ${isLocked ? '#f59e0b' : '#fbbf24'};box-shadow:0 2px 8px rgba(0,0,0,0.35);cursor:pointer;">★</div>`,
    className: '', iconSize: [36, 36], iconAnchor: [18, 18],
  });

  const renderMarkers = (guideList, gemList, layer, Lmod) => {
    if (!leafletMap.current || !Lmod) return;
    Object.values(markersRef.current).forEach(m => m?.remove());
    markersRef.current = {};

    if (layer === 'guides' || layer === 'both') {
      guideList.forEach(g => {
        if (!g.latitude || !g.longitude) return;
        const icon = makeGuideIcon(Lmod, g);
        const m = Lmod.marker([g.latitude, g.longitude], { icon }).addTo(leafletMap.current);
        const tags = (g.expertiseTags || []).slice(0, 3).map(t =>
          `<span style="background:#f0fdf4;color:#16a34a;font-size:10px;padding:2px 7px;border-radius:10px;white-space:nowrap;">${t}</span>`
        ).join('');
        const avatar = g.user?.avatarUrl || g.avatarUrl || '';
        const name = g.user?.fullName || g.fullName || 'Guide';
        const city = g.city || '';
        m.bindPopup(`
          <div style="width:220px;font-family:system-ui,sans-serif;padding:4px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
              ${avatar
                ? `<img src="${avatar}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid #22c55e;flex-shrink:0;" onerror="this.src=''" />`
                : `<div style="width:44px;height:44px;border-radius:50%;background:#22c55e;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:18px;flex-shrink:0;">${name[0]}</div>`
              }
              <div>
                <div style="font-weight:700;font-size:14px;line-height:1.2;">${name}</div>
                <div style="font-size:12px;color:#6b7280;">📍 ${city}</div>
              </div>
            </div>
            <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;">${tags}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <span style="font-size:12px;">⭐ ${g.avgRating?.toFixed(1)||'New'} <span style="color:#9ca3af">(${g.totalReviews||0})</span></span>
              <span style="font-size:14px;font-weight:700;color:#16a34a;">₹${g.hourlyRate}/hr</span>
            </div>
            <div style="display:flex;gap:6px;">
              <button onclick="window.location.href='/guides/${g.id}'"
                style="flex:1;padding:8px;background:#f3f4f6;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;color:#374151;">
                View Profile
              </button>
              <button onclick="window.location.href='/book/${g.id}'"
                style="flex:1;padding:8px;background:#22c55e;color:white;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;">
                Book Now
              </button>
            </div>
          </div>
        `, { maxWidth: 240 });
        m.on('click', () => setSelectedGuide(g));
        markersRef.current[`guide_${g.userId}`] = m;
      });
    }

    if (layer === 'gems' || layer === 'both') {
      gemList.forEach(gem => {
        if (!gem.latitude || !gem.longitude) return;
        const gemIcon = makeGemIcon(Lmod, gem.isLocked);
        const m = Lmod.marker([gem.latitude, gem.longitude], { icon: gemIcon }).addTo(leafletMap.current);
        const guideName = gem.guide?.user?.fullName || gem.guideName || 'Local Guide';
        m.bindPopup(`
          <div style="min-width:180px;font-family:system-ui,sans-serif;padding:4px;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
              <span style="font-size:18px;">★</span>
              <b style="font-size:14px;">${gem.name}</b>
              ${gem.isLocked ? '<span style="font-size:14px;" title="Secret location">🔒</span>' : ''}
            </div>
            <span style="display:inline-block;background:#fef9c3;color:#92400e;font-size:10px;padding:2px 8px;border-radius:10px;margin-bottom:6px;">${gem.category}</span>
            ${gem.isLocked
              ? `<p style="font-size:12px;color:#6b7280;font-style:italic;">🔒 Book this guide to unlock location</p>`
              : `<p style="font-size:12px;color:#374151;line-height:1.4;">${gem.description || ''}</p>`
            }
            <p style="font-size:11px;color:#9ca3af;margin-top:4px;">Added by ${guideName}</p>
          </div>
        `);
        markersRef.current[`gem_${gem.id}`] = m;
      });
    }
  };

  const addGemToMap = (gem) => {
    if (!leafletMap.current || !L || !gem.latitude || !gem.longitude) return;
    const icon = makeGemIcon(L, gem.isLocked);
    const m = L.marker([gem.latitude, gem.longitude], { icon }).addTo(leafletMap.current);
    m.bindPopup(`<div style="min-width:180px;font-family:system-ui,sans-serif;padding:4px;">
      <b>${gem.name}</b><br/>
      <span style="font-size:11px;color:#6b7280;">${gem.category}</span><br/>
      <p style="font-size:12px;">${gem.description}</p>
    </div>`);
    markersRef.current[`gem_${gem.id}`] = m;
  };

  const handleLayerSwitch = (layer) => {
    setShowLayer(layer);
    if (L) renderMarkers(guides, gems, layer, L);
  };

  const handleCitySearch = async () => {
    if (!citySearch.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(citySearch)}&limit=1`);
      const data = await res.json();
      if (data[0] && leafletMap.current) {
        leafletMap.current.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 12);
      }
      const g = await mapApi.getGuides({ city: citySearch });
      setGuides(g.guides || []);
      if (L) renderMarkers(g.guides || [], gems, showLayer, L);
    } catch { toast.error('Search failed'); }
  };

  const handleGemPhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (gemForm.photos.length + files.length > 3) { toast.error('Max 3 photos'); return; }
    setUploadingGemPhotos(true);
    try {
      const uploaded = await Promise.all(files.map(f => uploadApi.image(f)));
      setGemForm(f => ({ ...f, photos: [...f.photos, ...uploaded.map(r => r.url)] }));
    } catch (err) { toast.error('Upload failed: ' + err.message); }
    finally { setUploadingGemPhotos(false); }
  };

  const handleSubmitGem = async (e) => {
    e.preventDefault();
    if (!gemForm.name || !gemForm.category || !gemForm.description) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmittingGem(true);
    try {
      const res = await api.post('/guides/hidden-gems', {
        ...gemForm,
        latitude: dropLatLng?.lat,
        longitude: dropLatLng?.lng,
        city: citySearch || 'Unknown',
      });
      const newGem = res.gem;
      setGems(prev => [...prev, newGem]);
      addGemToMap(newGem);
      setShowGemForm(false);
      setGemForm({ name:'', category:'Food Spot', description:'', isLocked:false, photos:[] });
      setDropLatLng(null);
      toast.success('Hidden gem added! ★', `"${newGem.name}" is now on the map`);
    } catch (err) { toast.error(err.message); }
    finally { setSubmittingGem(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[{ key:'guides', label:'👤 Guides' }, { key:'gems', label:'★ Gems' }, { key:'both', label:'🗺️ All' }].map(l => (
              <button key={l.key} onClick={() => handleLayerSwitch(l.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${showLayer === l.key ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>
                {l.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-1 max-w-md">
            <input className="input-field flex-1 text-sm py-1.5" placeholder="Search city..."
              value={citySearch} onChange={e => setCitySearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCitySearch()} />
            <button onClick={handleCitySearch} className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 transition">
              Search
            </button>
          </div>
          <button onClick={() => getUserLocation(L)} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-green-600 transition border border-gray-200 px-3 py-1.5 rounded-lg">
            <Locate className="w-4 h-4" /> Me
          </button>
        </div>
        <div className="max-w-6xl mx-auto flex gap-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"/> Available</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-400 inline-block"/> Offline</span>
          <span className="flex items-center gap-1 text-yellow-600">★ Hidden gem</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block"/> You</span>
          <span className="ml-auto text-gray-400">{guides.filter(g => g.latitude).length} guides on map</span>
        </div>
      </div>

      {/* Drop pin banner */}
      {dropMode && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1001] bg-amber-500 text-white px-5 py-2.5 rounded-full shadow-xl text-sm font-medium flex items-center gap-2">
          <MapPin className="w-4 h-4" /> Tap anywhere on the map to place your hidden gem 📍
          <button onClick={() => setDropMode(false)} className="ml-2 hover:text-amber-100"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-4 flex gap-4 relative">
        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapRef} style={{ height: 'calc(100vh - 180px)', borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb' }} />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-2xl">
              <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
            </div>
          )}

          {/* Add Hidden Gem FAB — guides only */}
          {isGuide && !dropMode && (
            <button
              onClick={() => { setDropMode(true); setShowGemForm(false); }}
              className="absolute bottom-4 right-4 z-[1000] flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-full shadow-lg text-sm font-bold transition"
              title="Add Hidden Gem">
              <Plus className="w-4 h-4" /> Add Hidden Gem
            </button>
          )}
        </div>

        {/* Selected guide sidebar */}
        {selectedGuide && (
          <div className="w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden sticky top-32">
              <div className="h-24 bg-gradient-to-br from-green-500 to-emerald-400 relative">
                <button onClick={() => setSelectedGuide(null)} className="absolute top-2 right-2 bg-white/80 rounded-full p-1">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <div className="px-4 pb-4 -mt-8">
                {selectedGuide.user?.avatarUrl || selectedGuide.avatarUrl ? (
                  <img src={selectedGuide.user?.avatarUrl || selectedGuide.avatarUrl}
                    className="w-16 h-16 rounded-xl border-4 border-white shadow object-cover mb-2" alt="" />
                ) : (
                  <div className="w-16 h-16 rounded-xl border-4 border-white shadow bg-green-200 flex items-center justify-center text-xl font-bold text-green-700 mb-2">
                    {(selectedGuide.user?.fullName || selectedGuide.fullName || 'G')[0]}
                  </div>
                )}
                <h3 className="font-bold text-gray-900">{selectedGuide.user?.fullName || selectedGuide.fullName}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-1 mb-2"><MapPin className="w-3 h-3" />{selectedGuide.city}</p>
                <div className="flex items-center gap-2 text-sm mb-3">
                  <span className="flex items-center gap-0.5 text-yellow-500"><Star className="w-3.5 h-3.5 fill-yellow-400" />{selectedGuide.avgRating?.toFixed(1)||'New'}</span>
                  <span className="text-green-600 font-bold">₹{selectedGuide.hourlyRate}/hr</span>
                  <span className={`text-xs ${selectedGuide.isAvailable ? 'text-green-600' : 'text-gray-400'}`}>
                    ● {selectedGuide.isAvailable ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {selectedGuide.expertiseTags?.slice(0,3).map(t => (
                    <span key={t} className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
                <Link to={`/guides/${selectedGuide.id}`} className="btn-primary w-full text-center block text-sm mb-2">View Profile</Link>
                <Link to={`/book/${selectedGuide.id}`} className="block w-full text-center py-2 rounded-xl border-2 border-green-600 text-green-600 font-semibold text-sm hover:bg-green-50 transition">Book Now</Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Gem slide-up form */}
      {showGemForm && (
        <div className="fixed inset-0 bg-black/60 z-[1002] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">Add Hidden Gem ★</h2>
                  {dropLatLng && (
                    <p className="text-xs text-gray-400 mt-0.5">📍 {dropLatLng.lat.toFixed(5)}, {dropLatLng.lng.toFixed(5)}</p>
                  )}
                </div>
                <button onClick={() => { setShowGemForm(false); setDropLatLng(null); }} className="p-2 hover:bg-gray-100 rounded-xl">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitGem} className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Gem Name *</label>
                  <input className="input-field text-sm" placeholder="e.g. Secret rooftop chai spot" value={gemForm.name}
                    onChange={e => setGemForm(f => ({ ...f, name: e.target.value }))} required />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Category *</label>
                  <select className="input-field text-sm" value={gemForm.category}
                    onChange={e => setGemForm(f => ({ ...f, category: e.target.value }))}>
                    {GEM_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Description *</label>
                  <textarea className="input-field text-sm" rows={3} placeholder="What makes this place special?"
                    value={gemForm.description} onChange={e => setGemForm(f => ({ ...f, description: e.target.value }))} required />
                </div>

                {/* Secret toggle */}
                <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:border-amber-400 transition">
                  <input type="checkbox" checked={gemForm.isLocked}
                    onChange={e => setGemForm(f => ({ ...f, isLocked: e.target.checked }))}
                    className="w-4 h-4 accent-amber-500" />
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      {gemForm.isLocked ? <Lock className="w-4 h-4 text-amber-500" /> : <Unlock className="w-4 h-4 text-gray-400" />}
                      {gemForm.isLocked ? 'Secret location (locked)' : 'Public location'}
                    </p>
                    <p className="text-xs text-gray-400">Secret gems show "Book guide to unlock" to travelers</p>
                  </div>
                </label>

                {/* Photos */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Photos (up to 3)</label>
                  <div className="flex gap-2 flex-wrap">
                    {gemForm.photos.map((url, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200">
                        <img src={url} className="w-full h-full object-cover" alt="" />
                        <button type="button" onClick={() => setGemForm(f => ({ ...f, photos: f.photos.filter((_,j)=>j!==i) }))}
                          className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">×</button>
                      </div>
                    ))}
                    {gemForm.photos.length < 3 && (
                      <label className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-amber-400 transition">
                        <Image className="w-5 h-5 text-gray-400" />
                        <input type="file" accept="image/*" multiple onChange={handleGemPhotoUpload} className="hidden" disabled={uploadingGemPhotos} />
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => { setShowGemForm(false); setDropLatLng(null); }} className="btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" disabled={submittingGem} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition disabled:opacity-50">
                    {submittingGem ? 'Adding...' : '★ Add Gem'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
