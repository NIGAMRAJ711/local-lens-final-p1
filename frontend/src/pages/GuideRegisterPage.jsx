import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { guideApi } from '../lib/api';
import { MapPin, Camera, Globe, Tag, CheckCircle } from 'lucide-react';

const LANGUAGES = ['English','Hindi','Tamil','Telugu','Bengali','Marathi','Gujarati','Kannada','Malayalam','French','Spanish','German','Japanese','Arabic','Urdu','Punjabi'];
const EXPERTISE = ['Food & Cuisine','History','Art & Culture','Nature & Wildlife','Photography','Adventure Sports','Street Markets','Architecture','Nightlife','Shopping','Spirituality','Music & Dance','Beach','Temple Walks'];

export default function GuideRegisterPage() {
  const { refreshUser, switchRole } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    bio: '', city: '', country: 'India',
    languages: [], expertiseTags: [],
    isPhotographer: false,
    hourlyRate: '', halfDayRate: '', fullDayRate: '', photographyRate: '',
  });

  const toggle = (key, val) => {
    setForm(f => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.bio || !form.city || !form.hourlyRate) {
      toast.error('Please fill all required fields');
      return;
    }
    if (form.bio.length < 30) {
      toast.error('Bio must be at least 30 characters');
      return;
    }
    setSubmitting(true);
    try {
      await guideApi.register(form);
      // Auto switch to guide role
      await switchRole('GUIDE');
      await refreshUser();
      setDone(true);
      toast.success('🎉 Guide profile created! Welcome to LocalLens Guides!');
      setTimeout(() => navigate('/guide-dashboard'), 2000);
    } catch (err) {
      if (err.message?.includes('already exists')) {
        // Already a guide — just switch
        try {
          await switchRole('GUIDE');
          await refreshUser();
          toast.info('Switched to your existing guide profile');
          navigate('/guide-dashboard');
        } catch (e2) {
          toast.error(e2.message);
        }
      } else {
        toast.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center py-16">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You're a Guide now! 🎉</h2>
          <p className="text-gray-500 mb-4">Redirecting to your guide dashboard...</p>
          <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Become a Guide">
      <div className="max-w-2xl mx-auto">
        {/* Steps */}
        <div className="flex items-center gap-2 mb-8">
          {[
            { n: 1, label: 'Your Story' },
            { n: 2, label: 'Expertise' },
            { n: 3, label: 'Pricing' },
          ].map((s, idx) => (
            <div key={s.n} className="flex items-center gap-2 flex-1">
              <button
                onClick={() => step > s.n && setStep(s.n)}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition ${
                  s.n < step ? 'bg-green-500 text-white cursor-pointer hover:bg-green-600' :
                  s.n === step ? 'bg-green-600 text-white ring-4 ring-green-100' :
                  'bg-gray-100 text-gray-400'
                }`}
              >
                {s.n < step ? '✓' : s.n}
              </button>
              <span className="text-xs text-gray-500 hidden md:block">{s.label}</span>
              {idx < 2 && <div className={`flex-1 h-1 rounded-full ${s.n < step ? 'bg-green-500' : 'bg-gray-100'}`} />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card p-6">
            {/* Step 1: Bio */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-1">Tell us your story</h2>
                  <p className="text-sm text-gray-500">What makes you a great local guide?</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Bio * <span className="text-gray-400 font-normal">(min 30 chars)</span></label>
                  <textarea
                    className="input-field"
                    rows={5}
                    placeholder="Share your passion for your city, what makes you unique, your experiences, the hidden spots only you know about..."
                    value={form.bio}
                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                    required
                  />
                  <p className={`text-xs mt-1 ${form.bio.length < 30 ? 'text-orange-500' : 'text-green-600'}`}>
                    {form.bio.length} characters {form.bio.length < 30 ? `(${30 - form.bio.length} more needed)` : '✓'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">City *</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input className="input-field pl-9" placeholder="Your city"
                        value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} required />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Country</label>
                    <input className="input-field" placeholder="Country"
                      value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
                  </div>
                </div>

                <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:border-purple-400 transition">
                  <input type="checkbox" checked={form.isPhotographer}
                    onChange={e => setForm(f => ({ ...f, isPhotographer: e.target.checked }))}
                    className="w-4 h-4 accent-purple-600" />
                  <div>
                    <div className="font-medium text-sm flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-purple-600" /> I also offer photography services
                    </div>
                    <p className="text-xs text-gray-500">Travellers can book you for photo walks & portrait sessions</p>
                  </div>
                </label>

                <button type="button"
                  onClick={() => {
                    if (!form.bio || !form.city) { toast.error('Please fill bio and city'); return; }
                    if (form.bio.length < 30) { toast.error('Bio must be at least 30 characters'); return; }
                    setStep(2);
                  }}
                  className="btn-primary w-full py-3">
                  Next: Expertise →
                </button>
              </div>
            )}

            {/* Step 2: Expertise */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-1">Your expertise & languages</h2>
                  <p className="text-sm text-gray-500">Select all that apply — helps travellers find you</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-blue-500" /> Languages Spoken
                    {form.languages.length > 0 && <span className="text-green-600">({form.languages.length} selected)</span>}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map(lang => (
                      <button type="button" key={lang} onClick={() => toggle('languages', lang)}
                        className={`text-sm px-3 py-1.5 rounded-full border-2 transition font-medium ${
                          form.languages.includes(lang)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-200 text-gray-600 hover:border-blue-400'
                        }`}>
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-green-500" /> Areas of Expertise
                    {form.expertiseTags.length > 0 && <span className="text-green-600">({form.expertiseTags.length} selected)</span>}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EXPERTISE.map(tag => (
                      <button type="button" key={tag} onClick={() => toggle('expertiseTags', tag)}
                        className={`text-sm px-3 py-1.5 rounded-full border-2 transition font-medium ${
                          form.expertiseTags.includes(tag)
                            ? 'bg-green-600 text-white border-green-600'
                            : 'border-gray-200 text-gray-600 hover:border-green-400'
                        }`}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">← Back</button>
                  <button type="button" onClick={() => setStep(3)} className="btn-primary flex-1">Next: Pricing →</button>
                </div>
              </div>
            )}

            {/* Step 3: Pricing */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-1">Set your rates</h2>
                  <p className="text-sm text-gray-500">All prices in ₹ (Indian Rupees). Update anytime.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'hourlyRate', label: '1 Hour Rate *', placeholder: '500', required: true },
                    { key: 'halfDayRate', label: 'Half Day (4hrs) *', placeholder: '2000', required: true },
                    { key: 'fullDayRate', label: 'Full Day (8hrs) *', placeholder: '3500', required: true },
                    form.isPhotographer && { key: 'photographyRate', label: 'Photography Rate', placeholder: '2500', required: false },
                  ].filter(Boolean).map(field => (
                    <div key={field.key}>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">{field.label}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                        <input
                          type="number"
                          className="input-field pl-7"
                          placeholder={field.placeholder}
                          min="100"
                          value={form[field.key]}
                          onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                          required={field.required}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary card */}
                <div className="bg-green-50 rounded-xl p-4 text-sm border border-green-200">
                  <p className="font-bold text-green-800 mb-2">Profile Summary</p>
                  <div className="space-y-1 text-green-700">
                    <p>📍 {form.city}, {form.country}</p>
                    {form.languages.length > 0 && (
                      <p>🌐 {form.languages.slice(0, 3).join(', ')}{form.languages.length > 3 ? ` +${form.languages.length - 3} more` : ''}</p>
                    )}
                    {form.expertiseTags.length > 0 && (
                      <p>🏷️ {form.expertiseTags.slice(0, 3).join(', ')}{form.expertiseTags.length > 3 ? ` +${form.expertiseTags.length - 3} more` : ''}</p>
                    )}
                    {form.hourlyRate && (
                      <p>💰 ₹{form.hourlyRate}/hr · ₹{form.halfDayRate}/half · ₹{form.fullDayRate}/day</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1">← Back</button>
                  <button type="submit" disabled={submitting} className="btn-primary flex-1 py-3">
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Creating...
                      </span>
                    ) : '🚀 Launch My Guide Profile'}
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
