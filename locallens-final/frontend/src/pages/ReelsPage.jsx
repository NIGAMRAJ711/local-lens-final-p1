import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { reelApi, uploadApi } from '../lib/api';
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
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ caption: '', reelType: 'GENERAL', city: '', locationName: '', videoUrl: '', thumbnailUrl: '' });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [likedReels, setLikedReels] = useState(new Set());
  const [followStatuses, setFollowStatuses] = useState({});
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(true);
  const containerRef = useRef(null);
  const videoRefs = useRef({});
  const touchStartY = useRef(0);

  useEffect(() => { loadReels(); }, []);

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
    if (file.size > 100 * 1024 * 1024) { toast.error('Video must be under 100MB'); return; }
    setUploadProgress('Uploading video...');
    try {
      const data = await uploadApi.video(file);
      setUploadForm(f => ({ ...f, videoUrl: data.url, thumbnailUrl: data.thumbnailUrl || '' }));
      setUploadProgress('Video ready! ✓');
      toast.success('Video uploaded!');
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
      setUploadProgress('');
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
          onClick={() => setPlaying(p => !p)}
        >
          {/* Video */}
          <video
            key={currentReel?.id}
            ref={el => videoRefs.current[currentIdx] = el}
            src={currentReel?.videoUrl}
            poster={currentReel?.thumbnailUrl || undefined}
            className="absolute inset-0 w-full h-full object-cover"
            loop
            playsInline
            muted={muted}
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />

          {/* Play/pause indicator */}
          {!playing && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/40 rounded-full p-5">
                <Play className="w-10 h-10 text-white" />
              </div>
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
                      <video src={uploadForm.videoUrl} className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2">
                        <button type="button" onClick={() => setUploadForm(f => ({ ...f, videoUrl: '', thumbnailUrl: '' }))}
                          className="bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">✓ Video ready</div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-green-500 transition">
                      <Film className="w-10 h-10 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">{uploadProgress || 'Tap to upload video (max 100MB)'}</span>
                      <span className="text-xs text-gray-400 mt-1">MP4, MOV, WebM</span>
                      <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                    </label>
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
