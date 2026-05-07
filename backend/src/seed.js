/**
 * LocalLens Seed Script
 * Exports: seed() function — called by index.js on first startup
 * Also runnable standalone: node src/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');

const GUIDES_DATA = [
  { name:'Arjun Sharma', email:'arjun@guide.com', city:'Mumbai', lat:19.0760, lng:72.8777, bio:'Born and raised in Mumbai, I know every alley, every chai stall and every hidden beach. Let me show you the real Mumbai — not just the tourist spots!', tags:['Street Food','History','Bollywood','Markets'], langs:['English','Hindi','Marathi'], hourly:700, half:2200, full:3800, rating:4.9, reviews:127, bookings:143, avatar:'https://i.pravatar.cc/150?img=11', available:true },
  { name:'Priya Nair', email:'priya@guide.com', city:'Kochi', lat:9.9312, lng:76.2673, bio:'Marine biologist turned local guide. I will take you to the most stunning backwaters, spice gardens and authentic Kerala cuisine spots nobody else knows about.', tags:['Nature','Food & Cuisine','History','Backwaters'], langs:['English','Malayalam','Tamil'], hourly:600, half:1800, full:3200, rating:4.8, reviews:89, bookings:104, avatar:'https://i.pravatar.cc/150?img=5', available:true },
  { name:'Rahul Verma', email:'rahul@guide.com', city:'Jaipur', lat:26.9124, lng:75.7873, bio:'Third generation Jaipuri. My grandfather was a palace guide, my father too. I will show you the stories behind the stones — the Rajput history nobody tells tourists.', tags:['History','Architecture','Art & Culture','Photography'], langs:['English','Hindi','Rajasthani'], hourly:800, half:2500, full:4200, rating:4.7, reviews:203, bookings:251, avatar:'https://i.pravatar.cc/150?img=15', available:false },
  { name:'Meera Iyer', email:'meera@guide.com', city:'Chennai', lat:13.0827, lng:80.2707, bio:'Classical dancer and food enthusiast. I run food tours in Mylapore and temple walks that will change how you see South India forever.', tags:['Food & Cuisine','Spirituality','Art & Culture','Dance'], langs:['English','Tamil','Telugu'], hourly:550, half:1600, full:2900, rating:4.9, reviews:67, bookings:78, avatar:'https://i.pravatar.cc/150?img=9', available:true },
  { name:'Kiran Rao', email:'kiran@guide.com', city:'Bangalore', lat:12.9716, lng:77.5946, bio:'Tech professional turned heritage buff. I run the only guided walk through Bangalore old pete area. Also do craft brewery tours and startup ecosystem visits.', tags:['History','Food & Cuisine','Nightlife','Tech'], langs:['English','Kannada','Hindi'], hourly:750, half:2300, full:4000, rating:4.6, reviews:45, bookings:52, avatar:'https://i.pravatar.cc/150?img=3', available:true },
  { name:'Fatima Sheikh', email:'fatima@guide.com', city:'Delhi', lat:28.7041, lng:77.1025, bio:'Historian specializing in Mughal Delhi. My walking tours of Old Delhi and Nizamuddin are featured in Lonely Planet. Expert in street photography spots.', tags:['History','Photography','Street Food','Architecture'], langs:['English','Hindi','Urdu'], hourly:900, half:2800, full:4800, rating:4.8, reviews:312, bookings:387, avatar:'https://i.pravatar.cc/150?img=16', available:true },
  { name:'Suresh Pillai', email:'suresh@guide.com', city:'Goa', lat:15.2993, lng:74.1240, bio:'Fisherman, surfer, and born Goan. I will take you to the hidden beaches only locals swim at, the best shacks not in any guide, and the real Portuguese-Konkani culture.', tags:['Nature','Beach','Food & Cuisine','Adventure'], langs:['English','Konkani','Hindi'], hourly:850, half:2600, full:4500, rating:4.7, reviews:178, bookings:221, avatar:'https://i.pravatar.cc/150?img=12', available:true },
  { name:'Anjali Gupta', email:'anjali@guide.com', city:'Varanasi', lat:25.3176, lng:82.9739, bio:'Vedic scholar and Banaras local. Morning boat rides, evening Ganga Aarti, silk weaving workshops, and ancient ghats — I share what pilgrims and tourists rarely get to see.', tags:['Spirituality','History','Art & Culture','Photography'], langs:['English','Hindi','Sanskrit'], hourly:600, half:1900, full:3300, rating:5.0, reviews:89, bookings:102, avatar:'https://i.pravatar.cc/150?img=10', available:true },
];

const TOURS_DATA = [
  { title:'Mumbai Street Food Crawl', city:'Mumbai', desc:'Taste 15 iconic Mumbai street foods in 3 hours — vada pav, pav bhaji, bhel puri and more. No tourist traps, only locals eat here.', price:499, max:10, date:'2026-06-10', time:'18:00', dur:'3 hours', cats:['Food','Cultural'], meet:'CST Railway Station main entrance', img:'https://images.unsplash.com/photo-1567337710282-00832b415979?w=400', guideIdx:0 },
  { title:'Jaipur Sunrise Palace Walk', city:'Jaipur', desc:'Beat the crowds — watch the sun rise over Amber Fort and explore Hawa Mahal before any tourist buses arrive. Photography heaven.', price:699, max:8, date:'2026-06-12', time:'05:30', dur:'4 hours', cats:['History','Photography'], meet:'Hawa Mahal main gate', img:'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=400', guideIdx:2 },
  { title:'Kochi Backwater Sunrise Kayak', city:'Kochi', desc:'Kayak through the misty backwaters at sunrise, spot birds, visit a toddy shop and have fresh Kerala breakfast at a fisherman home.', price:899, max:6, date:'2026-06-15', time:'06:00', dur:'5 hours', cats:['Nature','Adventure'], meet:'Fort Kochi Beach parking lot', img:'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=400', guideIdx:1 },
  { title:'Delhi Old City Night Walk', city:'Delhi', desc:'Discover the magic of Chandni Chowk after dark — street food, perfume shops, light shows at mosques, and the most photogenic alleyways in India.', price:599, max:12, date:'2026-06-18', time:'19:30', dur:'3 hours', cats:['History','Street Food'], meet:'Red Fort metro gate 1', img:'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400', guideIdx:5 },
  { title:'Goa Hidden Beach Hopping', city:'Goa', desc:'Skip Baga and Calangute — visit 4 secret beaches only locals know, including one accessible only by boat. Includes fresh catch lunch.', price:1299, max:8, date:'2026-06-20', time:'08:00', dur:'7 hours', cats:['Beach','Nature','Adventure'], meet:'Panjim jetty', img:'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400', guideIdx:6 },
  { title:'Varanasi Dawn Boat and Aarti', city:'Varanasi', desc:'Row silently through dawn mist on the Ganga, watch morning rituals at the ghats, and evening Ganga Aarti front row.', price:799, max:8, date:'2026-06-22', time:'04:30', dur:'6 hours', cats:['Spirituality','Photography'], meet:'Dashashwamedh Ghat steps', img:'https://images.unsplash.com/photo-1561361058-c24e72565bb2?w=400', guideIdx:7 },
];

const REELS_DATA = [
  { caption:'Sunrise at Amber Fort — arrived at 5am and had it all to myself! #Jaipur #HiddenIndia', city:'Jaipur', type:'VIEWPOINT', video:'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', thumb:'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=300', likes:234, views:1892, guideIdx:2 },
  { caption:'Street food heaven in Mumbai — this pav bhaji has changed my life forever #MumbaiFood', city:'Mumbai', type:'FOOD_SPOT', video:'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', thumb:'https://images.unsplash.com/photo-1567337710282-00832b415979?w=300', likes:567, views:4321, guideIdx:0 },
  { caption:'Found this hidden beach in Goa after 30 mins of hiking — worth every step! #SecretGoa', city:'Goa', type:'HIDDEN_GEM', video:'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', thumb:'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=300', likes:891, views:7654, guideIdx:6 },
  { caption:'Evening Ganga Aarti in Varanasi — I cried. The energy is indescribable. #Varanasi', city:'Varanasi', type:'TRAVELER_EXPERIENCE', video:'https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4', thumb:'https://images.unsplash.com/photo-1561361058-c24e72565bb2?w=300', likes:1203, views:9876, guideIdx:7 },
  { caption:'Kayaking through Kerala backwaters at dawn. Pure magic. #Kerala', city:'Kochi', type:'GUIDE_PROMO', video:'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', thumb:'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=300', likes:445, views:3210, guideIdx:1 },
  { caption:'Tried 8 types of dosa in 2 hours in Chennai — this coconut chutney is DANGEROUS #Chennai', city:'Chennai', type:'FOOD_SPOT', video:'https://storage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4', thumb:'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300', likes:332, views:2456, guideIdx:3 },
];

async function seed() {
  // Import db inside function to avoid circular issues
  const db = require('./db');
  const { users, guideProfiles, travelerProfiles, groupTours, reels, reviews } = db;

  console.log('\n🌱 Seeding LocalLens database...\n');

  const passwordHash = await bcrypt.hash('Guide@1234', 12);
  const travHash = await bcrypt.hash('Travel@1234', 12);

  // Create traveller accounts
  const travellers = [];
  for (const t of [
    { name:'Rohan Mehta', email:'rohan@traveller.com', avatar:'https://i.pravatar.cc/150?img=20' },
    { name:'Sneha Patel', email:'sneha@traveller.com', avatar:'https://i.pravatar.cc/150?img=21' },
    { name:'Vikram Das', email:'vikram@traveller.com', avatar:'https://i.pravatar.cc/150?img=22' },
  ]) {
    try {
      const u = await users.create({ email:t.email, passwordHash:travHash, fullName:t.name, avatarUrl:t.avatar, role:'TRAVELER' });
      await travelerProfiles.create(u.id);
      travellers.push(u);
      console.log('  ✓ Traveller:', t.name);
    } catch (e) { console.log('  - Traveller exists:', t.name); }
  }

  // Create guides
  const createdGuides = [];
  for (const g of GUIDES_DATA) {
    try {
      const u = await users.create({ email:g.email, passwordHash, fullName:g.name, avatarUrl:g.avatar, role:'GUIDE' });
      const guide = await guideProfiles.create({
        userId:u.id, bio:g.bio, city:g.city, country:'India',
        languages:g.langs, expertiseTags:g.tags,
        isPhotographer:g.tags.includes('Photography'),
        hourlyRate:g.hourly, halfDayRate:g.half, fullDayRate:g.full,
      });
      await guideProfiles.update(guide.id, {
        latitude: g.lat + (Math.random()-0.5)*0.02,
        longitude: g.lng + (Math.random()-0.5)*0.02,
        isAvailable: g.available,
        avgRating: g.rating,
        totalReviews: g.reviews,
        totalBookings: g.bookings,
        walletBalance: g.bookings * g.hourly * 0.9,
        totalEarnings: g.bookings * g.hourly * 0.9,
      });
      createdGuides.push({ guide, user:u });
      console.log('  ✓ Guide:', g.name, 'in', g.city);
    } catch (e) { console.log('  - Guide exists:', g.name); }
  }

  // Create group tours
  for (const t of TOURS_DATA) {
    try {
      const guideUser = createdGuides[t.guideIdx] || createdGuides[0];
      if (!guideUser) continue;
      const guide = await guideProfiles.findByUserId(guideUser.user.id);
      if (!guide) continue;
      await groupTours.create({
        guideId:guide.id, title:t.title, description:t.desc, city:t.city,
        date:t.date, startTime:t.time, duration:t.dur,
        maxMembers:t.max, pricePerPerson:t.price,
        meetupPoint:t.meet, category:t.cats, coverImage:t.img,
      });
      console.log('  ✓ Tour:', t.title);
    } catch (e) { console.log('  - Tour error:', e.message.slice(0,50)); }
  }

  // Create reels
  for (const r of REELS_DATA) {
    try {
      const guideUser = createdGuides[r.guideIdx] || createdGuides[0];
      if (!guideUser) continue;
      const reel = await reels.create({
        userId:guideUser.user.id, videoUrl:r.video, thumbnailUrl:r.thumb,
        caption:r.caption, reelType:r.type, city:r.city, locationName:r.city,
      });
      // Update engagement counts directly in db
      if (db.USE_PG) {
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl:{ rejectUnauthorized:false } });
        await pool.query('UPDATE reels SET likes_count=$1, views=$2 WHERE id=$3', [r.likes, r.views, reel.id]).catch(()=>{});
        await pool.end();
      }
      console.log('  ✓ Reel:', r.caption.slice(0,40));
    } catch (e) { console.log('  - Reel error:', e.message.slice(0,50)); }
  }

  console.log('\n✅ Seeding complete!\n');
  console.log('📋 Demo Login Credentials:');
  console.log('   GUIDE 1  → arjun@guide.com | Guide@1234');
  console.log('   GUIDE 2  → priya@guide.com | Guide@1234');
  console.log('   TRAVELER → rohan@traveller.com | Travel@1234');
  console.log('\n   All guides are visible on the map with real coordinates! 🗺️\n');
  // NO process.exit() here — server keeps running
}

// Export for use by index.js
module.exports = { seed };

// Also runnable standalone: node src/seed.js
if (require.main === module) {
  seed().then(() => process.exit(0)).catch(err => { console.error('Seed error:', err); process.exit(1); });
}
