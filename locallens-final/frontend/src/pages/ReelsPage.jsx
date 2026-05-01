import { useState, useEffect, useRef } from 'react';
import Layout from '../components/shared/Layout';
import { reelApi, uploadApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Heart, MessageCircle, Share2, Play, Pause, Upload, X, MapPin, Plus, Film } from 'lucide-react';

const REEL_TYPES = ['GENERAL', 'GUIDE_PROMO', 'TRAVELER_EXPERIENCE', 'HIDDEN_GEM', 'FOOD_SPOT', 'VIEWPOINT', 'STREET_ART'];

export default function ReelsPage() {
  const { user } = useAuth();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ caption: '', reelType: 'GENERAL', city: '', locationName: '', videoUrl: '', thumbnailUrl: '' });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [likedReels, setLikedReels] = useState(new Set());
  const videoRefs = useRef({});

  useEffect(() => { loadReels(); }, []);

  const loadReels = async () => {
    try {
      const data = await reelApi.getFeed({ limit: 20 });
      setReels(data.reels || []);
    } catch { setReels([]); }
    finally { setLoading(false); }
  };

  const handleLike = async (reelId) => {
    try {
      const data = await reelApi.like(reelId);
      setLikedReels(prev => {
        const next = new Set(prev);
        data.liked ? next.add(reelId) : next.delete(reelId);
        return next;
      });
      setReels(rs => rs.map(r => r.id === reelId ? {
        ...r,
        likesCount: r.likesCount + (data.liked ? 1 : -1)
      } : r));
    } catch (err) { alert(err.message); }
  };

  const handleShare = async (reel) => {
    const text = `Check out this reel on LocalLens: ${reel.caption || ''}`;
    if (navigator.share) {
      await navigator.share({ title: 'LocalLens Reel', text, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(text + ' ' + window.location.href);
      alert('Link copied!');
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { alert('Video must be under 50MB'); return; }
    setUploadProgress('Uploading video...');
    try {
      const data = await uploadApi.video(file);
      setUploadForm(f => ({ ...f, videoUrl: data.url, thumbnailUrl: data.thumbnailUrl || '' }));
      setUploadProgress('Video ready!');
    } catch (err) {
      alert('Upload failed: ' + err.message);
      setUploadProgress('');
    }
  };

  const handleSubmitReel = async (e) => {
    e.preventDefault();
    if (!uploadForm.videoUrl) { alert('Please upload a video first'); return; }
    setUploading(true);
    try {
      await reelApi.upload(uploadForm);
      setShowUpload(false);
      setUploadForm({ caption: '', reelType: 'GENERAL', city: '', locationName: '', videoUrl: '', thumbnailUrl: '' });
      setUploadProgress('');
      await loadReels();
      alert('Reel posted successfully! It is now visible to all users.');
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const togglePlay = (reelId) => {
    const video = videoRefs.current[reelId];
    if (!video) return;
    if (video.paused) { video.play(); reelApi.view(reelId).catch(() => {}); }
    else video.pause();
  };

  return (
    <Layout title="Travel Reels">
      {/* Upload Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 btn-primary"
        >
          <Upload className="w-4 h-4" />
          Upload Reel
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto" />
        </div>
      ) : reels.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Film className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No reels yet</p>
          <p className="text-sm">Be the first to share your travel experience!</p>
          <button onClick={() => setShowUpload(true)} className="btn-primary mt-4">Upload Reel</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reels.map(reel => (
            <div key={reel.id} className="card overflow-hidden">
              {/* Video */}
              <div className="relative bg-black aspect-[9/16] max-h-80 cursor-pointer" onClick={() => togglePlay(reel.id)}>
                {reel.videoUrl && (reel.videoUrl.startsWith('data:video') || reel.videoUrl.includes('.mp4') || reel.videoUrl.includes('cloudinary')) ? (
                  <video
                    ref={el => videoRefs.current[reel.id] = el}
                    src={reel.videoUrl}
                    poster={reel.thumbnailUrl || undefined}
                    className="w-full h-full object-cover"
                    loop
                    playsInline
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="w-12 h-12 text-white/30" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                  <div className="bg-black/40 rounded-full p-3">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                </div>
                {reel.locationName && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs bg-black/50 rounded-full px-2 py-1">
                    <MapPin className="w-3 h-3" /> {reel.locationName}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  {reel.user?.avatarUrl ? (
                    <img src={reel.user.avatarUrl} className="w-7 h-7 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-green-200 flex items-center justify-center text-xs font-bold text-green-700">
                      {reel.user?.fullName?.[0]}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{reel.user?.fullName}</p>
                    <p className="text-xs text-gray-400">{reel.city}</p>
                  </div>
                  <span className="ml-auto text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                    {reel.reelType?.replace(/_/g, ' ')}
                  </span>
                </div>
                {reel.caption && <p className="text-sm text-gray-700 mb-2 line-clamp-2">{reel.caption}</p>}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <button onClick={() => handleLike(reel.id)} className="flex items-center gap-1 hover:text-red-500 transition">
                    <Heart className={`w-4 h-4 ${likedReels.has(reel.id) ? 'fill-red-500 text-red-500' : ''}`} />
                    {reel.likesCount}
                  </button>
                  <span className="flex items-center gap-1">
                    <Play className="w-4 h-4" /> {reel.views}
                  </span>
                  <button onClick={() => handleShare(reel)} className="flex items-center gap-1 hover:text-blue-500 transition ml-auto">
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Upload Reel</h2>
                <button onClick={() => { setShowUpload(false); setUploadProgress(''); }} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitReel} className="space-y-4">
                {/* Video Upload */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Video File *</label>
                  {uploadForm.videoUrl ? (
                    <div className="relative bg-black rounded-lg overflow-hidden h-40">
                      <video src={uploadForm.videoUrl} className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2">
                        <button type="button" onClick={() => setUploadForm(f => ({ ...f, videoUrl: '', thumbnailUrl: '' }))}
                          className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                        ✓ Video ready
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 transition">
                      <Film className="w-10 h-10 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">
                        {uploadProgress || 'Click to upload video (max 50MB)'}
                      </span>
                      <span className="text-xs text-gray-400 mt-1">MP4, MOV, WebM supported</span>
                      <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                    </label>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Caption</label>
                  <textarea className="input-field text-sm" rows={3} placeholder="What's this reel about?"
                    value={uploadForm.caption} onChange={e => setUploadForm(f => ({ ...f, caption: e.target.value }))} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Type</label>
                    <select className="input-field text-sm" value={uploadForm.reelType}
                      onChange={e => setUploadForm(f => ({ ...f, reelType: e.target.value }))}>
                      {REEL_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">City</label>
                    <input className="input-field text-sm" placeholder="e.g. Chennai" value={uploadForm.city}
                      onChange={e => setUploadForm(f => ({ ...f, city: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Location Name</label>
                  <input className="input-field text-sm" placeholder="e.g. Marina Beach" value={uploadForm.locationName}
                    onChange={e => setUploadForm(f => ({ ...f, locationName: e.target.value }))} />
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => { setShowUpload(false); setUploadProgress(''); }} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={uploading || !uploadForm.videoUrl} className="btn-primary flex-1">
                    {uploading ? 'Posting...' : 'Post Reel'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
