/**
 * LocalLens – Persistent File-Based Database
 * Stores all data as JSON on disk. Automatically syncs on every write.
 * Compatible with the same interface used by all route files.
 * In production: replace require('../db') with a Prisma/pg equivalent.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ─────────────────────────────────────────
// Core store: read/write JSON files
// ─────────────────────────────────────────
function loadStore(name) {
  const file = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(file)) { fs.writeFileSync(file, '[]'); return []; }
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}

function saveStore(name, data) {
  const file = path.join(DATA_DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function now() { return new Date().toISOString(); }

// ─────────────────────────────────────────
// USERS
// ─────────────────────────────────────────
const users = {
  _name: 'users',
  _store() { return loadStore(this._name); },
  _save(data) { saveStore(this._name, data); },

  findAll() { return this._store(); },

  findById(id) {
    return this._store().find(u => u.id === id) || null;
  },

  findByEmail(email) {
    return this._store().find(u => u.email?.toLowerCase() === email?.toLowerCase()) || null;
  },

  create(data) {
    const store = this._store();
    const user = {
      id: uuid(),
      email: data.email,
      phone: data.phone || null,
      passwordHash: data.passwordHash,
      fullName: data.fullName,
      avatarUrl: data.avatarUrl || null,
      role: data.role || 'TRAVELER',
      isActive: true,
      isEmailVerified: false,
      isPhoneVerified: false,
      referralCode: uuid().slice(0, 8).toUpperCase(),
      referredBy: data.referredBy || null,
      createdAt: now(),
      updatedAt: now(),
    };
    store.push(user);
    this._save(store);
    return user;
  },

  update(id, updates) {
    const store = this._store();
    const idx = store.findIndex(u => u.id === id);
    if (idx === -1) return null;
    store[idx] = { ...store[idx], ...updates, updatedAt: now() };
    this._save(store);
    return store[idx];
  },

  delete(id) {
    const store = this._store().filter(u => u.id !== id);
    this._save(store);
  },
};

// ─────────────────────────────────────────
// GUIDE PROFILES
// ─────────────────────────────────────────
const guideProfiles = {
  _name: 'guide_profiles',
  _store() { return loadStore(this._name); },
  _save(data) { saveStore(this._name, data); },

  _enrich(g) {
    if (!g) return null;
    const user = users.findById(g.userId);
    return { ...g, user: user ? { id: user.id, fullName: user.fullName, avatarUrl: user.avatarUrl, email: user.email, createdAt: user.createdAt } : null };
  },

  findAll() { return this._store().map(g => this._enrich(g)); },

  findById(id) { return this._enrich(this._store().find(g => g.id === id) || null); },

  findByUserId(userId) { return this._enrich(this._store().find(g => g.userId === userId) || null); },

  findMany(query = {}) {
    let store = this._store();
    const { city, category, minPrice, maxPrice, rating, isAvailable, page = 1, limit = 12 } = query;
    if (city) store = store.filter(g => g.city?.toLowerCase().includes(city.toLowerCase()));
    if (category) store = store.filter(g => g.expertiseTags?.some(t => t.toLowerCase().includes(category.toLowerCase())));
    if (minPrice) store = store.filter(g => g.hourlyRate >= parseFloat(minPrice));
    if (maxPrice) store = store.filter(g => g.hourlyRate <= parseFloat(maxPrice));
    if (rating) store = store.filter(g => g.avgRating >= parseFloat(rating));
    if (isAvailable === 'true') store = store.filter(g => g.isAvailable === true);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    return store.slice(skip, skip + parseInt(limit)).map(g => this._enrich(g));
  },

  countMany(query = {}) {
    let store = this._store();
    const { city, category, minPrice, maxPrice, rating, isAvailable } = query;
    if (city) store = store.filter(g => g.city?.toLowerCase().includes(city.toLowerCase()));
    if (category) store = store.filter(g => g.expertiseTags?.some(t => t.toLowerCase().includes(category.toLowerCase())));
    if (minPrice) store = store.filter(g => g.hourlyRate >= parseFloat(minPrice));
    if (maxPrice) store = store.filter(g => g.hourlyRate <= parseFloat(maxPrice));
    if (rating) store = store.filter(g => g.avgRating >= parseFloat(rating));
    if (isAvailable === 'true') store = store.filter(g => g.isAvailable === true);
    return store.length;
  },

  create(data) {
    const store = this._store();
    if (store.find(g => g.userId === data.userId)) throw new Error('Guide profile already exists');
    const guide = {
      id: uuid(),
      userId: data.userId,
      bio: data.bio || '',
      city: data.city || '',
      country: data.country || 'India',
      languages: data.languages || [],
      expertiseTags: data.expertiseTags || [],
      isPhotographer: data.isPhotographer || false,
      isAvailable: false,
      hourlyRate: parseFloat(data.hourlyRate) || 500,
      halfDayRate: parseFloat(data.halfDayRate) || 2000,
      fullDayRate: parseFloat(data.fullDayRate) || 3500,
      photographyRate: data.photographyRate ? parseFloat(data.photographyRate) : null,
      totalBookings: 0,
      totalEarnings: 0,
      avgRating: 0,
      totalReviews: 0,
      verificationStatus: 'UNVERIFIED',
      latitude: null,
      longitude: null,
      walletBalance: 0,
      createdAt: now(),
      updatedAt: now(),
    };
    store.push(guide);
    this._save(store);
    return this._enrich(guide);
  },

  update(id, updates) {
    const store = this._store();
    const idx = store.findIndex(g => g.id === id);
    if (idx === -1) return null;
    store[idx] = { ...store[idx], ...updates, updatedAt: now() };
    this._save(store);
    return this._enrich(store[idx]);
  },

  updateByUserId(userId, updates) {
    const store = this._store();
    const idx = store.findIndex(g => g.userId === userId);
    if (idx === -1) return null;
    store[idx] = { ...store[idx], ...updates, updatedAt: now() };
    this._save(store);
    return this._enrich(store[idx]);
  },

  recalcRating(guideUserId) {
    const allReviews = reviews.findByReviewee(guideUserId);
    if (!allReviews.length) return;
    const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    this.updateByUserId(guideUserId, { avgRating: Math.round(avg * 10) / 10, totalReviews: allReviews.length });
  },
};

// ─────────────────────────────────────────
// TRAVELER PROFILES
// ─────────────────────────────────────────
const travelerProfiles = {
  _name: 'traveler_profiles',
  _store() { return loadStore(this._name); },
  _save(data) { saveStore(this._name, data); },

  findByUserId(userId) { return this._store().find(t => t.userId === userId) || null; },

  create(userId) {
    const store = this._store();
    if (store.find(t => t.userId === userId)) return store.find(t => t.userId === userId);
    const profile = {
      id: uuid(), userId, interests: [], homeCity: null,
      totalToursBooked: 0, loyaltyPoints: 0, walletBalance: 0,
      createdAt: now(), updatedAt: now(),
    };
    store.push(profile);
    this._save(store);
    return profile;
  },

  update(userId, updates) {
    const store = this._store();
    const idx = store.findIndex(t => t.userId === userId);
    if (idx === -1) return null;
    store[idx] = { ...store[idx], ...updates, updatedAt: now() };
    this._save(store);
    return store[idx];
  },
};

// ─────────────────────────────────────────
// BOOKINGS
// ─────────────────────────────────────────
const bookings = {
  _name: 'bookings',
  _store() { return loadStore(this._name); },
  _save(data) { saveStore(this._name, data); },

  _enrich(b) {
    if (!b) return null;
    const guide = users.findById(b.guideId);
    const traveler = users.findById(b.travelerId);
    return {
      ...b,
      guide: guide ? { id: guide.id, fullName: guide.fullName, avatarUrl: guide.avatarUrl } : null,
      traveler: traveler ? { id: traveler.id, fullName: traveler.fullName, avatarUrl: traveler.avatarUrl } : null,
    };
  },

  findById(id) { return this._enrich(this._store().find(b => b.id === id) || null); },

  findMany(filter = {}) {
    let store = this._store();
    if (filter.guideId) store = store.filter(b => b.guideId === filter.guideId);
    if (filter.travelerId) store = store.filter(b => b.travelerId === filter.travelerId);
    if (filter.status) store = store.filter(b => b.status === filter.status);
    return store.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(b => this._enrich(b));
  },

  create(data) {
    const store = this._store();
    const booking = {
      id: uuid(),
      guideId: data.guideId,
      travelerId: data.travelerId,
      bookingType: data.bookingType || 'PRIVATE',
      duration: data.duration || 'ONE_HOUR',
      status: 'PENDING',
      date: data.date,
      startTime: data.startTime,
      meetupLocation: data.meetupLocation || '',
      specialRequests: data.specialRequests || '',
      basePrice: data.basePrice || 0,
      platformFee: data.platformFee || 0,
      totalAmount: data.totalAmount || 0,
      paymentStatus: 'PENDING',
      escrowReleased: false,
      createdAt: now(),
      updatedAt: now(),
    };
    store.push(booking);
    this._save(store);
    return this._enrich(booking);
  },

  updateStatus(id, status) {
    const store = this._store();
    const idx = store.findIndex(b => b.id === id);
    if (idx === -1) return null;
    store[idx] = { ...store[idx], status, updatedAt: now() };
    this._save(store);
    return this._enrich(store[idx]);
  },

  complete(id) {
    const store = this._store();
    const idx = store.findIndex(b => b.id === id);
    if (idx === -1) return null;
    const b = store[idx];
    store[idx] = { ...b, status: 'COMPLETED', escrowReleased: true, tourCompletedAt: now(), updatedAt: now() };
    this._save(store);

    // Credit guide wallet
    const guideEarnings = b.basePrice * 0.9; // 90% after platform fee
    const guide = guideProfiles.findByUserId(b.guideId);
    if (guide) {
      guideProfiles.update(guide.id, {
        walletBalance: (guide.walletBalance || 0) + guideEarnings,
        totalEarnings: (guide.totalEarnings || 0) + guideEarnings,
        totalBookings: (guide.totalBookings || 0) + 1,
      });
      walletTransactions.create({
        userId: b.guideId,
        amount: guideEarnings,
        type: 'CREDIT',
        description: `Earnings from completed tour`,
        bookingId: id,
      });
    }

    // Add loyalty points to traveler
    const loyaltyPts = Math.floor(b.totalAmount / 100);
    const traveler = travelerProfiles.findByUserId(b.travelerId);
    if (traveler) {
      travelerProfiles.update(b.travelerId, {
        totalToursBooked: (traveler.totalToursBooked || 0) + 1,
        loyaltyPoints: (traveler.loyaltyPoints || 0) + loyaltyPts,
      });
    }

    return this._enrich(store[idx]);
  },
};

// ─────────────────────────────────────────
// GROUP TOURS
// ─────────────────────────────────────────
const groupTours = {
  _name: 'group_tours',
  _store() { return loadStore(this._name); },
  _save(data) { saveStore(this._name, data); },

  _enrich(t) {
    if (!t) return null;
    const guide = guideProfiles.findById(t.guideId);
    const members = groupTourMembers.findByTour(t.id);
    return { ...t, guide, members, _count: { members: members.length } };
  },

  findMany(query = {}) {
    let store = this._store().filter(t => t.isActive !== false);
    const { city, category, minPrice, maxPrice } = query;
    if (city) store = store.filter(t => t.city?.toLowerCase().includes(city.toLowerCase()));
    if (category) store = store.filter(t => t.category?.some(c => c.toLowerCase().includes(category.toLowerCase())));
    if (minPrice) store = store.filter(t => t.pricePerPerson >= parseFloat(minPrice));
    if (maxPrice) store = store.filter(t => t.pricePerPerson <= parseFloat(maxPrice));
    return store.sort((a, b) => new Date(a.date) - new Date(b.date)).map(t => this._enrich(t));
  },

  findById(id) { return this._enrich(this._store().find(t => t.id === id) || null); },

  findByGuide(guideId) { return this._store().filter(t => t.guideId === guideId).map(t => this._enrich(t)); },

  create(data) {
    const store = this._store();
    const tour = {
      id: uuid(),
      guideId: data.guideId,
      title: data.title,
      description: data.description,
      city: data.city,
      date: data.date,
      startTime: data.startTime,
      duration: data.duration || '3 hours',
      maxMembers: parseInt(data.maxMembers) || 6,
      pricePerPerson: parseFloat(data.pricePerPerson) || 0,
      meetupPoint: data.meetupPoint || '',
      meetupLat: data.meetupLat ? parseFloat(data.meetupLat) : null,
      meetupLng: data.meetupLng ? parseFloat(data.meetupLng) : null,
      itinerary: data.itinerary || [],
      category: data.category || [],
      coverImage: data.coverImage || null,
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
    };
    store.push(tour);
    this._save(store);
    return this._enrich(tour);
  },

  update(id, updates) {
    const store = this._store();
    const idx = store.findIndex(t => t.id === id);
    if (idx === -1) return null;
    store[idx] = { ...store[idx], ...updates, updatedAt: now() };
    this._save(store);
    return this._enrich(store[idx]);
  },
};

// ─────────────────────────────────────────
// GROUP TOUR MEMBERS
// ─────────────────────────────────────────
const groupTourMembers = {
  _name: 'group_tour_members',
  _store() { return loadStore(this._name); },
  _save(data) { saveStore(this._name, data); },

  _enrich(m) {
    if (!m) return null;
    const user = users.findById(m.userId);
    return { ...m, user: user ? { id: user.id, fullName: user.fullName, avatarUrl: user.avatarUrl } : null };
  },

  findByTour(groupTourId) {
    return this._store().filter(m => m.groupTourId === groupTourId).map(m => this._enrich(m));
  },

  findByUser(userId) {
    return this._store().filter(m => m.userId === userId);
  },

  findByUserTours(userId) {
    const memberships = this._store().filter(m => m.userId === userId);
    return memberships.map(m => groupTours.findById(m.groupTourId)).filter(Boolean);
  },

  isJoined(groupTourId, userId) {
    return !!this._store().find(m => m.groupTourId === groupTourId && m.userId === userId);
  },

  join(groupTourId, userId) {
    if (this.isJoined(groupTourId, userId)) throw new Error('Already joined this tour');
    const tour = groupTours.findById(groupTourId);
    if (!tour) throw new Error('Tour not found');
    if (tour._count.members >= tour.maxMembers) throw new Error('Tour is full');
    const store = this._store();
    const member = { id: uuid(), groupTourId, userId, joinedAt: now(), paymentStatus: 'PENDING' };
    store.push(member);
    this._save(store);
    return this._enrich(member);
  },
};

// ─────────────────────────────────────────
// REELS
// ─────────────────────────────────────────
const reels = {
  _name: 'reels',
  _store() { return loadStore(this._name); },
  _save(data) { saveStore(this._name, data); },

  _enrich(r) {
    if (!r) return null;
    const user = users.findById(r.userId);
    return { ...r, user: user ? { id: user.id, fullName: user.fullName, avatarUrl: user.avatarUrl } : null };
  },

  findMany(query = {}) {
    let store = this._store().filter(r => r.isActive !== false);
    if (query.city) store = store.filter(r => r.city?.toLowerCase().includes(query.city.toLowerCase()));
    if (query.userId) store = store.filter(r => r.userId === query.userId);
    return store.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, parseInt(query.limit) || 20).map(r => this._enrich(r));
  },

  findById(id) { return this._enrich(this._store().find(r => r.id === id) || null); },

  findByUser(userId) {
    return this._store().filter(r => r.userId === userId && r.isActive !== false)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(r => this._enrich(r));
  },

  create(data) {
    const store = this._store();
    const reel = {
      id: uuid(),
      userId: data.userId,
      videoUrl: data.videoUrl,
      thumbnailUrl: data.thumbnailUrl || null,
      caption: data.caption || '',
      reelType: data.reelType || 'GENERAL',
      city: data.city || '',
      locationName: data.locationName || '',
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      views: 0,
      likesCount: 0,
      commentsCount: 0,
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
    };
    store.push(reel);
    this._save(store);
    return this._enrich(reel);
  },

  like(reelId, userId) {
    const likesStore = loadStore('reel_likes');
    const existing = likesStore.find(l => l.reelId === reelId && l.userId === userId);
    const reelStore = this._store();
    const idx = reelStore.findIndex(r => r.id === reelId);

    if (existing) {
      // Unlike
      saveStore('reel_likes', likesStore.filter(l => !(l.reelId === reelId && l.userId === userId)));
      if (idx !== -1) { reelStore[idx].likesCount = Math.max(0, (reelStore[idx].likesCount || 0) - 1); this._save(reelStore); }
      return false;
    } else {
      likesStore.push({ id: uuid(), reelId, userId, createdAt: now() });
      saveStore('reel_likes', likesStore);
      if (idx !== -1) { reelStore[idx].likesCount = (reelStore[idx].likesCount || 0) + 1; this._save(reelStore); }
      return true;
    }
  },

  view(reelId) {
    const store = this._store();
    const idx = store.findIndex(r => r.id === reelId);
    if (idx !== -1) { store[idx].views = (store[idx].views || 0) + 1; this._save(store); }
  },
};

// ─────────────────────────────────────────
// MESSAGES
// ─────────────────────────────────────────
const messages = {
  _name: 'messages',
  _store() { return loadStore(this._name); },
  _save(data) { saveStore(this._name, data); },

  _enrich(m) {
    if (!m) return null;
    const sender = users.findById(m.senderId);
    return { ...m, sender: sender ? { id: sender.id, fullName: sender.fullName, avatarUrl: sender.avatarUrl } : null };
  },

  findByBooking(bookingId) {
    return this._store().filter(m => m.bookingId === bookingId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map(m => this._enrich(m));
  },

  create(data) {
    const store = this._store();
    const msg = {
      id: uuid(),
      bookingId: data.bookingId,
      senderId: data.senderId,
      receiverId: data.receiverId,
      content: data.content,
      isRead: false,
      createdAt: now(),
    };
    store.push(msg);
    this._save(store);
    return this._enrich(msg);
  },

  markRead(bookingId, userId) {
    const store = this._store();
    store.forEach(m => {
      if (m.bookingId === bookingId && m.receiverId === userId && !m.isRead) {
        m.isRead = true; m.readAt = now();
      }
    });
    this._save(store);
  },
};

// ─────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────
const reviews = {
  _name: 'reviews',
  _store() { return loadStore(this._name); },
  _save(data) { saveStore(this._name, data); },

  _enrich(r) {
    if (!r) return null;
    const reviewer = users.findById(r.reviewerId);
    return { ...r, reviewer: reviewer ? { id: reviewer.id, fullName: reviewer.fullName, avatarUrl: reviewer.avatarUrl } : null };
  },

  findByReviewee(revieweeId) {
    return this._store().filter(r => r.revieweeId === revieweeId).map(r => this._enrich(r));
  },

  findByBooking(bookingId) {
    return this._enrich(this._store().find(r => r.bookingId === bookingId) || null);
  },

  create(data) {
    const store = this._store();
    if (store.find(r => r.bookingId === data.bookingId)) throw new Error('Review already submitted for this booking');
    const review = {
      id: uuid(),
      bookingId: data.bookingId,
      reviewerId: data.reviewerId,
      revieweeId: data.revieweeId,
      rating: parseFloat(data.rating),
      comment: data.comment || '',
      photos: data.photos || [],
      guideResponse: null,
      createdAt: now(),
    };
    store.push(review);
    this._save(store);
    // Recalc guide rating
    guideProfiles.recalcRating(data.revieweeId);
    return this._enrich(review);
  },
};

// ─────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────
const notifications = {
  _name: 'notifications',
  _store() { return loadStore(this._name); },
  _save(data) { saveStore(this._name, data); },

  findByUser(userId) {
    return this._store().filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  create(data) {
    const store = this._store();
    const notif = {
      id: uuid(),
      userId: data.userId,
      title: data.title,
      body: data.body,
      type: data.type || 'GENERAL',
      data: data.data || null,
      isRead: false,
      createdAt: now(),
    };
    store.push(notif);
    this._save(store);
    return notif;
  },

  markRead(id) {
    const store = this._store();
    const idx = store.findIndex(n => n.id === id);
    if (idx !== -1) { store[idx].isRead = true; this._save(store); return store[idx]; }
    return null;
  },
};

// ─────────────────────────────────────────
// HIDDEN GEMS
// ─────────────────────────────────────────
const hiddenGems = {
  _name: 'hidden_gems',
  _store() { return loadStore(this._name); },
  _save(data) { saveStore(this._name, data); },

  findByGuide(guideId) { return this._store().filter(g => g.guideId === guideId); },

  findMany(query = {}) {
    let store = this._store();
    if (query.city) store = store.filter(g => g.city?.toLowerCase().includes(query.city.toLowerCase()));
    if (query.category) store = store.filter(g => g.category?.toLowerCase().includes(query.category.toLowerCase()));
    return store;
  },

  create(data) {
    const store = this._store();
    const gem = {
      id: uuid(),
      guideId: data.guideId,
      name: data.name,
      description: data.description || '',
      category: data.category || '',
      city: data.city || '',
      latitude: parseFloat(data.latitude) || 0,
      longitude: parseFloat(data.longitude) || 0,
      isLocked: true,
      photos: data.photos || [],
      createdAt: now(),
      updatedAt: now(),
    };
    store.push(gem);
    this._save(store);
    return gem;
  },
};

// ─────────────────────────────────────────
// WALLET TRANSACTIONS
// ─────────────────────────────────────────
const walletTransactions = {
  _name: 'wallet_transactions',
  _store() { return loadStore(this._name); },
  _save(data) { saveStore(this._name, data); },

  findByUser(userId) {
    return this._store().filter(t => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  create(data) {
    const store = this._store();
    const txn = {
      id: uuid(),
      userId: data.userId,
      amount: parseFloat(data.amount),
      type: data.type || 'CREDIT',
      description: data.description || '',
      bookingId: data.bookingId || null,
      createdAt: now(),
    };
    store.push(txn);
    this._save(store);
    return txn;
  },
};

// ─────────────────────────────────────────
// SOS ALERTS
// ─────────────────────────────────────────
const sosAlerts = {
  _name: 'sos_alerts',
  _store() { return loadStore(this._name); },
  _save(data) { saveStore(this._name, data); },

  create(data) {
    const store = this._store();
    const alert = {
      id: uuid(),
      userId: data.userId,
      latitude: parseFloat(data.latitude),
      longitude: parseFloat(data.longitude),
      bookingId: data.bookingId || null,
      message: data.message || 'SOS Alert',
      isResolved: false,
      createdAt: now(),
    };
    store.push(alert);
    this._save(store);
    return alert;
  },
};

module.exports = {
  users,
  guideProfiles,
  travelerProfiles,
  bookings,
  groupTours,
  groupTourMembers,
  reels,
  messages,
  reviews,
  notifications,
  hiddenGems,
  walletTransactions,
  sosAlerts,
};
