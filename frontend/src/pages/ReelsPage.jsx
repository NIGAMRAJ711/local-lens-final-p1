import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { reelApi, uploadApi, bucketListApi } from '../lib/api';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Heart, Share2, Upload, X, Film, MapPin, UserPlus, UserCheck, Play, Pause, Volume2, VolumeX, ArrowLeft } from 'lucide-react';

const REEL_TYPES = ['GENERAL', 'GUIDE_PROMO', 'TRAVELER_EXPERIENCE', 'HIDDEN_GEM', 'FOOD_SPOT', 'VIEWPOINT'];

export default function ReelsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [reels, setReels] = useState([]);
  const [mainTab, setMainTab] = useState("reels");
  const [bucketList, setBucketList] = useState([]);
  const [bucketLoading, setBucketLoading] = useState(false);
  const [showAddBucket, setShowAddBucket] = useState(false);
  const [bucketForm, setBucketForm] = useState({ city: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ caption: '', reelType: 'GENERAL', city: '', locationName: '', videoUrl: '', thumbnailUrl: '' });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadPct, setUploadPct] = useState(0);
  const [videoPreview, setVideoPreview] = useState(null);
  const videoInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [likedReels, setLikedReels] = useState(new Set());
  const [followStatuses, setFollowStatuses] = useState({});
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const containerRef = useRef(null);
  const videoRefs = useRef({});
  const touchStartY = useRef(0);

  useEffect(() => { loadReels(); }, []);
  useEffect(() => { if (mainTab === 'bucket' && bucketList.length === 0) loadBucketList(); }, [mainTab]);

  const loadBucketList = async () => {
    setBucketLoading(true);
    try { const d = await bucketListApi.get(); setBucketList(d.items || []); } catch {}
    finally { setBucketLoading(false); }
  };

  const handleAddBucket = async (e) => {
    e.preventDefault();
    if (!bucketForm.city.trim()) { toast.error('City is required'); return; }
    try {
      const d = await bucketListApi.add(bucketForm);
      setBucketList(prev => [d.item, ...prev]);
      setBucketForm({ city: '', description: '' });
      setShowAddBucket(false);
      toast.success('Added to bucket list! 🗺️');
    } catch (err) { toast.error(err.message); }
  };

  const handleBucketComplete = async (id) => {
    try {
      await bucketListApi.complete(id);
      setBucketList(prev => prev.map(i => i.id === id ? { ...i, isCompleted: true, completedAt: new Date().toISOString() } : i));
      toast.success('Marked complete! ✓');
    } catch (err) { toast.error(err.message); }
  };

  const handleBucketRemove = async (id) => {
    try {
      await bucketListApi.remove(id);
      setBucketList(prev => prev.filter(i => i.id !== id));
    } catch (err) { toast.error(err.message); }
  };

  const loadReels = async () => {
    try {
      const data = await reelApi.getFeed({ limit: 30 });
      setReels(data.reels || []);
    } catch { setReels([]); }
    finally { setLoading(false); }
  };

  // Auto-play current reel, pause others
  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([idx, video]) => {
      if (!video) return;
      if (parseInt(idx) === currentIdx) {
        video.muted = muted;
        if (playing) video.play().catch(() => {});
        else video.pause();
        reelApi.view(reels[currentIdx]?.id).catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [currentIdx, playing, muted, reels]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'j') setCurrentIdx(i => Math.min(i + 1, reels.length - 1));
      if (e.key === 'ArrowUp' || e.key === 'k') setCurrentIdx(i => Math.max(i - 1, 0));
      if (e.key === 'm') setMuted(m => !m);
      if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [reels.length]);

  const handleLike = async (reelId, e) => {
    e.stopPropagation();
    try {
      const data = await reelApi.like(reelId);
      setLikedReels(prev => {
        const next = new Set(prev);
        data.liked ? next.add(reelId) : next.delete(reelId);
        return next;
      });
      setReels(rs => rs.map(r => r.id === reelId ? { ...r, likesCount: r.likesCount + (data.liked ? 1 : -1) } : r));
    } catch {}
  };

  const handleFollow = async (userId, e) => {
    e.stopPropagation();
    const current = followStatuses[userId];
    try {
      if (current === 'ACCEPTED') {
        await api.delete(`/friends/unfollow/${userId}`);
        setFollowStatuses(s => ({ ...s, [userId]: null }));
        toast.info('Unfollowed');
      } else if (!current) {
        await api.post(`/friends/follow/${userId}`);
        setFollowStatuses(s => ({ ...s, [userId]: 'PENDING' }));
        toast.success('Follow request sent!');
      }
    } catch (err) { toast.error(err.message); }
  };

  const handleShare = async (reel, e) => {
    e?.stopPropagation();
    const url = `${window.location.origin}/reels?id=${reel?.id}`;
    const text = reel?.caption || `Check this out on LocalLens — ${reel?.locationName || reel?.city || ''}`;
    try {
      if (navigator.share) await navigator.share({ title: reel?.caption || 'LocalLens Reel', text, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied!', 'Share it with your friends');
      }
    } catch {}
  };
    e.stopPropagation();
    const text = `${reel.caption || 'Check this reel on LocalLens!'}`;
    try {
      if (navigator.share) await navigator.share({ title: 'LocalLens Reel', text, url: window.location.href });
      else {
        await navigator.clipboard.writeText(text + ' ' + window.location.href);
        toast.success('Link copied!');
      }
    } catch {}
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validTypes = ['video/mp4','video/quicktime','video/webm','video/3gpp'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|mov|webm|3gp)$/i)) {
      toast.error('Invalid format', 'Use MP4, MOV, or WebM'); return;
    }
    if (file.size > 100 * 1024 * 1024) { toast.error('Video too large', 'Maximum size is 100MB'); return; }
    const preview = URL.createObjectURL(file);
    setVideoPreview(preview);
    setUploadPct(0);
    setUploadProgress('Uploading...');
    try {
      // Use XHR for progress tracking
      const token = localStorage.getItem('accessToken');
      const formData = new FormData();
      formData.append('file', file);
      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setUploadPct(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => {
          try { resolve(JSON.parse(xhr.responseText)); } catch { reject(new Error('Upload failed')); }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.open('POST', `${import.meta.env.VITE_API_URL || ''}/api/upload/video`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });
      if (result.error) throw new Error(result.error);
      setUploadForm(f => ({ ...f, videoUrl: result.url, thumbnailUrl: result.thumbnailUrl || '' }));
      setUploadProgress('Video ready! ✓');
      setUploadPct(100);
      toast.success('Video uploaded!');
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
      setUploadProgress('');
      setVideoPreview(null);
      setUploadPct(0);
    }
  };

  const handleSubmitReel = async (e) => {
    e.preventDefault();
    if (!uploadForm.videoUrl) { toast.error('Please upload a video first'); return; }
    setUploading(true);
    try {
      await reelApi.upload(uploadForm);
      setShowUpload(false);
      setUploadForm({ caption: '', reelType: 'GENERAL', city: '', locationName: '', videoUrl: '', thumbnailUrl: '' });
      setUploadProgress('');
      await loadReels();
      toast.success('Reel posted! 🎬 Visible to all users');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Touch/swipe handling for mobile
  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e) => {
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) {
      if (diff > 0) setCurrentIdx(i => Math.min(i + 1, reels.length - 1));
      else setCurrentIdx(i => Math.max(i - 1, 0));
    }
  };

  const currentReel = reels[currentIdx];

  // Reset video error state when switching reels
  useEffect(() => { setVideoError(false); }, [currentIdx]);

  if (loading) return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black flex flex-col" style={{ zIndex: 100 }}>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4">
        <button onClick={() => navigate(-1)} className="text-white p-2 hover:bg-white/20 rounded-full transition">
          <ArrowLeft className="w-6 h-6" />
        </button>
        {/* Tab switcher */}
        <div className="flex bg-white/20 rounded-full p-1 gap-1">
          <button onClick={() => setMainTab('reels')}
            className={`text-sm font-semibold px-4 py-1 rounded-full transition ${mainTab === 'reels' ? 'bg-white text-gray-900' : 'text-white'}`}>
            🎬 Reels
          </button>
          <button onClick={() => setMainTab('bucket')}
            className={`text-sm font-semibold px-4 py-1 rounded-full transition ${mainTab === 'bucket' ? 'bg-white text-gray-900' : 'text-white'}`}>
            🗺️ Bucket List
          </button>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 bg-white text-black text-sm font-semibold px-4 py-2 rounded-full hover:bg-gray-100 transition"
        >
          <Upload className="w-4 h-4" />
          Post
        </button>
      </div>

      {/* Reel progress dots */}
      {reels.length > 0 && (
        <div className="absolute top-16 left-0 right-0 z-20 flex justify-center gap-1 px-4">
          {reels.slice(0, 10).map((_, i) => (
            <div key={i} onClick={() => setCurrentIdx(i)} className={`cursor-pointer rounded-full transition-all ${i === currentIdx ? 'w-6 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'}`} />
          ))}
        </div>
      )}

      {/* Main reel viewer */}
      {reels.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-white">
          <Film className="w-16 h-16 mb-4 opacity-40" />
          <p className="text-lg font-medium">No reels yet</p>
          <p className="text-sm opacity-60 mb-6">Be the first to share!</p>
          <button onClick={() => setShowUpload(true)} className="bg-white text-black px-6 py-3 rounded-full font-semibold">
            Upload Reel
          </button>
        </div>
      ) : mainTab === 'bucket' ? (
        /* ── Bucket List view ── */
        <div className="flex-1 overflow-y-auto bg-gray-900 pt-16 pb-6 px-4">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-lg">🗺️ Places to Visit</h2>
              {user && <button onClick={() => setShowAddBucket(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-sm font-semibold rounded-full hover:bg-green-600 transition">
                + Add
              </button>}
            </div>
            {showAddBucket && (
              <form onSubmit={handleAddBucket} className="bg-white/10 rounded-2xl p-4 mb-4 space-y-2">
                <input className="w-full bg-white/20 text-white placeholder-white/50 rounded-xl px-3 py-2 text-sm outline-none" placeholder="City *"
                  value={bucketForm.city} onChange={e => setBucketForm(f => ({ ...f, city: e.target.value }))} required />
                <textarea className="w-full bg-white/20 text-white placeholder-white/50 rounded-xl px-3 py-2 text-sm outline-none resize-none" rows={2} placeholder="Why do you want to visit?"
                  value={bucketForm.description} onChange={e => setBucketForm(f => ({ ...f, description: e.target.value }))} />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowAddBucket(false)} className="flex-1 py-2 rounded-xl bg-white/10 text-white text-sm">Cancel</button>
                  <button type="submit" className="flex-1 py-2 rounded-xl bg-green-500 text-white text-sm font-semibold">Add</button>
                </div>
              </form>
            )}
            {bucketLoading ? (
              <div className="text-center py-10"><div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto" /></div>
            ) : bucketList.length === 0 ? (
              <div className="text-center py-16 text-white/60">
                <p className="text-4xl mb-3">🗺️</p>
                <p className="font-semibold">No places yet</p>
                <p className="text-sm mt-1">Add cities you dream of visiting</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...bucketList].sort((a,b) => Number(a.isCompleted) - Number(b.isCompleted)).map(item => (
                  <div key={item.id} className={`rounded-2xl p-4 ${item.isCompleted ? 'bg-green-900/40 border border-green-600/30' : 'bg-white/10'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-lg ${item.isCompleted ? 'text-green-400' : 'text-white'}`}>
                          {item.isCompleted ? '✓ ' : ''}{item.city}
                        </p>
                        {item.description && <p className="text-white/60 text-sm mt-0.5 line-clamp-2">{item.description}</p>}
                        {item.isCompleted && item.completedAt && (
                          <p className="text-green-400 text-xs mt-1">Visited {new Date(item.completedAt).toLocaleDateString()}</p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {!item.isCompleted && (
                          <button onClick={() => handleBucketComplete(item.id)}
                            className="text-xs bg-green-500 text-white px-2.5 py-1 rounded-full hover:bg-green-600 transition">✓ Done</button>
                        )}
                        <button onClick={() => handleBucketRemove(item.id)}
                          className="text-xs text-white/50 hover:text-red-400 transition">✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => setPlaying(p => !p)}
        >
          {/* Video or error fallback */}
          {videoError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white"
              style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
              <MapPin className="w-10 h-10 mb-3 opacity-60" />
              <p className="font-semibold text-center px-8 leading-snug">{currentReel?.caption}</p>
              {currentReel?.locationName && (
                <p className="text-sm opacity-60 mt-2 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />{currentReel.locationName}
                </p>
              )}
            </div>
          ) : (
            <video
              key={currentReel?.id}
              ref={el => videoRefs.current[currentIdx] = el}
              src={currentReel?.videoUrl}
              poster={currentReel?.thumbnailUrl || undefined}
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover"
              loop
              playsInline
              muted={muted}
              onError={() => setVideoError(true)}
            />
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70 pointer-events-none" />

          {/* Minimal play icon — only when paused, no bg/border */}
          {!playing && !videoError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Play className="w-12 h-12 text-white drop-shadow-lg" style={{ opacity: 0.75 }} />
            </div>
          )}

          {/* Right side actions */}
          <div className="absolute right-4 bottom-32 flex flex-col items-center gap-5 z-10">
            {/* Avatar */}
            {currentReel?.user?.avatarUrl ? (
              <img src={currentReel.user.avatarUrl} className="w-11 h-11 rounded-full border-2 border-white object-cover" alt="" />
            ) : (
              <div className="w-11 h-11 rounded-full border-2 border-white bg-green-500 flex items-center justify-center text-white font-bold">
                {currentReel?.user?.fullName?.[0]}
              </div>
            )}

            {/* Follow button */}
            {currentReel?.user?.id !== user?.id && (
              <button onClick={(e) => handleFollow(currentReel?.user?.id, e)} className="flex flex-col items-center gap-1">
                {followStatuses[currentReel?.user?.id] === 'ACCEPTED' ? (
                  <div className="bg-green-500 rounded-full p-2"><UserCheck className="w-6 h-6 text-white" /></div>
                ) : followStatuses[currentReel?.user?.id] === 'PENDING' ? (
                  <div className="bg-gray-500 rounded-full p-2"><UserPlus className="w-6 h-6 text-white" /></div>
                ) : (
                  <div className="bg-white/20 rounded-full p-2"><UserPlus className="w-6 h-6 text-white" /></div>
                )}
                <span className="text-white text-xs">
                  {followStatuses[currentReel?.user?.id] === 'ACCEPTED' ? 'Following' : followStatuses[currentReel?.user?.id] === 'PENDING' ? 'Sent' : 'Follow'}
                </span>
              </button>
            )}

            {/* Like */}
            <button onClick={(e) => handleLike(currentReel?.id, e)} className="flex flex-col items-center gap-1">
              <Heart className={`w-8 h-8 transition ${likedReels.has(currentReel?.id) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
              <span className="text-white text-xs font-medium">{currentReel?.likesCount || 0}</span>
            </button>

            {/* Share */}
            <button onClick={(e) => handleShare(currentReel, e)} className="flex flex-col items-center gap-1">
              <Share2 className="w-7 h-7 text-white" />
              <span className="text-white text-xs">Share</span>
            </button>

            {/* Mute */}
            <button onClick={(e) => { e.stopPropagation(); setMuted(m => !m); }} className="flex flex-col items-center gap-1">
              {muted ? <VolumeX className="w-7 h-7 text-white" /> : <Volume2 className="w-7 h-7 text-white" />}
            </button>
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-24 left-4 right-20 z-10">
            <p className="text-white font-semibold text-base">{currentReel?.user?.fullName}</p>
            {currentReel?.caption && (
              <p className="text-white/90 text-sm mt-1 line-clamp-2">{currentReel.caption}</p>
            )}
            {currentReel?.locationName && (
              <p className="text-white/70 text-xs mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />{currentReel.locationName}
              </p>
            )}
            <span className="inline-block mt-1 text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
              {currentReel?.reelType?.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      )}

      {/* Bottom navigation arrows */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 z-20">
        <button onClick={() => setCurrentIdx(i => Math.max(i - 1, 0))} disabled={currentIdx === 0}
          className="bg-white/20 text-white px-6 py-2 rounded-full text-sm font-medium disabled:opacity-30 hover:bg-white/30 transition">
          ↑ Prev
        </button>
        <span className="text-white/70 text-sm self-center">{currentIdx + 1} / {reels.length}</span>
        <button onClick={() => setCurrentIdx(i => Math.min(i + 1, reels.length - 1))} disabled={currentIdx === reels.length - 1}
          className="bg-white/20 text-white px-6 py-2 rounded-full text-sm font-medium disabled:opacity-30 hover:bg-white/30 transition">
          ↓ Next
        </button>
      </div>
      ) /* end reels view */}

      {/* Upload Modal */}
      {showUpload && (
        <div className="absolute inset-0 bg-black/80 flex items-end z-50" onClick={e => e.target === e.currentTarget && setShowUpload(false)}>
          <div className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Upload Reel</h2>
                <button onClick={() => { setShowUpload(false); setUploadProgress(''); }}
                  className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSubmitReel} className="space-y-4">
                {/* Video Upload */}
                <div>
                  {uploadForm.videoUrl ? (
                    <div className="relative rounded-xl overflow-hidden bg-black">
                      {videoPreview && <video src={videoPreview} controls className="w-full max-h-48 rounded-xl" />}
                      <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">✓ Video ready</div>
                      <button type="button" onClick={() => { setUploadForm(f=>({...f,videoUrl:'',thumbnailUrl:''})); setVideoPreview(null); setUploadPct(0); setUploadProgress(''); }}
                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/80">×</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {uploadProgress && uploadProgress !== 'Video ready! ✓' && (
                        <div>
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>{uploadProgress}</span><span>{uploadPct}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 transition-all" style={{ width: `${uploadPct}%` }} />
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button type="button" onClick={() => videoInputRef.current?.click()}
                          className="flex-1 flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-green-500 transition text-gray-500">
                          <Film className="w-7 h-7 mb-1 text-gray-400" />
                          <span className="text-xs">📁 Gallery</span>
                        </button>
                        <button type="button" onClick={() => cameraInputRef.current?.click()}
                          className="flex-1 flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-green-500 transition text-gray-500">
                          <Film className="w-7 h-7 mb-1 text-gray-400" />
                          <span className="text-xs">📹 Record</span>
                        </button>
                      </div>
                      <p className="text-xs text-center text-gray-400">MP4, MOV, WebM · Max 100MB</p>
                    </div>
                  )}
                  <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                  <input ref={cameraInputRef} type="file" accept="video/*" capture="environment" onChange={handleVideoUpload} className="hidden" />
                </div>

                <textarea className="input-field text-sm" rows={3} placeholder="Write a caption..."
                  value={uploadForm.caption} onChange={e => setUploadForm(f => ({ ...f, caption: e.target.value }))} />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Type</label>
                    <select className="input-field text-sm" value={uploadForm.reelType}
                      onChange={e => setUploadForm(f => ({ ...f, reelType: e.target.value }))}>
                      {REEL_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">City</label>
                    <input className="input-field text-sm" placeholder="e.g. Mumbai" value={uploadForm.city}
                      onChange={e => setUploadForm(f => ({ ...f, city: e.target.value }))} />
                  </div>
                </div>

                <input className="input-field text-sm" placeholder="Location name (e.g. Marina Beach)" value={uploadForm.locationName}
                  onChange={e => setUploadForm(f => ({ ...f, locationName: e.target.value }))} />

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => { setShowUpload(false); setUploadProgress(''); }} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={uploading || !uploadForm.videoUrl} className="btn-primary flex-1">
                    {uploading ? 'Posting...' : 'Post Reel 🎬'}
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
