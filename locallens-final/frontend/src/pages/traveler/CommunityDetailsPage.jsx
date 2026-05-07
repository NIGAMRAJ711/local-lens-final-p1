import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/shared/Layout';
import { communityApi } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Users, Image as ImageIcon, Send, ArrowLeft, LogOut, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

export default function CommunityDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  
  const [community, setCommunity] = useState(null);
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [posting, setPosting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { loadCommunity(); }, [id]);

  const loadCommunity = async () => {
    try {
      const data = await communityApi.getOne(id);
      setCommunity(data.community);
      setMembers(data.members || []);
      setPosts(data.posts || []);
    } catch (err) {
      toast.error('Failed to load community');
      navigate('/communities');
    } finally {
      setLoading(false);
    }
  };

  const isMember = members.some(m => m.userId === user?.id);

  const handleJoinLeave = async () => {
    setActionLoading(true);
    try {
      if (isMember) {
        await communityApi.leave(id);
        setMembers(members.filter(m => m.userId !== user?.id));
        toast.info('Left community');
      } else {
        const data = await communityApi.join(id);
        setMembers([...members, { userId: user.id, user, role: 'MEMBER' }]);
        toast.success('Joined community!');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!content.trim() && !mediaUrl) return;
    setPosting(true);
    try {
      const data = await communityApi.createPost(id, { content, mediaUrl });
      setPosts([data.post, ...posts]);
      setContent('');
      setMediaUrl('');
      toast.success('Posted successfully');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPosting(false);
    }
  };

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.info('Uploading image...');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setMediaUrl(data.url);
      toast.success('Image attached!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <Layout><div className="text-center py-20"><div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto" /></div></Layout>;
  if (!community) return null;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto pb-10">
        <button onClick={() => navigate('/communities')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 transition">
          <ArrowLeft className="w-4 h-4" /> Back to Communities
        </button>

        {/* Header */}
        <div className="card overflow-hidden mb-6">
          <div className="h-48 md:h-64 relative bg-gray-200">
            {community.coverImage ? (
              <img src={community.coverImage} alt={community.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-green-400 to-blue-500" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between">
              <div className="text-white">
                <h1 className="text-3xl font-bold mb-2">{community.name}</h1>
                <p className="flex items-center gap-2 text-sm opacity-90"><Users className="w-4 h-4" /> {members.length} Members</p>
              </div>
              <button
                onClick={handleJoinLeave}
                disabled={actionLoading}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50 ${
                  isMember ? 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm' : 'bg-green-500 hover:bg-green-400 text-white shadow-lg'
                }`}
              >
                {isMember ? <><LogOut className="w-4 h-4" /> Leave Group</> : 'Join Group'}
              </button>
            </div>
          </div>
          <div className="p-6 bg-white">
            <p className="text-gray-700">{community.description || 'No description provided for this community.'}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Feed */}
          <div className="md:col-span-2 space-y-4">
            {isMember ? (
              <form onSubmit={handlePost} className="card p-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {user?.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" alt="" /> : <UserAvatar name={user?.fullName} />}
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="Write something to the group..."
                      className="w-full border-none focus:ring-0 resize-none bg-gray-50 rounded-xl p-3 text-sm min-h-[80px]"
                    />
                    {mediaUrl && (
                      <div className="relative mt-2 inline-block">
                        <img src={mediaUrl} alt="Attached" className="h-32 rounded-xl object-cover border border-gray-200" />
                        <button type="button" onClick={() => setMediaUrl('')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition"><LogOut className="w-3 h-3 rotate-45" /></button>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <label className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 cursor-pointer transition px-2 py-1 rounded-lg hover:bg-green-50">
                        <ImageIcon className="w-4 h-4" /> Attach Photo
                        <input type="file" className="hidden" accept="image/*" onChange={handleMediaUpload} />
                      </label>
                      <button type="submit" disabled={posting || (!content.trim() && !mediaUrl)} className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50">
                        {posting ? 'Posting...' : <><Send className="w-4 h-4" /> Post</>}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <div className="card p-6 text-center text-gray-500 bg-gray-50 border border-gray-100">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>Join this community to view the feed and participate in discussions.</p>
              </div>
            )}

            {isMember && posts.length === 0 ? (
              <div className="text-center py-10 text-gray-500 card bg-transparent border border-dashed border-gray-300">
                <p>No posts yet. Be the first to start a conversation!</p>
              </div>
            ) : isMember && posts.map(post => (
              <div key={post.id} className="card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                    {post.author?.avatarUrl ? <img src={post.author.avatarUrl} className="w-full h-full object-cover" alt="" /> : <UserAvatar name={post.author?.fullName} />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{post.author?.fullName}</p>
                    <p className="text-xs text-gray-500">{format(new Date(post.createdAt), 'MMM d, yyyy • h:mm a')}</p>
                  </div>
                </div>
                <p className="text-gray-800 text-sm whitespace-pre-wrap mb-3">{post.content}</p>
                {post.mediaUrl && (
                  <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                    <img src={post.mediaUrl} alt="Post media" className="w-full max-h-96 object-contain" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div>
            <div className="card p-5 sticky top-20">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-green-600" /> Members ({members.length})</h3>
              <div className="space-y-3">
                {members.slice(0, 10).map(m => (
                  <div key={m.userId} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                      {m.user?.avatarUrl ? <img src={m.user.avatarUrl} className="w-full h-full object-cover" alt="" /> : <UserAvatar name={m.user?.fullName} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.user?.fullName}</p>
                      {m.role === 'ADMIN' && <p className="text-xs text-green-600 font-bold">Admin</p>}
                    </div>
                  </div>
                ))}
                {members.length > 10 && <p className="text-xs text-center text-gray-500 pt-2 border-t border-gray-100">+ {members.length - 10} more members</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function UserAvatar({ name }) {
  return <div className="w-full h-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">{name?.[0]?.toUpperCase()}</div>;
}
