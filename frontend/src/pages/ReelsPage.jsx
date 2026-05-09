import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { reelApi, uploadApi, bucketListApi } from '../lib/api';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Heart, Share2, Upload, X, Film, MapPin, UserPlus, UserCheck, Play, Pause, Volume2, VolumeX, ArrowLeft } from 'lucide-react';

const REEL_TYPES = ['GENERAL', 'GUIDE_PROMO', 'TRAVELER_EXPERIENCE', 'HIDDEN_GEM', 'FOOD_SPOT', 'VIEWPOINT'];


// Per-reel video component with IntersectionObserver autoplay
function ReelVideo({ reel, isCurrent, muted, playing, onTogglePlay, videoRefs, idx }) {
  const videoRef = useRef(null);
  const [hasError, setHasError] = useState(false);
  const [isPaused, setIsPaused] = useState(true);

  useEffect(() => {
    if (videoRef.current) videoRefs.current[idx] = videoRef.current;
  }, [idx, videoRefs]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          video.muted = muted;
          video.play().then(() => setIsPaused(false)).catch(() => {});
          reelApi.view(reel.id).catch(() => {});
        } else {
          video.pause();
          setIsPaused(true);
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [reel.id, muted]);

  // Sync muted
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  // Sync playing state from parent tap
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isCurrent) return;
    if (playing) { video.play().then(() => setIsPaused(false)).catch(() => {}); }
    else { video.pause(); setIsPaused(true); }
  }, [playing, isCurrent]);

  if (hasError) {
    return (
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
        onClick={onTogglePlay}
      >
        <MapPin className="w-12 h-12 text-white/40 mb-3" />
        <p className="text-white font-semibold text-center px-6">{reel.caption}</p>
        {reel.locationName && <p className="text-white/60 text-sm mt-2">{reel.locationName}</p>}
      </div>
    );
  }

  return (
    <>
      <video
        ref={videoRef}
        src={reel.videoUrl}
        poster={reel.thumbnailUrl || undefined}
        preload="metadata"
        className="absolute inset-0 w-full h-full object-cover"
        loop
        playsInline
        muted={muted}
        onError={() => setHasError(true)}
        onPlay={() => setIsPaused(false)}
        onPause={() => setIsPaused(true)}
        onClick={onTogglePlay}
      />
      {/* Minimal transparent play indicator — shown only when paused */}
      {isPaused && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ transition: 'opacity 0.2s' }}
        >
          <Play className="text-white" style={{ width: 48, height: 48, opacity: 0.75, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }} />
        </div>
      )}
    </>
  );
}

export default function ReelsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ caption: '', reelType: 'GENERAL', city: '', locationName: '', videoUrl: '', thumbnailUrl: '' });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  const videoInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Bucket list state
  const [activeTab, setActiveTab] = useState('reels');
  const [bucketList, setBucketList] = useState([]);
  const [bucketLoading, setBucketLoading] = useState(false);
  const [showAddBucket, setShowAddBucket] = useState(false);
  const [bucketForm, setBucketForm] = useState({ city: '', description: '' });
  const [likedReels, setLikedReels] = useState(new Set());
  const [followStatuses, setFollowStatuses] = useState({});
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(true);
  const containerRef = useRef(null);
  const videoRefs = useRef({});
  const touchStartY = useRef(0);

  useEffect(() => { loadReels(); }, []);
  useEffect(() => { if (activeTab === 'bucket') loadBucketList(); }, [activeTab]);

  const loadBucketList = async () => {
    setBucketLoading(true);
    try {
      const data = await bucketListApi.getAll();
      setBucketList(data.items || []);
    } catch {} finally { setBucketLoading(false); }
  };

  const handleAddBucket = async (e) => {
    e.preventDefault();
    if (!bucketForm.city) return;
    try {
      const data = await bucketListApi.add(bucketForm);
      setBucketList(prev => [data.item, ...prev]);
      setBucketForm({ city: '', description: '' });
      setShowAddBucket(false);
    } catch (err) { toast.error(err.message); }
  };

  const handleBucketComplete = async (id) => {
    try {
      await bucketListApi.complete(id);
      setBucketList(prev => prev.map(i => i.id === id ? { ...i, isCompleted: true, completedAt: new Date().toISOString() } : i));
      toast.success('Added to completed! ✓');
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

  // Pause all except current when index changes
  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([idx, video]) => {
      if (!video) return;
      if (parseInt(idx) !== currentIdx) { video.pause(); video.currentTime = 0; }
      else { video.muted = muted; }
    });
  }, [currentIdx, muted]);

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

  const handleVideoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validTypes = ['video/mp4','video/quicktime','video/webm','video/3gpp'];
    if (!validTypes.includes(file.type)) { toast.error('Invalid format', 'Use MP4, MOV, or WebM'); return; }
    if (file.size > 100 * 1024 * 1024) { toast.error('Video too large', 'Maximum size is 100MB'); return; }
    // Show preview
    const preview = URL.createObjectURL(file);
    setVideoPreviewUrl(preview);
    setUploadProgress(0);
    setUploadProgressText('Uploading...');
    try {
      // Use XMLHttpRequest for progress tracking
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('accessToken');
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => {
          try { const d = JSON.parse(xhr.responseText); d.error ? reject(new Error(d.error)) : resolve(d); }
          catch { reject(new Error('Upload failed')); }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.open('POST', baseUrl + '/upload/video');
        xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        xhr.send(formData);
      });
      setUploadForm(f => ({ ...f, videoUrl: result.url, thumbnailUrl: result.thumbnailUrl || '' }));
      setUploadProgressText('Video ready! ✓');
      toast.success('Video uploaded!');
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
      setUploadProgressText(''); setUploadProgress(0); setVideoPreviewUrl('');
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
        <h1 className="text-white font-bold text-lg">Reels</h1>
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
      ) : (
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* ReelVideo with IntersectionObserver autoplay + error fallback */}
          <ReelVideo
            key={currentReel?.id}
            reel={currentReel}
            isCurrent={true}
            muted={muted}
            playing={playing}
            onTogglePlay={() => setPlaying(p => !p)}
            videoRefs={videoRefs}
            idx={currentIdx}
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70 pointer-events-none" />

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
                    <div className="relative h-48 bg-black rounded-xl overflow-hidden">
                      <video src={videoPreviewUrl || uploadForm.videoUrl} controls className="w-full h-full object-cover" style={{ maxHeight: 200 }} />
                      <div className="absolute top-2 right-2">
                        <button type="button" onClick={() => { setUploadForm(f => ({ ...f, videoUrl: '', thumbnailUrl: '' })); setVideoPreviewUrl(''); setUploadProgress(0); setUploadProgressText(''); }}
                          className="bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">✓ Video ready</div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-xl gap-3">
                      <Film className="w-10 h-10 text-gray-400" />
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="w-40">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 transition-all" style={{ width: uploadProgress + '%' }} />
                          </div>
                          <p className="text-xs text-center text-gray-500 mt-1">{uploadProgress}%</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button type="button" onClick={() => videoInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition">📁 Gallery</button>
                        <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-medium hover:bg-green-200 transition">📹 Record</button>
                      </div>
                      <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
                      <input ref={cameraInputRef} type="file" accept="video/*" capture="environment" onChange={handleVideoSelect} className="hidden" />
                      <span className="text-xs text-gray-400">{uploadProgressText || 'MP4, MOV, WebM — max 100MB'}</span>
                    </div>
                  )}
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
