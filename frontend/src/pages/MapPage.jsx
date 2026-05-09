import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mapApi, guideApi, uploadApi } from '../lib/api';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import { MapPin, Star, Locate, X, Navigation, Plus, Image, Lock, Unlock } from 'lucide-react';

const GEM_CATEGORIES = ['Food Spot','Viewpoint','Street Art','Nature','Architecture','Market','Beach','Temple','Hidden Lane','Waterfall'];

// Build custom photo pin icon
function makeGuideIcon(Lmod, guide) {
  const name = guide.user?.fullName || 'G';
  const avatar = guide.user?.avatarUrl || '';
  const rate = guide.hourlyRate || 0;
  const color = guide.isAvailable ? '#22c55e' : '#94a3b8';
  const initial = name[0]?.toUpperCase() || 'G';
  const imgHtml = avatar
    ? `<img src="${avatar}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.parentNode.innerHTML='<div style=\\"width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#16a34a;color:white;font-weight:700;font-size:18px;\\">${initial}</div>'" />`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#16a34a;color:white;font-weight:700;font-size:18px;">${initial}</div>`;
  const html = `
    <div style="width:52px;height:60px;position:relative;cursor:pointer;">
      <div style="width:52px;height:52px;border-radius:50%;border:3px solid ${color};box-shadow:0 2px 10px rgba(0,0,0,0.25);overflow:hidden;background:#e5e7eb;">
        ${imgHtml}
      </div>
      <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);background:${color};color:white;font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.3);">₹${rate}/hr</div>
    </div>`;
  return Lmod.divIcon({ html, className: '', iconSize: [52, 60], iconAnchor: [26, 60] });
}

// Build guide popup HTML
function guidePopupHtml(g) {
  const tags = (g.expertiseTags || []).slice(0, 3).map(t =>
    `<span style="background:#f0fdf4;color:#16a34a;font-size:10px;padding:2px 7px;border-radius:10px;border:1px solid #bbf7d0;">${t}</span>`
  ).join('');
  const avatar = g.user?.avatarUrl
    ? `<img src="${g.user.avatarUrl}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid #22c55e;" onerror="this.src=''" />`
    : `<div style="width:44px;height:44px;border-radius:50%;background:#16a34a;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:18px;">${(g.user?.fullName||'G')[0]}</div>`;
  return `
    <div style="width:230px;font-family:system-ui,sans-serif;padding:4px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        ${avatar}
        <div>
          <div style="font-weight:700;font-size:14px;color:#111;">${g.user?.fullName || 'Guide'}</div>
          <div style="font-size:11px;color:#6b7280;">📍 ${g.city || ''}</div>
          <div style="font-size:11px;color:${g.isAvailable ? '#16a34a' : '#9ca3af'};">● ${g.isAvailable ? 'Available now' : 'Offline'}</div>
        </div>
      </div>
      ${tags ? `<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;">${tags}</div>` : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-size:12px;color:#374151;">⭐ ${(g.avgRating||0).toFixed(1)} <span style="color:#9ca3af;">(${g.totalReviews||0})</span></span>
        <span style="font-size:14px;font-weight:700;color:#16a34a;">₹${g.hourlyRate}/hr</span>
      </div>
      <div style="display:flex;gap:6px;">
        <button onclick="window.location.href='/guides/${g.id}'"
          style="flex:1;padding:8px 4px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;color:#374151;">
          View Profile
        </button>
        <button onclick="window.location.href='/book/${g.id}'"
          style="flex:1;padding:8px 4px;background:#22c55e;color:white;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;">
          Book Now ✓
        </button>
      </div>
    </div>`;
}

// Build gem popup HTML
function gemPopupHtml(gem) {
  const photos = (gem.photos || []).slice(0, 1);
  const photoHtml = photos.length
    ? `<img src="${photos[0]}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:8px;" />`
    : '';
  const locked = gem.isLocked || gem.is_locked;
  return `
    <div style="width:200px;font-family:system-ui,sans-serif;padding:2px;">
      ${photoHtml}
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
        <span style="font-weight:700;font-size:13px;color:#111;">${gem.name}</span>
        ${locked ? '<span style="font-size:12px;">🔒</span>' : '<span style="font-size:12px;">📍</span>'}
      </div>
      <span style="background:#fef3c7;color:#92400e;font-size:10px;padding:2px 7px;border-radius:8px;">${gem.category || ''}</span>
      <p style="font-size:11px;color:#6b7280;margin:6px 0;">${locked ? '🔒 Book this guide to unlock the exact location.' : (gem.description || '')}</p>
      ${gem.guideName ? `<div style="font-size:10px;color:#9ca3af;">By ${gem.guideName}</div>` : ''}
    </div>`;
}

export default function MapPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const toast = useToast();
  const navigate = useNavigate();
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

  // Drop-gem mode state
  const isGuide = user?.role === 'GUIDE' || user?.role === 'BOTH';
  const [dropMode, setDropMode] = useState(false);
  const [gemForm, setGemForm] = useState({ name:'', category:'Viewpoint', description:'', isLocked:true, latitude:null, longitude:null, photos:[] });
  const [showGemModal, setShowGemModal] = useState(false);
  const [uploadingGemPhoto, setUploadingGemPhoto] = useState(false);
  const [savingGem, setSavingGem] = useState(false);
  const dropModeRef = useRef(false);

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
          attribution: '© OpenStreetMap',
          maxZoom: 19,
        }).addTo(leafletMap.current);
        loadData(Lmod);
        getUserLocation(Lmod);
        // Map click for gem drop mode
        leafletMap.current.on('click', (e) => {
          if (!dropModeRef.current) return;
          const { lat, lng } = e.latlng;
          setGemForm(f => ({ ...f, latitude: lat, longitude: lng }));
          setShowGemModal(true);
          dropModeRef.current = false;
          setDropMode(false);
          if (leafletMap.current) leafletMap.current.getContainer().style.cursor = '';
        });
      }
    });
    return () => { if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; } };
  }, []);

  // Sync drop mode to ref (so map click handler sees current value)
  useEffect(() => { dropModeRef.current = dropMode; }, [dropMode]);

  // Cursor style for drop mode
  useEffect(() => {
    if (!leafletMap.current) return;
    leafletMap.current.getContainer().style.cursor = dropMode ? 'crosshair' : '';
  }, [dropMode]);

  // Live guide location via socket
  useEffect(() => {
    if (!socket || !L) return;
    const handleLocation = ({ guideId, latitude, longitude }) => {
      setGuides(prev => prev.map(g => g.userId === guideId ? { ...g, latitude, longitude } : g));
      if (markersRef.current[`guide_${guideId}`] && leafletMap.current) {
        markersRef.current[`guide_${guideId}`].setLatLng([latitude, longitude]);
      }
    };
    socket.on('guide:location-updated', handleLocation);
    socket.on('guide:locationUpdate', handleLocation);
    return () => {
      socket.off('guide:location-updated', handleLocation);
      socket.off('guide:locationUpdate', handleLocation);
    };
  }, [socket, L]);

  // Update own guide location
  useEffect(() => {
    if (!user || (user.role !== 'GUIDE' && user.role !== 'BOTH')) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        await guideApi.updateLocation(pos.coords.latitude, pos.coords.longitude);
        if (socket) {
          socket.emit('guide:location-update', { latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          socket.emit('guide:updateLocation', { latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        }
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
          className:'', iconSize:[16,16], iconAnchor:[8,8],
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

  const renderMarkers = (guideList, gemList, layer, Lmod) => {
    if (!leafletMap.current || !Lmod) return;
    Object.values(markersRef.current).forEach(m => m && m.remove());
    markersRef.current = {};

    if (layer === 'guides' || layer === 'both') {
      guideList.forEach(g => {
        if (!g.latitude || !g.longitude) return;
        const icon = makeGuideIcon(Lmod, g);
        const m = Lmod.marker([g.latitude, g.longitude], { icon }).addTo(leafletMap.current);
        m.bindPopup(guidePopupHtml(g), { maxWidth: 250 });
        m.on('click', () => setSelectedGuide(g));
        markersRef.current[`guide_${g.userId}`] = m;
      });
    }

    if (layer === 'gems' || layer === 'both') {
      gemList.forEach(gem => {
        if (!gem.latitude || !gem.longitude) return;
        const gemIcon = Lmod.divIcon({
          html: `<div style="width:36px;height:36px;border-radius:50%;background:#1c1917;display:flex;align-items:center;justify-content:center;font-size:18px;border:2px solid #f59e0b;box-shadow:0 2px 8px rgba(0,0,0,0.35);">★</div>`,
          className:'', iconSize:[36,36], iconAnchor:[18,18],
        });
        const m = Lmod.marker([gem.latitude, gem.longitude], { icon: gemIcon }).addTo(leafletMap.current);
        m.bindPopup(gemPopupHtml(gem), { maxWidth: 220 });
        markersRef.current[`gem_${gem.id}`] = m;
      });
    }
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
      if (data[0] && leafletMap.current) leafletMap.current.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 12);
      const g = await mapApi.getGuides({ city: citySearch });
      setGuides(g.guides || []);
      if (L) renderMarkers(g.guides || [], gems, showLayer, L);
    } catch { toast.error('Search failed'); }
  };

  const handleGemPhotoUpload = async (e) => {
    const files = Array.from(e.target.files).slice(0, 3 - gemForm.photos.length);
    if (!files.length) return;
    setUploadingGemPhoto(true);
    try {
      const urls = await Promise.all(files.map(f => uploadApi.image(f).then(d => d.url)));
      setGemForm(f => ({ ...f, photos: [...f.photos, ...urls].slice(0, 3) }));
    } catch (err) { toast.error('Upload failed'); }
    finally { setUploadingGemPhoto(false); }
  };

  const handleSaveGem = async (e) => {
    e.preventDefault();
    if (!gemForm.name || !gemForm.latitude) { toast.error('Please fill all required fields'); return; }
    setSavingGem(true);
    try {
      const res = await api.post('/guides/hidden-gems', {
        name: gemForm.name, category: gemForm.category, description: gemForm.description,
        isLocked: gemForm.isLocked, latitude: gemForm.latitude, longitude: gemForm.longitude,
        photos: gemForm.photos, city: citySearch || 'Unknown',
      });
      const newGem = res.gem || res;
      const updatedGems = [...gems, newGem];
      setGems(updatedGems);
      if (L) renderMarkers(guides, updatedGems, showLayer, L);
      setShowGemModal(false);
      setGemForm({ name:'', category:'Viewpoint', description:'', isLocked:true, latitude:null, longitude:null, photos:[] });
      toast.success('Hidden gem added! ⭐', 'Visible on the map for all users');
    } catch (err) { toast.error(err.message); }
    finally { setSavingGem(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[{ key:'guides', label:'👤 Guides' }, { key:'gems', label:'⭐ Gems' }, { key:'both', label:'🗺️ All' }].map(l => (
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
            <button onClick={handleCitySearch} className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 transition">Search</button>
          </div>
          <button onClick={() => getUserLocation(L)} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-green-600 border border-gray-200 px-3 py-1.5 rounded-lg transition">
            <Locate className="w-4 h-4" /> My Location
          </button>
        </div>
        <div className="max-w-6xl mx-auto flex gap-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"/> Available guide</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-400 inline-block"/> Offline</span>
          <span className="flex items-center gap-1"><span style={{fontSize:13}}>★</span> Hidden gem</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block"/> You</span>
          <span className="ml-auto text-gray-400">{guides.filter(g => g.latitude).length} guides on map</span>
        </div>
      </div>

      {/* Drop-mode banner */}
      {dropMode && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1000] bg-amber-500 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold">
          <MapPin className="w-4 h-4" />
          Tap anywhere on the map to place your hidden gem 📍
          <button onClick={() => { setDropMode(false); }} className="ml-2 underline text-xs opacity-80">Cancel</button>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-4 flex gap-4 relative">
        {/* Map container */}
        <div className="flex-1 relative">
          <div ref={mapRef} style={{ height: 'calc(100vh - 180px)', borderRadius: 16, overflow:'hidden', border:'1px solid #e5e7eb' }} />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-2xl">
              <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
            </div>
          )}

          {/* Add Hidden Gem FAB — guides only */}
          {isGuide && !dropMode && (
            <button
              onClick={() => { setDropMode(true); setSelectedGuide(null); }}
              className="absolute bottom-5 right-5 z-[500] flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 rounded-2xl shadow-xl font-semibold text-sm transition"
            >
              <Plus className="w-4 h-4" />⭐ Add Hidden Gem
            </button>
          )}
        </div>

        {/* Selected guide sidebar card */}
        {selectedGuide && (
          <div className="w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden sticky top-32">
              <div className="h-24 relative" style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                <button onClick={() => setSelectedGuide(null)} className="absolute top-2 right-2 bg-white/80 rounded-full p-1">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <div className="px-4 pb-4 -mt-8">
                {selectedGuide.user?.avatarUrl ? (
                  <img src={selectedGuide.user.avatarUrl} className="w-16 h-16 rounded-xl border-4 border-white shadow object-cover mb-2" alt="" />
                ) : (
                  <div className="w-16 h-16 rounded-xl border-4 border-white shadow bg-green-500 flex items-center justify-center text-xl font-bold text-white mb-2">
                    {selectedGuide.user?.fullName?.[0]}
                  </div>
                )}
                <h3 className="font-bold text-gray-900">{selectedGuide.user?.fullName}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-1 mb-1"><MapPin className="w-3 h-3" />{selectedGuide.city}</p>
                <div className="flex items-center gap-2 text-sm mb-2">
                  <span className="flex items-center gap-0.5 text-yellow-500"><Star className="w-3.5 h-3.5 fill-yellow-400" />{(selectedGuide.avgRating||0).toFixed(1)}</span>
                  <span className="text-green-600 font-bold">₹{selectedGuide.hourlyRate}/hr</span>
                  <span className={`text-xs ${selectedGuide.isAvailable ? 'text-green-600' : 'text-gray-400'}`}>● {selectedGuide.isAvailable ? 'Online' : 'Offline'}</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {selectedGuide.expertiseTags?.slice(0, 3).map(t => (
                    <span key={t} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">{t}</span>
                  ))}
                </div>
                <Link to={`/guides/${selectedGuide.id}`} className="btn-primary w-full text-center block text-sm mb-2 py-2">View Profile</Link>
                <Link to={`/book/${selectedGuide.id}`} className="block w-full py-2 text-center rounded-xl border border-green-500 text-green-600 text-sm font-semibold hover:bg-green-50 transition">Book Now</Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Hidden Gem Modal */}
      {showGemModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-[2000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">⭐ Add Hidden Gem</h2>
                <button onClick={() => setShowGemModal(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSaveGem} className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-700 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  Pin placed at {gemForm.latitude?.toFixed(5)}, {gemForm.longitude?.toFixed(5)}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Gem Name *</label>
                  <input className="input-field text-sm" placeholder="e.g. Secret Rooftop Café" value={gemForm.name}
                    onChange={e => setGemForm(f => ({ ...f, name: e.target.value }))} required />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Category *</label>
                  <select className="input-field text-sm" value={gemForm.category}
                    onChange={e => setGemForm(f => ({ ...f, category: e.target.value }))}>
                    {GEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Description *</label>
                  <textarea className="input-field text-sm" rows={3} placeholder="What makes this place special?"
                    value={gemForm.description} onChange={e => setGemForm(f => ({ ...f, description: e.target.value }))} required />
                </div>

                {/* Photos */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Photos <span className="text-gray-400 font-normal">(up to 3)</span></label>
                  <div className="flex gap-2 flex-wrap">
                    {gemForm.photos.map((url, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden">
                        <img src={url} className="w-full h-full object-cover" alt="" />
                        <button type="button" onClick={() => setGemForm(f => ({ ...f, photos: f.photos.filter((_,j) => j !== i) }))}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">✕</button>
                      </div>
                    ))}
                    {gemForm.photos.length < 3 && (
                      <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-amber-400 transition">
                        <Image className="w-6 h-6 text-gray-400" />
                        <input type="file" accept="image/*" onChange={handleGemPhotoUpload} className="hidden" disabled={uploadingGemPhoto} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Lock toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    {gemForm.isLocked ? <Lock className="w-4 h-4 text-amber-500" /> : <Unlock className="w-4 h-4 text-green-500" />}
                    <div>
                      <p className="text-sm font-medium">Keep location secret?</p>
                      <p className="text-xs text-gray-500">{gemForm.isLocked ? 'Only bookings reveal exact spot' : 'Visible to everyone'}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setGemForm(f => ({ ...f, isLocked: !f.isLocked }))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${gemForm.isLocked ? 'bg-amber-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${gemForm.isLocked ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowGemModal(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={savingGem} className="btn-primary flex-1">
                    {savingGem ? 'Saving...' : '⭐ Add Gem'}
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
