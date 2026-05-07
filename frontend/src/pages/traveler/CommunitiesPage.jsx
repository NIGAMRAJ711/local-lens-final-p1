import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/shared/Layout';
import { communityApi } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Users, Plus, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function CommunitiesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', coverImage: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadCommunities(); }, []);

  const loadCommunities = async () => {
    try {
      const data = await communityApi.getAll();
      setCommunities(data.communities || []);
    } catch (err) {
      toast.error('Failed to load communities');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await communityApi.create(form);
      setCommunities([data.community, ...communities]);
      setShowCreate(false);
      setForm({ name: '', description: '', coverImage: '' });
      toast.success('Community created!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCoverUpload = async (e) => {
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
      setForm({ ...form, coverImage: data.url });
      toast.success('Image uploaded!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Layout title="Communities">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-600">Join groups, share photos, and connect with other travelers.</p>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition"
        >
          <Plus className="w-4 h-4" /> Create Group
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="card p-6 mb-8 border-t-4 border-t-green-500">
          <h2 className="font-bold text-gray-900 mb-4">Create New Community</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
              <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border-gray-300 rounded-xl focus:ring-green-500 focus:border-green-500" placeholder="E.g., Mumbai Backpackers" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border-gray-300 rounded-xl focus:ring-green-500 focus:border-green-500" rows="3" placeholder="What is this group about?" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cover Photo</label>
              {form.coverImage ? (
                <div className="relative h-32 rounded-xl overflow-hidden mb-2">
                  <img src={form.coverImage} className="w-full h-full object-cover" alt="Cover" />
                  <button type="button" onClick={() => setForm({...form, coverImage: ''})} className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">Remove</button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                  <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Click to upload cover photo</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleCoverUpload} />
                </label>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition">Cancel</button>
              <button type="submit" disabled={submitting} className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-xl transition disabled:opacity-50">
                {submitting ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-20"><div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto" /></div>
      ) : communities.length === 0 ? (
        <div className="text-center py-20 card">
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No communities found. Be the first to create one!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {communities.map(c => (
            <Link key={c.id} to={`/communities/${c.id}`} className="card overflow-hidden group hover:shadow-xl transition-all duration-300 flex flex-col">
              <div className="h-32 bg-gray-200 relative overflow-hidden">
                {c.coverImage ? (
                  <img src={c.coverImage} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-green-400 to-blue-500" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <h3 className="absolute bottom-3 left-4 text-white font-bold text-lg">{c.name}</h3>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">{c.description || 'No description provided.'}</p>
                <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {c._count?.members || 0} members</span>
                  <span>Created by {c.creator?.fullName?.split(' ')[0] || 'Unknown'}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
