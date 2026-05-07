import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { mapApi, guideApi } from '../lib/api';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import { MapPin, Star, Locate, X, Globe, Navigation } from 'lucide-react';

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
  const [userLocation, setUserLocation] = useState(null);
  const [L, setL] = useState(null);

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

    return () => {
      if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; }
    };
  }, []);

  // Listen for live guide location updates via socket
  useEffect(() => {
    if (!socket || !L) return;
    socket.on('guide:location-updated', ({ guideId, latitude, longitude }) => {
      setGuides(prev => prev.map(g => g.userId === guideId ? { ...g, latitude, longitude } : g));
      // Update marker on map
      if (markersRef.current[`guide_${guideId}`] && leafletMap.current) {
        markersRef.current[`guide_${guideId}`].setLatLng([latitude, longitude]);
      }
    });
    return () => socket.off('guide:location-updated');
  }, [socket, L]);

  // Update current user's guide location if they are a guide
  useEffect(() => {
    if (!user || (user.role !== 'GUIDE' && user.role !== 'BOTH')) return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude, longitude } = pos.coords;
      try {
        await guideApi.updateLocation(latitude, longitude);
        if (socket) socket.emit('guide:location-update', { latitude, longitude });
      } catch {}
    });
  }, [user, socket]);

  const getUserLocation = (Lmod) => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      setUserLocation({ lat: latitude, lng: longitude });
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
    const initial = guide.user?.fullName?.[0] || '?';
    const available = guide.isAvailable;
    const avatar = guide.user?.avatarUrl;
    return Lmod.divIcon({
      html: `<div style="width:44px;height:44px;border-radius:50%;border:3px solid ${available ? '#16a34a' : '#9ca3af'};overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.3);background:white;cursor:pointer;position:relative">
        ${avatar ? `<img src="${avatar}" style="width:100%;height:100%;object-fit:cover"/>` : `<div style="width:100%;height:100%;background:#16a34a;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:16px">${initial}</div>`}
        <div style="position:absolute;bottom:-2px;right:-2px;width:12px;height:12px;border-radius:50%;background:${available ? '#22c55e' : '#9ca3af'};border:2px solid white"></div>
      </div>`,
      className: '', iconSize: [44, 44], iconAnchor: [22, 22],
    });
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
        m.bindPopup(`
          <div style="min-width:200px;font-family:system-ui">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              ${g.user?.avatarUrl ? `<img src="${g.user.avatarUrl}" style="width:40px;height:40px;border-radius:50%;object-fit:cover"/>` : `<div style="width:40px;height:40px;border-radius:50%;background:#16a34a;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold">${g.user?.fullName?.[0]}</div>`}
              <div>
                <b style="font-size:14px">${g.user?.fullName}</b>
                <div style="font-size:12px;color:#666">📍 ${g.city}</div>
              </div>
            </div>
            <div style="font-size:12px;margin-bottom:4px">⭐ ${g.avgRating?.toFixed(1) || '0'} (${g.totalReviews} reviews)</div>
            <div style="font-size:12px;margin-bottom:8px;color:#16a34a;font-weight:bold">₹${g.hourlyRate}/hr</div>
            <div style="font-size:11px;color:${g.isAvailable ? '#16a34a' : '#9ca3af'};margin-bottom:8px">● ${g.isAvailable ? 'Available Now' : 'Offline'}</div>
            <a href="/guides/${g.id}" style="display:block;background:#16a34a;color:white;text-align:center;padding:6px 12px;border-radius:8px;font-size:12px;text-decoration:none;font-weight:600">View Profile & Book</a>
          </div>
        `);
        m.on('click', () => setSelectedGuide(g));
        markersRef.current[`guide_${g.userId}`] = m;
      });
    }

    if (layer === 'gems' || layer === 'both') {
      gemList.forEach(gem => {
        if (!gem.latitude || !gem.longitude) return;
        const gemIcon = Lmod.divIcon({
          html: `<div style="width:32px;height:32px;border-radius:50%;background:#f97316;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">💎</div>`,
          className: '', iconSize: [32, 32], iconAnchor: [16, 16],
        });
        const m = Lmod.marker([gem.latitude, gem.longitude], { icon: gemIcon }).addTo(leafletMap.current);
        m.bindPopup(`<div><b>${gem.name}</b><p style="font-size:12px;color:#666">📍 ${gem.city} · ${gem.category}</p><p style="font-size:11px">${gem.description || ''}</p></div>`);
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
      // Geocode using Nominatim (free)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(citySearch)}&limit=1`);
      const data = await res.json();
      if (data[0] && leafletMap.current) {
        leafletMap.current.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 12);
      }
      // Filter guides by city
      const g = await mapApi.getGuides({ city: citySearch });
      setGuides(g.guides || []);
      if (L) renderMarkers(g.guides || [], gems, showLayer, L);
    } catch { toast.error('Search failed'); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[{ key: 'guides', label: '👤 Guides' }, { key: 'gems', label: '💎 Gems' }, { key: 'both', label: '🗺️ All' }].map(l => (
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
            <Locate className="w-4 h-4" /> My Location
          </button>
        </div>
        {/* Legend */}
        <div className="max-w-6xl mx-auto flex gap-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-600 inline-block"/> Available</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-400 inline-block"/> Offline</span>
          <span className="flex items-center gap-1"><span className="text-base">💎</span> Hidden gem</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block"/> You</span>
          <span className="ml-auto text-gray-400">{guides.filter(g => g.latitude).length} guides on map</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 flex gap-4">
        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapRef} style={{ height: 'calc(100vh - 180px)', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e5e7eb' }} />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-2xl">
              <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
            </div>
          )}
        </div>

        {/* Selected guide card */}
        {selectedGuide && (
          <div className="w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden sticky top-32">
              {/* Cover */}
              <div className="h-24 bg-gradient-to-br from-green-500 to-emerald-400 relative">
                <button onClick={() => setSelectedGuide(null)} className="absolute top-2 right-2 bg-white/80 rounded-full p-1">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <div className="px-4 pb-4 -mt-8">
                {selectedGuide.user?.avatarUrl ? (
                  <img src={selectedGuide.user.avatarUrl} className="w-16 h-16 rounded-xl border-3 border-white shadow object-cover mb-2" alt="" />
                ) : (
                  <div className="w-16 h-16 rounded-xl border-3 border-white shadow bg-green-200 flex items-center justify-center text-xl font-bold text-green-700 mb-2">
                    {selectedGuide.user?.fullName?.[0]}
                  </div>
                )}
                <h3 className="font-bold text-gray-900">{selectedGuide.user?.fullName}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedGuide.city}</p>
                <div className="flex items-center gap-2 mt-2 text-sm">
                  <span className="flex items-center gap-0.5 text-yellow-500"><Star className="w-3.5 h-3.5 fill-yellow-400" />{selectedGuide.avgRating?.toFixed(1)}</span>
                  <span className="text-green-600 font-bold">₹{selectedGuide.hourlyRate}/hr</span>
                  <span className={`text-xs ${selectedGuide.isAvailable ? 'text-green-600' : 'text-gray-400'}`}>
                    ● {selectedGuide.isAvailable ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2 mb-3">
                  {selectedGuide.expertiseTags?.slice(0, 3).map(t => (
                    <span key={t} className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
                <Link to={`/guides/${selectedGuide.id}`} className="btn-primary w-full text-center block text-sm mb-2">View Profile</Link>
                <Link to={`/book/${selectedGuide.id}`} className="btn-outline w-full text-center block text-sm">Book Now</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
