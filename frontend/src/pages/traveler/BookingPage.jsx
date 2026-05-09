import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/shared/Layout';
import { guideApi, bookingApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { MapPin, Clock, Calendar, Star, ChevronRight } from 'lucide-react';

const DURATIONS = [
  { value: 'ONE_HOUR', label: '1 Hour' },
  { value: 'HALF_DAY', label: 'Half Day (4 hrs)' },
  { value: 'FULL_DAY', label: 'Full Day (8 hrs)' },
];

const BOOKING_TYPES = [
  { value: 'PRIVATE', label: 'Private Tour' },
  { value: 'GROUP', label: 'Small Group' },
  { value: 'PHOTOGRAPHY', label: 'Photography Session' },
  { value: 'CUSTOM', label: 'Custom Experience' },
];

export default function BookingPage() {
  const toast = useToast();
  const { guideId } = useParams();
  const navigate = useNavigate();
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    duration: 'ONE_HOUR', bookingType: 'PRIVATE',
    date: '', startTime: '', meetupLocation: '', specialRequests: '',
    numberOfPeople: 1, hotelPreference: '', restaurantPreference: '',
  });
  const [price, setPrice] = useState(null);

  useEffect(() => {
    guideApi.getById(guideId).then(d => {
      setGuide(d.guide);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [guideId]);

  useEffect(() => {
    if (!guide) return;
    const priceMap = {
      ONE_HOUR: guide.hourlyRate,
      HALF_DAY: guide.halfDayRate,
      FULL_DAY: guide.fullDayRate,
    };
    const base = priceMap[form.duration] || 0;
    const fee = base * 0.1;
    setPrice({ base, fee, total: base + fee });
  }, [form.duration, guide]);

  const handleSubmit = async () => {
    if (!form.date || !form.startTime) { toast.error('Missing fields', 'Please fill all required fields'); return; }
    setSubmitting(true);
    try {
      const data = await bookingApi.create({ guideUserId: guide.userId, ...form });
      toast.success('Booking sent! 🎉', 'The guide will confirm shortly.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Layout><div className="text-center py-16"><div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto"/></div></Layout>;
  if (!guide) return <Layout><div className="text-center py-16 text-gray-500">Guide not found</div></Layout>;

  return (
    <Layout title="Book a Guide">
      <div className="max-w-2xl mx-auto">
        {/* Guide Card */}
        <div className="card p-4 mb-6 flex items-center gap-4">
          {guide.user?.avatarUrl ? (
            <img src={guide.user.avatarUrl} className="w-14 h-14 rounded-xl object-cover" alt="" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-green-200 flex items-center justify-center text-xl font-bold text-green-700">
              {guide.user?.fullName?.[0]}
            </div>
          )}
          <div className="flex-1">
            <h2 className="font-bold text-lg">{guide.user?.fullName}</h2>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" />{guide.city}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-yellow-500 text-sm">
              <Star className="w-4 h-4 fill-yellow-400" />
              <span className="font-medium">{guide.avgRating?.toFixed(1)}</span>
            </div>
            <p className="text-xs text-gray-500">{guide.totalReviews} reviews</p>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${s <= step ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{s}</div>
              {s < 3 && <div className={`flex-1 h-1 rounded ${s < step ? 'bg-green-600' : 'bg-gray-100'}`} />}
            </div>
          ))}
        </div>

        <div className="card p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Choose Tour Type & Duration</h3>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Tour Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {BOOKING_TYPES.map(bt => (
                    <button key={bt.value} type="button" onClick={() => setForm(f => ({ ...f, bookingType: bt.value }))}
                      className={`p-3 rounded-lg border-2 text-sm font-medium text-left transition ${form.bookingType === bt.value ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-gray-300'}`}>
                      {bt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Duration</label>
                <div className="space-y-2">
                  {DURATIONS.map(d => {
                    const priceMap = { ONE_HOUR: guide.hourlyRate, HALF_DAY: guide.halfDayRate, FULL_DAY: guide.fullDayRate };
                    return (
                      <button key={d.value} type="button" onClick={() => setForm(f => ({ ...f, duration: d.value }))}
                        className={`w-full p-3 rounded-lg border-2 flex items-center justify-between transition ${form.duration === d.value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="flex items-center gap-2">
                          <Clock className={`w-4 h-4 ${form.duration === d.value ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="font-medium text-sm">{d.label}</span>
                        </div>
                        <span className="text-green-600 font-bold">₹{priceMap[d.value]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <button onClick={() => setStep(2)} className="btn-primary w-full">Continue</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Pick Date & Time</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Date *</label>
                  <input type="date" className="input-field" value={form.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Start Time *</label>
                  <input type="time" className="input-field" value={form.startTime}
                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Meetup Location</label>
                <input className="input-field" placeholder="Where should the guide meet you?" value={form.meetupLocation}
                  onChange={e => setForm(f => ({ ...f, meetupLocation: e.target.value }))} />
              </div>

              {/* Your Preferences section */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Your Preferences</h4>

                {/* Number of people with +/- */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">How many people are joining? *</label>
                  <div className="flex items-center gap-3">
                    <button type="button"
                      onClick={() => setForm(f => ({ ...f, numberOfPeople: Math.max(1, f.numberOfPeople - 1) }))}
                      className="w-9 h-9 rounded-lg border-2 border-gray-200 flex items-center justify-center text-lg font-bold text-gray-600 hover:border-green-400 transition">−</button>
                    <span className="w-12 text-center text-lg font-bold text-gray-900">{form.numberOfPeople}</span>
                    <button type="button"
                      onClick={() => setForm(f => ({ ...f, numberOfPeople: Math.min(20, f.numberOfPeople + 1) }))}
                      className="w-9 h-9 rounded-lg border-2 border-gray-200 flex items-center justify-center text-lg font-bold text-gray-600 hover:border-green-400 transition">+</button>
                    <span className="text-xs text-gray-400 ml-1">person{form.numberOfPeople > 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Hotel / Stay preference <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input className="input-field" placeholder="e.g. Taj Hotel, Airbnb near MG Road, budget hostel"
                    value={form.hotelPreference} onChange={e => setForm(f => ({ ...f, hotelPreference: e.target.value }))} />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Restaurant / Food preference <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input className="input-field" placeholder="e.g. vegetarian only, local street food, rooftop restaurant"
                    value={form.restaurantPreference} onChange={e => setForm(f => ({ ...f, restaurantPreference: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Special Requests</label>
                <textarea className="input-field" rows={3} placeholder="Any preferences or requirements?"
                  value={form.specialRequests} onChange={e => setForm(f => ({ ...f, specialRequests: e.target.value }))} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
                <button onClick={() => setStep(3)} className="btn-primary flex-1">Review Booking</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Review & Confirm</h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Guide</span><span className="font-medium">{guide.user?.fullName}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Type</span><span className="font-medium">{BOOKING_TYPES.find(t => t.value === form.bookingType)?.label}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Duration</span><span className="font-medium">{DURATIONS.find(d => d.value === form.duration)?.label}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">People</span><span className="font-medium">{form.numberOfPeople} person{form.numberOfPeople > 1 ? 's' : ''}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Date</span><span className="font-medium">{form.date}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Time</span><span className="font-medium">{form.startTime}</span></div>
                {form.meetupLocation && <div className="flex justify-between"><span className="text-gray-600">Meetup</span><span className="font-medium">{form.meetupLocation}</span></div>}
              </div>
              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Base Price</span><span>₹{price?.base?.toFixed(0)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Platform Fee (10%)</span><span>₹{price?.fee?.toFixed(0)}</span></div>
                <div className="flex justify-between text-base font-bold border-t pt-2 mt-2">
                  <span>Total</span><span className="text-green-600">₹{price?.total?.toFixed(0)}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
                <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1">
                  {submitting ? 'Sending Request...' : 'Confirm Booking'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
