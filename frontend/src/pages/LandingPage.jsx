import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { guideApi } from '../lib/api';
import { Compass, Film, Map, MessageCircle, Star } from 'lucide-react';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const [guides, setGuides] = useState([]);

  useEffect(() => {
    guideApi.search({ limit: 6 }).then(d => setGuides(d.guides || [])).catch(() => {});
  }, []);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <section className="relative min-h-[82vh] overflow-hidden bg-[url('https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center">
        <div className="absolute inset-0 bg-black/55" />
        <nav className="relative z-10 max-w-6xl mx-auto px-4 py-5 flex items-center justify-between text-white">
          <div className="flex items-center gap-2 font-bold text-xl"><Compass className="w-6 h-6" /> LocalLens</div>
          <div className="flex items-center gap-3 text-sm font-semibold">
            <Link to="/login" className="hover:text-green-200">Login</Link>
            <Link to="/register" className="bg-green-500 hover:bg-green-400 text-white px-4 py-2 rounded-lg">Get Started</Link>
          </div>
        </nav>
        <div className="relative z-10 max-w-6xl mx-auto px-4 pt-24 pb-16 text-white">
          <h1 className="text-4xl md:text-7xl font-black max-w-4xl leading-tight">Discover India through the eyes of locals</h1>
          <p className="mt-5 max-w-2xl text-lg text-white/85">Book trusted local guides, unlock hidden gems, join group tours, and chat in real time before your trip begins.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="bg-green-500 hover:bg-green-400 text-white px-6 py-3 rounded-xl font-bold">Get Started Free</Link>
            <Link to="/login" className="bg-white/15 hover:bg-white/25 border border-white/30 text-white px-6 py-3 rounded-xl font-bold">I already have an account</Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 -mt-12 relative z-20">
        <div className="grid grid-cols-3 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {['500+ Guides', '50+ Cities', '10,000+ Happy Travellers'].map(item => (
            <div key={item} className="p-5 text-center border-r last:border-r-0 border-gray-100">
              <p className="text-xl md:text-3xl font-black text-green-600">{item.split(' ')[0]}</p>
              <p className="text-xs md:text-sm text-gray-500 font-medium">{item.split(' ').slice(1).join(' ')}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-4 gap-4 mb-12">
          {[
            { icon: Map, title: 'Live Map', text: 'Find available guides and hidden gems nearby.' },
            { icon: Film, title: 'Travel Reels', text: 'Preview real local experiences before booking.' },
            { icon: Compass, title: 'Group Tours', text: 'Join curated shared trips across India.' },
            { icon: MessageCircle, title: 'Real-time Chat', text: 'Coordinate instantly with guides and friends.' },
          ].map(f => (
            <div key={f.title} className="border border-gray-100 rounded-lg p-5 bg-gray-50">
              <f.icon className="w-7 h-7 text-green-600 mb-3" />
              <h3 className="font-bold">{f.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{f.text}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-black">Meet a few local experts</h2>
          <Link to="/register" className="text-green-600 font-bold text-sm">Explore all guides</Link>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {guides.map(g => (
            <div key={g.id} className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center gap-3">
                {g.user?.avatarUrl ? <img src={g.user.avatarUrl} className="w-12 h-12 rounded-full object-cover" alt="" /> : <div className="w-12 h-12 rounded-full bg-green-500 text-white grid place-items-center font-bold">{g.user?.fullName?.[0]}</div>}
                <div>
                  <p className="font-bold">{g.user?.fullName}</p>
                  <p className="text-sm text-gray-500">{g.city}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm mt-3 text-yellow-500"><Star className="w-4 h-4 fill-current" /> {(g.avgRating || 0).toFixed(1)} <span className="text-gray-400">({g.totalReviews || 0})</span></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
