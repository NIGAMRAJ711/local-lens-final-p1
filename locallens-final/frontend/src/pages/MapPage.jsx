import { useState, useEffect, useRef } from 'react';
import Layout from '../components/shared/Layout';
import { mapApi } from '../lib/api';
import { MapPin, Star, Navigation, Locate, Filter, X } from 'lucide-react';
import { Link } from 'react-router-dom';

// Leaflet loaded from CDN in index.html
let L;

export default function MapPage() {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef([]);
  const [guides, setGuides] = useState([]);
  const [gems, setGems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [citySearch, setCitySearch] = useState('');
  const [showLayer, setShowLayer] = useState('guides'); // guides | gems

  useEffect(() => {
    // Dynamically import Leaflet
    import('leaflet').then(leaflet => {
      L = leaflet.default;
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (mapRef.current && !leafletMap.current) {
        leafletMap.current = L.map(mapRef.current).setView([20.5937, 78.9629], 5);

        // OpenStreetMap tiles (completely free)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(leafletMap.current);

        loadData();
        getUserLocation();
      }
    });

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  const getUserLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      setUserLocation({ lat: latitude, lng: longitude });
      if (leafletMap.current && L) {
        leafletMap.current.setView([latitude, longitude], 12);
        const userIcon = L.divIcon({
          html: '<div style="background:#3b82f6;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>',
          className: '', iconSize: [14, 14], iconAnchor: [7, 7]
        });
        L.marker([latitude, longitude], { icon: userIcon }).addTo(leafletMap.current)
          .bindPopup('<b>📍 You are here</b>');
      }
    }, () => {});
  };

  const loadData = async () => {
    try {
      const [g, gem] = await Promise.all([
        mapApi.getGuides({}).catch(() => ({ guides: [] })),
        mapApi.getHiddenGems({}).catch(() => ({ gems: [] })),
      ]);
      setGuides(g.guides || []);
      setGems(gem.gems || []);
      renderMarkers(g.guides || [], gem.gems || [], 'guides');
    } finally {
      setLoading(false);
    }
  };

  const renderMarkers = (guideList, gemList, layer) => {
    if (!leafletMap.current || !L) return;
    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (layer === 'guides' || layer === 'both') {
      guideList.forEach(g => {
        if (!g.latitude || !g.longitude) return;
        const icon = L.divIcon({
          html: `<div style="background:${g.isAvailable ? '#16a34a' : '#6b7280'};color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer">${g.user?.avatarUrl ? `<img src="${g.user.avatarUrl}" style="width:32px;height:32px;border-radius:50%;object-fit:cover"/>` : '👤'}</div>`,
          className: '', iconSize: [36, 36], iconAnchor: [18, 18],
        });
        const m = L.marker([g.latitude, g.longitude], { icon }).addTo(leafletMap.current);
        m.bindPopup(`
          <div style="min-width:180px">
            <b>${g.user?.fullName}</b>
            <p style="margin:2px 0;font-size:12px;color:#666">📍 ${g.city}</p>
            <p style="margin:2px 0;font-size:12px">⭐ ${g.avgRating?.toFixed(1) || '0'} • ₹${g.hourlyRate}/hr</p>
            <p style="margin:2px 0;font-size:12px">${g.expertiseTags?.slice(0,2).join(', ')}</p>
            <p style="margin:4px 0 0;font-size:11px;color:${g.isAvailable ? '#16a34a' : '#6b7280'}">● ${g.isAvailable ? 'Available Now' : 'Offline'}</p>
            <a href="/guides/${g.id}" style="display:block;margin-top:6px;background:#16a34a;color:white;text-align:center;padding:4px 8px;border-radius:6px;font-size:12px;text-decoration:none">View Profile</a>
          </div>
        `);
        m.on('click', () => setSelectedGuide(g));
        markersRef.current.push(m);
      });
    }

    if (layer === 'gems' || layer === 'both') {
      gemList.forEach(gem => {
        if (!gem.latitude || !gem.longitude) return;
        const icon = L.divIcon({
          html: '<div style="background:#f97316;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">💎</div>',
          className: '', iconSize: [28, 28], iconAnchor: [14, 14],
        });
        const m = L.marker([gem.latitude, gem.longitude], { icon }).addTo(leafletMap.current);
        m.bindPopup(`<div><b>${gem.name}</b><p style="font-size:12px;color:#666">📍 ${gem.city} • ${gem.category}</p></div>`);
        markersRef.current.push(m);
      });
    }
  };

  const handleLayerSwitch = (layer) => {
    setShowLayer(layer);
    renderMarkers(guides, gems, layer);
  };

  const handleCitySearch = async () => {
    if (!citySearch) return;
    try {
      // Geocode using Nominatim (free)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(citySearch)}&limit=1`);
      const data = await res.json();
      if (data[0] && leafletMap.current) {
        leafletMap.current.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 12);
      }
      const g = await mapApi.getGuides({ city: citySearch });
      setGuides(g.guides || []);
      renderMarkers(g.guides || [], gems, showLayer);
    } catch {}
  };

  const centerOnUser = () => {
    if (userLocation && leafletMap.current) {
      leafletMap.current.setView([userLocation.lat, userLocation.lng], 13);
    } else {
      getUserLocation();
    }
  };

  return (
    <Layout title="Live Map">
      {/* Controls */}
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1">
          {[
            { key: 'guides', label: '👤 Guides' },
            { key: 'gems', label: '💎 Hidden Gems' },
            { key: 'both', label: '🗺️ All' },
          ].map(l => (
            <button key={l.key} onClick={() => handleLayerSwitch(l.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${showLayer === l.key ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {l.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-1">
          <input className="input-field flex-1 text-sm" placeholder="Search city..." value={citySearch}
            onChange={e => setCitySearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCitySearch()} />
          <button onClick={handleCitySearch} className="btn-primary px-4 text-sm">Go</button>
        </div>
        <button onClick={centerOnUser} className="flex items-center gap-1.5 btn-secondary text-sm">
          <Locate className="w-4 h-4" /> My Location
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mb-3 text-xs text-gray-600">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-600 inline-block"/> Available guide</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-500 inline-block"/> Offline guide</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block"/> Hidden gem</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block"/> You</span>
      </div>

      <div className="flex gap-4">
        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapRef} style={{ height: '500px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' }} />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
              <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
            </div>
          )}
        </div>

        {/* Selected Guide Panel */}
        {selectedGuide && (
          <div className="w-64 card p-4 self-start">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Guide Details</h3>
              <button onClick={() => setSelectedGuide(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-center mb-3">
              {selectedGuide.user?.avatarUrl ? (
                <img src={selectedGuide.user.avatarUrl} className="w-16 h-16 rounded-full object-cover mx-auto mb-2" alt="" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-green-200 flex items-center justify-center text-2xl font-bold text-green-700 mx-auto mb-2">
                  {selectedGuide.user?.fullName?.[0]}
                </div>
              )}
              <p className="font-semibold text-sm">{selectedGuide.user?.fullName}</p>
              <p className="text-xs text-gray-500 flex items-center justify-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />{selectedGuide.city}
              </p>
            </div>
            <div className="space-y-1.5 text-xs text-gray-600 mb-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" /> Rating</span>
                <span className="font-medium">{selectedGuide.avgRating?.toFixed(1) || '0'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Hourly Rate</span>
                <span className="font-medium text-green-600">₹{selectedGuide.hourlyRate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Status</span>
                <span className={`font-medium ${selectedGuide.isAvailable ? 'text-green-600' : 'text-gray-500'}`}>
                  {selectedGuide.isAvailable ? '● Online' : '○ Offline'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {selectedGuide.expertiseTags?.slice(0, 3).map(t => (
                <span key={t} className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
            <Link to={`/guides/${selectedGuide.id}`} className="btn-primary w-full text-sm text-center block">
              View Profile
            </Link>
            <Link to={`/book/${selectedGuide.id}`} className="btn-outline w-full text-sm text-center block mt-2">
              Book Now
            </Link>
          </div>
        )}
      </div>

      {/* Guide count */}
      <p className="text-sm text-gray-500 mt-3">
        Showing {guides.filter(g => g.latitude && g.longitude).length} guides on map
      </p>
    </Layout>
  );
}
