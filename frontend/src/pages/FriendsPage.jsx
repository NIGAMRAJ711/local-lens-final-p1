import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { friendsApi } from '../lib/api';
import { Search, UserCheck, Users, MapPin } from 'lucide-react';

export default function FriendsPage() {
  const [friends, setFriends] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('friends');

  useEffect(() => {
    friendsApi.getFriends().then(d => { setFriends(d.friends || []); setLoading(false); }).catch(() => setLoading(false));
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

  const roleLabel = (role) => {
    if (role === 'GUIDE') return '🗺️ Guide';
    if (role === 'BOTH') return '🌍 Guide & Traveller';
    return '🧳 Traveller';
  };

  const UserCard = ({ u }) => (
    <Link to={`/users/${u.id}`} className="card p-4 flex items-center gap-3 hover:shadow-md transition">
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
        {u.guideProfile?.city && (
          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />{u.guideProfile.city}
          </p>
        )}
      </div>
      <ChevronRightIcon />
    </Link>
  );

  const ChevronRightIcon = () => (
    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );

  return (
    <Layout title="Friends & Connections">
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="input-field pl-9"
          placeholder="Search users by name or email..."
          value={searchQuery}
          onChange={e => handleSearch(e.target.value)}
        />
      </div>

      {/* Search Results */}
      {searchQuery.length >= 2 && (
        <div className="mb-6">
          <h2 className="font-semibold text-gray-700 mb-3 text-sm">Search Results</h2>
          {searching ? (
            <div className="text-center py-6"><div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto"/></div>
          ) : searchResults.length === 0 ? (
            <div className="card p-6 text-center text-gray-500 text-sm">No users found for "{searchQuery}"</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {searchResults.map(u => <UserCard key={u.id} u={u} />)}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      {!searchQuery && (
        <>
          <div className="flex gap-2 mb-4">
            <button onClick={() => setActiveTab('friends')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'friends' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-green-400'}`}>
              <UserCheck className="w-4 h-4" /> Connections ({friends.length})
            </button>
          </div>

          {loading ? (
            <div className="text-center py-16"><div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto"/></div>
          ) : friends.length === 0 ? (
            <div className="card p-12 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No connections yet</p>
              <p className="text-sm mt-1">Book tours to connect with guides and fellow travellers</p>
              <Link to="/explore" className="btn-primary mt-4 inline-block">Explore Guides</Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {friends.map(f => <UserCard key={f.id} u={f} />)}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
