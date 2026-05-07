import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { friendsApi } from '../lib/api';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Search, UserCheck, Users, MapPin, UserPlus, UserMinus, Clock } from 'lucide-react';

export default function FriendsPage() {
  const toast = useToast();
  const [friends, setFriends] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [followLoading, setFollowLoading] = useState({});

  useEffect(() => {
    friendsApi.getFriends()
      .then(d => setFriends(d.friends || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const data = await friendsApi.search(q);
      setSearchResults(data.users || []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const handleFollow = async (userId, currentStatus) => {
    setFollowLoading(l => ({ ...l, [userId]: true }));
    try {
      if (currentStatus === 'ACCEPTED') {
        await api.delete(`/friends/unfollow/${userId}`);
        setFriends(prev => prev.filter(f => f.id !== userId));
        setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, followStatus: null } : u));
        toast.info('Unfollowed');
      } else if (!currentStatus) {
        await api.post(`/friends/follow/${userId}`);
        setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, followStatus: 'PENDING' } : u));
        toast.success('Follow request sent! 👋');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setFollowLoading(l => ({ ...l, [userId]: false }));
    }
  };

  const roleLabel = (role) => {
    if (role === 'GUIDE') return '🗺️ Guide';
    if (role === 'BOTH') return '🌍 Guide & Traveller';
    return '🧳 Traveller';
  };

  const UserCard = ({ u, showFollow = false }) => (
    <div className="card p-4 flex items-center gap-3 hover:shadow-md transition">
      <Link to={`/users/${u.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        {u.avatarUrl ? (
          <img src={u.avatarUrl} className="w-12 h-12 rounded-full object-cover flex-shrink-0" alt="" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
            {u.fullName?.[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{u.fullName}</p>
          <p className="text-xs text-gray-500">{roleLabel(u.role)}</p>
          {(u.guideProfile?.city) && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" />{u.guideProfile.city}
            </p>
          )}
        </div>
      </Link>

      {showFollow && (
        <button
          onClick={() => handleFollow(u.id, u.followStatus)}
          disabled={followLoading[u.id] || u.followStatus === 'PENDING'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-shrink-0 ${
            u.followStatus === 'ACCEPTED' ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600' :
            u.followStatus === 'PENDING' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
            'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {followLoading[u.id] ? (
            <div className="animate-spin w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
          ) : u.followStatus === 'ACCEPTED' ? (
            <><UserMinus className="w-3.5 h-3.5" /> Unfollow</>
          ) : u.followStatus === 'PENDING' ? (
            <><Clock className="w-3.5 h-3.5" /> Pending</>
          ) : (
            <><UserPlus className="w-3.5 h-3.5" /> Follow</>
          )}
        </button>
      )}
    </div>
  );

  return (
    <Layout title="Friends & Connections">
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="input-field pl-9"
          placeholder="Search users by name or email..."
          value={searchQuery}
          onChange={e => handleSearch(e.target.value)}
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {/* Search Results */}
      {searchQuery.length >= 2 && (
        <div className="mb-8">
          <h2 className="font-bold text-gray-700 mb-3 text-sm">
            Search Results {searchResults.length > 0 && `(${searchResults.length})`}
          </h2>
          {searchResults.length === 0 && !searching ? (
            <div className="card p-6 text-center text-gray-500 text-sm">
              No users found for "{searchQuery}"
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {searchResults.map(u => <UserCard key={u.id} u={u} showFollow={true} />)}
            </div>
          )}
        </div>
      )}

      {/* Friends list */}
      {!searchQuery && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="w-5 h-5 text-green-600" />
            <h2 className="font-bold text-gray-900">
              My Connections <span className="text-gray-400 font-normal">({friends.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : friends.length === 0 ? (
            <div className="card p-12 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="font-semibold text-gray-700">No connections yet</p>
              <p className="text-sm mt-1 text-gray-500">Search for people above or book a tour to connect with guides</p>
              <Link to="/explore" className="btn-primary mt-4 inline-block">Explore Guides</Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {friends.map(f => <UserCard key={f.id} u={f} showFollow={false} />)}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
