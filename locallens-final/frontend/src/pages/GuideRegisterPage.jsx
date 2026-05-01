import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { useAuth } from '../context/AuthContext';
import { guideApi } from '../lib/api';
import { MapPin, Star, DollarSign, Globe, Tag, Camera, ChevronRight } from 'lucide-react';

const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'French', 'Spanish', 'German', 'Japanese', 'Chinese', 'Arabic'];
const EXPERTISE = ['Food & Cuisine', 'History', 'Art & Culture', 'Nature & Wildlife', 'Photography', 'Adventure Sports', 'Street Markets', 'Architecture', 'Nightlife', 'Shopping', 'Spirituality', 'Music & Dance'];

export default function GuideRegisterPage() {
  const { refreshUser, switchRole } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    bio: '', city: '', country: 'India',
    languages: [], expertiseTags: [],
    isPhotographer: false,
    hourlyRate: '', halfDayRate: '', fullDayRate: '', photographyRate: '',
  });

  const toggleItem = (key, val) => {
    setForm(f => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.bio || !form.city || !form.hourlyRate) {
      alert('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await guideApi.register(form);
      await switchRole('GUIDE');
      await refreshUser();
      alert('🎉 Welcome to LocalLens Guides! Your profile is now live.');
      navigate('/guide-dashboard');
    } catch (err) {
      if (err.message?.includes('already exists')) {
        // Already a guide, just switch
        try {
          await switchRole('GUIDE');
          navigate('/guide-dashboard');
        } catch (e2) {
          alert(e2.message);
        }
      } else {
        alert(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout title="Become a Guide">
      <div className="max-w-2xl mx-auto">
        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <button onClick={() => step > s && setStep(s)}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition ${s <= step ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'} ${step > s ? 'cursor-pointer hover:bg-green-500' : ''}`}>
                {s}
              </button>
              <p className="text-xs text-gray-500 hidden md:block">
                {s === 1 ? 'Basic Info' : s === 2 ? 'Expertise' : 'Pricing'}
              </p>
              {s < 3 && <div className={`flex-1 h-1 rounded ${s < step ? 'bg-green-500' : 'bg-gray-100'}`} />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card p-6">
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold mb-4">Tell us about yourself</h2>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Bio / About You *</label>
                  <textarea className="input-field" rows={4}
                    placeholder="Share your passion for your city, what makes you a great guide, your unique experiences..."
                    value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} required />
                  <p className="text-xs text-gray-400 mt-1">{form.bio.length} chars (min 50 recommended)</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">City *</label>
                    <input className="input-field" placeholder="Your city" value={form.city}
                      onChange={e => setForm(f => ({ ...f, city: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Country</label>
                    <input className="input-field" placeholder="Country" value={form.country}
                      onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="photographer" checked={form.isPhotographer}
                    onChange={e => setForm(f => ({ ...f, isPhotographer: e.target.checked }))}
                    className="w-4 h-4 text-green-600 rounded" />
                  <label htmlFor="photographer" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-purple-600" /> I also offer photography services
                  </label>
                </div>
                <button type="button" onClick={() => { if (!form.bio || !form.city) { alert('Please fill bio and city'); return; } setStep(2); }}
                  className="btn-primary w-full">Next: Expertise →</button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold">Your expertise & languages</h2>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Languages Spoken</label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map(lang => (
                      <button type="button" key={lang} onClick={() => toggleItem('languages', lang)}
                        className={`text-sm px-3 py-1 rounded-full border transition ${form.languages.includes(lang) ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-400'}`}>
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Areas of Expertise</label>
                  <div className="flex flex-wrap gap-2">
                    {EXPERTISE.map(tag => (
                      <button type="button" key={tag} onClick={() => toggleItem('expertiseTags', tag)}
                        className={`text-sm px-3 py-1 rounded-full border transition ${form.expertiseTags.includes(tag) ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:border-green-400'}`}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
                  <button type="button" onClick={() => setStep(3)} className="btn-primary flex-1">Next: Pricing →</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold">Set your rates</h2>
                <p className="text-sm text-gray-500">All prices are in Indian Rupees (₹). You can update these anytime.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">1 Hour Rate (₹) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                      <input type="number" className="input-field pl-7" placeholder="500" min="100"
                        value={form.hourlyRate} onChange={e => setForm(f => ({ ...f, hourlyRate: e.target.value }))} required />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Half Day Rate (₹) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                      <input type="number" className="input-field pl-7" placeholder="2000" min="300"
                        value={form.halfDayRate} onChange={e => setForm(f => ({ ...f, halfDayRate: e.target.value }))} required />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Full Day Rate (₹) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                      <input type="number" className="input-field pl-7" placeholder="3500" min="500"
                        value={form.fullDayRate} onChange={e => setForm(f => ({ ...f, fullDayRate: e.target.value }))} required />
                    </div>
                  </div>
                  {form.isPhotographer && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Photography Rate (₹)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                        <input type="number" className="input-field pl-7" placeholder="2500"
                          value={form.photographyRate} onChange={e => setForm(f => ({ ...f, photographyRate: e.target.value }))} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="bg-green-50 rounded-xl p-4 text-sm">
                  <p className="font-semibold text-green-800 mb-2">Summary</p>
                  <div className="space-y-1 text-green-700">
                    <p>📍 {form.city}, {form.country}</p>
                    {form.languages.length > 0 && <p>🌐 {form.languages.slice(0, 3).join(', ')}{form.languages.length > 3 ? ` +${form.languages.length - 3}` : ''}</p>}
                    {form.expertiseTags.length > 0 && <p>🏷️ {form.expertiseTags.slice(0, 2).join(', ')}{form.expertiseTags.length > 2 ? ` +${form.expertiseTags.length - 2}` : ''}</p>}
                    {form.hourlyRate && <p>💰 ₹{form.hourlyRate}/hr • ₹{form.halfDayRate}/half day • ₹{form.fullDayRate}/full day</p>}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
                  <button type="submit" disabled={submitting} className="btn-primary flex-1">
                    {submitting ? 'Creating profile...' : '🚀 Launch My Guide Profile'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </Layout>
  );
}
