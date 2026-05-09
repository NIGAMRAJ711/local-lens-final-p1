/**
 * LocalLens Seed Script
 * Exports: seed() function — called by index.js on first startup
 * Also runnable standalone: node src/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');

const GUIDES_DATA = [
  {
    name:'Arjun Mehta', email:'arjun@guide.com', city:'Mumbai', lat:18.9220, lng:72.8347,
    bio:"Born and raised in Mumbai, I know every hidden lane of this city. From street food trails to Bollywood film locations, I make Mumbai unforgettable.",
    tags:['Street Food','Bollywood','History','Architecture'], langs:['English','Hindi','Marathi'],
    hourly:800, half:2500, full:4500, rating:4.9, reviews:127, bookings:143,
    avatar:'https://i.pravatar.cc/150?img=11', available:true,
    placesOneHour:'Gateway of India, Colaba Causeway market walk',
    placesHalfDay:'Gateway of India, Colaba Causeway, CST Station (UNESCO), Kala Ghoda Art District',
    placesFullDay:'CST Station, Dharavi tour, Dhobi Ghat, Juhu Beach, Bandra Fort, Worli Sea Link sunset',
    providesCab:true, cabPricePerKm:14, cabFullDayPrice:1800,
    hotelRecommendations:'Taj Mahal Palace (luxury), Abode Bombay (boutique), Zostel Mumbai (budget)',
    restaurantRecommendations:'Bademiya for kebabs, Leopold Cafe for history, Cafe Madras for South Indian breakfast, Trishna for seafood',
  },
  {
    name:'Priya Sharma', email:'priya@guide.com', city:'Delhi', lat:28.6562, lng:77.2410,
    bio:"History teacher turned guide. Delhi is a 5000-year-old story and I tell it better than any textbook. Mughal architecture, Chandni Chowk chaos, and modern Delhi — all in one day.",
    tags:['Mughal History','Street Food','Heritage','Photography'], langs:['English','Hindi','Punjabi'],
    hourly:700, half:2200, full:4000, rating:4.8, reviews:98, bookings:112,
    avatar:'https://i.pravatar.cc/150?img=5', available:true,
    placesOneHour:'India Gate, Rajpath walk, brief Rashtrapati Bhavan view',
    placesHalfDay:'Red Fort, Jama Masjid, Chandni Chowk food walk, Paranthe Wali Gali',
    placesFullDay:"Qutub Minar, Humayun's Tomb, Lodhi Garden, Khan Market, Red Fort, Chandni Chowk evening",
    providesCab:true, cabPricePerKm:12, cabFullDayPrice:1600,
    hotelRecommendations:'The Imperial (luxury), Haveli Dharampura (heritage), Stops Hostel (budget)',
    restaurantRecommendations:"Karim's for Mughlai, Natraj for dahi bhalle, Indian Accent for fine dining, Paranthe Wali Gali for breakfast",
  },
  {
    name:'Rahul Nair', email:'rahul@guide.com', city:'Kochi', lat:9.9658, lng:76.2421,
    bio:"Kerala native, marine biologist, and passionate storyteller. I will take you through backwaters, spice markets, and colonial history that no travel blog has covered.",
    tags:['Backwaters','Spice Tour','Colonial History','Nature'], langs:['English','Malayalam','Hindi'],
    hourly:600, half:1800, full:3200, rating:4.7, reviews:84, bookings:97,
    avatar:'https://i.pravatar.cc/150?img=15', available:true,
    placesOneHour:'Fort Kochi beach walk, Chinese fishing nets, Jewish cemetery',
    placesHalfDay:'Fort Kochi, Mattancherry Dutch Palace, Jew Town spice market, Paradesi Synagogue',
    placesFullDay:'Fort Kochi heritage walk, Mattancherry, backwater boat ride, Cherai Beach, spice plantation visit',
    providesCab:false, cabPricePerKm:0, cabFullDayPrice:0,
    hotelRecommendations:'Brunton Boatyard (heritage luxury), Old Harbour Hotel (boutique), Zostel Kochi (budget)',
    restaurantRecommendations:'Oceanos for seafood, Kashi Art Cafe for breakfast, Dal Roti for North Indian, Grand Pavilion for Kerala sadya',
  },
  {
    name:'Sneha Patel', email:'sneha@guide.com', city:'Jaipur', lat:26.9124, lng:75.7873,
    bio:"Pink City is my playground. I photograph and narrate Jaipur's royalty, bazaars and havelis. I specialise in photography tours — every stop is Instagram gold.",
    tags:['Royal Heritage','Photography','Bazaars','Architecture'], langs:['English','Hindi','Rajasthani'],
    hourly:750, half:2000, full:3800, photographyRate:1200, rating:4.9, reviews:156, bookings:178,
    avatar:'https://i.pravatar.cc/150?img=9', available:true, isPhotographer:true,
    placesOneHour:'Hawa Mahal exterior, Johri Bazaar walk',
    placesHalfDay:'Hawa Mahal, City Palace, Jantar Mantar, Johari Bazaar shopping',
    placesFullDay:'Amber Fort, Jal Mahal, Hawa Mahal, City Palace, Jantar Mantar, Bapu Bazaar evening',
    providesCab:true, cabPricePerKm:13, cabFullDayPrice:1500,
    hotelRecommendations:'Rambagh Palace (iconic luxury), Samode Haveli (heritage), Zostel Jaipur (budget)',
    restaurantRecommendations:'Laxmi Misthan Bhandar for sweets, Suvarna Mahal for royal dining, Peacock Rooftop for views, Tapri for chai',
  },
  {
    name:'Vikram Rao', email:'vikram@guide.com', city:'Bangalore', lat:12.9716, lng:77.5946,
    bio:"Tech city has a soul beyond startups. I take you through Bangalore's garden city past, craft beer culture, ancient temples hidden between skyscrapers, and the best filter coffee spots.",
    tags:['Craft Beer','Gardens','Tech Culture','Temple Trails','Food'], langs:['English','Kannada','Hindi','Tamil'],
    hourly:900, half:2800, full:5000, rating:4.6, reviews:73, bookings:85,
    avatar:'https://i.pravatar.cc/150?img=3', available:true,
    placesOneHour:'Cubbon Park walk, Vidhana Soudha photo stop',
    placesHalfDay:'Cubbon Park, Vidhana Soudha, Commercial Street shopping, Shivaji Nagar market',
    placesFullDay:"Tipu Sultan's Summer Palace, Lalbagh Botanical Garden, Bull Temple, VV Puram food street, Indiranagar craft beer trail",
    providesCab:true, cabPricePerKm:16, cabFullDayPrice:2000,
    hotelRecommendations:'The Leela Palace (luxury), Taj MG Road (business), Zostel Bangalore (budget)',
    restaurantRecommendations:'MTR for filter coffee and breakfast, Koshy\'s for colonial nostalgia, Toit for craft beer, VV Puram food street for chaats',
  },
  {
    name:'Meera Iyer', email:'meera@guide.com', city:'Varanasi', lat:25.3176, lng:82.9739,
    bio:"Born on the ghats of Varanasi, I have witnessed 10,000 sunrises over the Ganga. I guide spiritual seekers, photographers and curious travelers through the world's oldest living city.",
    tags:['Spirituality','Photography','Ghat Culture','Boat Rides','Temples'], langs:['English','Hindi','Sanskrit basics'],
    hourly:500, half:1500, full:2800, rating:5.0, reviews:201, bookings:230,
    avatar:'https://i.pravatar.cc/150?img=16', available:true,
    placesOneHour:'Dashashwamedh Ghat, Ganga Aarti preparation walk',
    placesHalfDay:'Sunrise boat ride, Manikarnika Ghat, Kashi Vishwanath Temple lane, Vishwanath Gali',
    placesFullDay:"Pre-dawn Ganga Aarti boat ride, 5 main ghats walk, Sarnath (Buddha's first sermon site), Banaras Hindu University, evening Ganga Aarti at Dashashwamedh",
    providesCab:false, cabPricePerKm:0, cabFullDayPrice:0,
    hotelRecommendations:'Brijrama Palace (heritage ghat hotel), Suryauday Haveli (boutique), Zostel Varanasi (budget backpacker)',
    restaurantRecommendations:'Kashi Chat Bhandar for street food, Brown Bread Bakery for breakfast, Pizzeria Vaatika for rooftop views, Deena Chat Bhandar for tamatar chaat',
  },
  {
    name:'Aditya Singh', email:'aditya@guide.com', city:'Udaipur', lat:24.5854, lng:73.7125,
    bio:"City of Lakes is my canvas. I am a trained architect and art historian — Udaipur's palaces, havelis and lake culture come alive through my lens and stories.",
    tags:['Palaces','Lake Tours','Art & Craft','Photography','Architecture'], langs:['English','Hindi','Rajasthani'],
    hourly:700, half:2000, full:3500, photographyRate:1100, rating:4.8, reviews:112, bookings:130,
    avatar:'https://i.pravatar.cc/150?img=12', available:true, isPhotographer:true,
    placesOneHour:'Lake Pichola promenade, City Palace exterior view',
    placesHalfDay:'City Palace, Jagdish Temple, Lake Pichola boat ride, Bagore Ki Haveli',
    placesFullDay:'City Palace full tour, Lake Pichola boat to Jag Mandir, Sajjangarh Monsoon Palace, Saheliyon Ki Bari, Shilpgram craft village',
    providesCab:true, cabPricePerKm:12, cabFullDayPrice:1400,
    hotelRecommendations:'Taj Lake Palace (on water — iconic), Raas Leela (boutique), Zostel Udaipur (budget)',
    restaurantRecommendations:'Ambrai for lake view dining, Upre rooftop restaurant, Natraj for local thali, Millets of Mewar for healthy options',
  },
  {
    name:'Kavya Menon', email:'kavya@guide.com', city:'Goa', lat:15.4909, lng:73.8278,
    bio:"I am not a beach guide — I am a Goa guide. I will show you the Goa that tourists never find: 400-year-old Portuguese churches, spice plantations, Konkani cuisine trails and empty beaches at golden hour.",
    tags:['Heritage','Beaches','Portuguese Culture','Spice Tours','Food'], langs:['English','Konkani','Hindi','Portuguese basics'],
    hourly:850, half:2500, full:4200, photographyRate:1300, rating:4.7, reviews:89, bookings:104,
    avatar:'https://i.pravatar.cc/150?img=10', available:true, isPhotographer:true,
    placesOneHour:'Fontainhas Latin Quarter walk, old Portuguese houses',
    placesHalfDay:'Fontainhas, Se Cathedral, Basilica of Bom Jesus, Old Goa heritage walk',
    placesFullDay:'Old Goa churches, spice plantation with lunch, Dudhsagar Falls viewpoint, Anjuna flea market or Chapora Fort, sunset at Vagator Beach',
    providesCab:true, cabPricePerKm:15, cabFullDayPrice:2200,
    hotelRecommendations:'Taj Exotica (luxury beach), Casa de Lila (heritage boutique), Jungle by Sturm (mid-range), Party hostels in North Goa (budget)',
    restaurantRecommendations:'Vinayak Family Restaurant for fish curry rice, Gunpowder for coastal cuisine, Thalassa for Greek-Goan fusion, Joseph Bar for feni',
  },
];

const TOURS_DATA = [
  { title:'Mumbai Street Food Crawl', city:'Mumbai', desc:'Taste 15 iconic Mumbai street foods in 3 hours — vada pav, pav bhaji, bhel puri and more. No tourist traps, only locals eat here.', price:499, max:10, date:'2026-07-10', time:'18:00', dur:'3 hours', cats:['Food','Cultural'], meet:'CST Railway Station main entrance', img:'https://images.unsplash.com/photo-1567337710282-00832b415979?w=400', guideIdx:0 },
  { title:'Jaipur Sunrise Palace Walk', city:'Jaipur', desc:'Beat the crowds — watch the sun rise over Amber Fort and explore Hawa Mahal before any tourist buses arrive. Photography heaven.', price:699, max:8, date:'2026-07-12', time:'05:30', dur:'4 hours', cats:['History','Photography'], meet:'Hawa Mahal main gate', img:'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=400', guideIdx:3 },
  { title:'Kochi Backwater Sunrise Kayak', city:'Kochi', desc:'Kayak through the misty backwaters at sunrise, spot birds, visit a toddy shop and have fresh Kerala breakfast at a fisherman home.', price:899, max:6, date:'2026-07-15', time:'06:00', dur:'5 hours', cats:['Nature','Adventure'], meet:'Fort Kochi Beach parking lot', img:'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=400', guideIdx:2 },
  { title:'Delhi Old City Night Walk', city:'Delhi', desc:'Discover the magic of Chandni Chowk after dark — street food, perfume shops, light shows at mosques, and the most photogenic alleyways in India.', price:599, max:12, date:'2026-07-18', time:'19:30', dur:'3 hours', cats:['History','Street Food'], meet:'Red Fort metro gate 1', img:'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400', guideIdx:1 },
  { title:'Goa Hidden Beach Hopping', city:'Goa', desc:'Skip Baga and Calangute — visit 4 secret beaches only locals know, including one accessible only by boat. Includes fresh catch lunch.', price:1299, max:8, date:'2026-07-20', time:'08:00', dur:'7 hours', cats:['Beach','Nature','Adventure'], meet:'Panjim jetty', img:'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400', guideIdx:7 },
  { title:'Varanasi Dawn Boat and Aarti', city:'Varanasi', desc:'Row silently through dawn mist on the Ganga, watch morning rituals at the ghats, and evening Ganga Aarti front row.', price:799, max:8, date:'2026-07-22', time:'04:30', dur:'6 hours', cats:['Spirituality','Photography'], meet:'Dashashwamedh Ghat steps', img:'https://images.unsplash.com/photo-1561361058-c24e72565bb2?w=400', guideIdx:5 },
  { title:'Udaipur Palace & Lakes Tour', city:'Udaipur', desc:'See the City of Lakes from every angle — palaces, havelis, boat rides, and the stunning art of Mewar. Perfect for photography lovers.', price:999, max:8, date:'2026-07-25', time:'09:00', dur:'6 hours', cats:['Heritage','Photography'], meet:'City Palace main entrance', img:'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=400', guideIdx:6 },
  { title:'Bangalore Craft Beer & Heritage Trail', city:'Bangalore', desc:'From 16th century palaces to cutting-edge craft breweries — explore the two sides of Bangalore that nobody shows you together.', price:899, max:10, date:'2026-07-28', time:'16:00', dur:'4 hours', cats:['Food','History'], meet:'Cubbon Park main gate', img:'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=400', guideIdx:4 },
];

const SEED_GROUP_TOURS = [
  {
    title:'Mumbai Street Food Crawl 🍢',
    description:'Explore Mumbai\'s legendary street food scene — from Juhu beach bhel puri to Mohammad Ali Road kebabs. A guided walk through 8 iconic food stops with stories behind each dish.',
    city:'Mumbai', date:'2026-07-15', startTime:'6:00 PM', duration:'3 hours', maxMembers:10, pricePerPerson:599,
    meetupPoint:'Churchgate Station Exit 2', category:['Food','Culture'],
    whatsappLink:'https://chat.whatsapp.com/invite/mumbaifoodies',
    photos:['https://images.unsplash.com/photo-1567337710282-00832b415979?w=600','https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600','https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=600'],
    guideIdx:0,
  },
  {
    title:'Jaipur Sunrise Photography Walk 📸',
    description:'Catch the magical golden hour light at Hawa Mahal and Amber Fort. Perfect for photographers and travel bloggers. Bring your camera — every frame will be frame-worthy.',
    city:'Jaipur', date:'2026-07-20', startTime:'5:30 AM', duration:'4 hours', maxMembers:8, pricePerPerson:799,
    meetupPoint:'Hawa Mahal Main Gate', category:['Photography','Heritage'],
    whatsappLink:'https://chat.whatsapp.com/invite/jaipurphoto',
    photos:['https://images.unsplash.com/photo-1599661046289-e31897846e41?w=600','https://images.unsplash.com/photo-1477587458883-47145ed94245?w=600','https://images.unsplash.com/photo-1524613032530-449a5d94c285?w=600'],
    guideIdx:3,
  },
  {
    title:'Varanasi Ganga Aarti & Ghat Walk 🪔',
    description:'Witness the world-famous Ganga Aarti ceremony from a private boat, followed by a guided walk through 7 ghats with stories of life, death and spirituality in the oldest city on Earth.',
    city:'Varanasi', date:'2026-07-18', startTime:'5:00 AM', duration:'3 hours', maxMembers:12, pricePerPerson:499,
    meetupPoint:'Dasaswamedh Ghat Steps', category:['Culture','Heritage','Photography'],
    whatsappLink:'https://chat.whatsapp.com/invite/varanasiaarti',
    photos:['https://images.unsplash.com/photo-1561361058-c24e02aa6a72?w=600','https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=600','https://images.unsplash.com/photo-1548013146-72479768bada?w=600'],
    guideIdx:5,
  },
  {
    title:'Goa Hidden Beaches & Fort Trek 🏖️',
    description:'Skip the tourist beaches. We explore Goa\'s secret coves, ruined Portuguese forts and spice-scented villages that most visitors never find. Ends with sunset at Chapora Fort.',
    city:'Goa', date:'2026-07-25', startTime:'8:00 AM', duration:'Full Day', maxMembers:8, pricePerPerson:1299,
    meetupPoint:'Mapusa Bus Stand', category:['Adventure','Nature','Heritage'],
    whatsappLink:'https://chat.whatsapp.com/invite/goahidden',
    photos:['https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=600','https://images.unsplash.com/photo-1587923371016-f68aa5b8e9be?w=600','https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=600'],
    guideIdx:7,
  },
  {
    title:'Delhi Mughal Heritage Walk 🕌',
    description:'From Humayun\'s Tomb to Lodhi Garden to the lanes of Nizamuddin — a deep dive into Delhi\'s Mughal soul with a historian guide. Includes chai and snack stops.',
    city:'Delhi', date:'2026-08-01', startTime:'7:00 AM', duration:'4 hours', maxMembers:10, pricePerPerson:699,
    meetupPoint:'Humayun\'s Tomb Main Gate', category:['Heritage','Culture','Photography'],
    whatsappLink:'https://chat.whatsapp.com/invite/delhimughal',
    photos:['https://images.unsplash.com/photo-1548013146-72479768bada?w=600','https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600','https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600'],
    guideIdx:1,
  },
  {
    title:'Kochi Backwater Sunrise Kayak 🛶',
    description:'Paddle through Kerala\'s famous backwaters at sunrise — mirror-still water, fishing boats, coconut groves. No experience needed. Includes breakfast at a homestay after.',
    city:'Kochi', date:'2026-07-22', startTime:'5:45 AM', duration:'3 hours', maxMembers:6, pricePerPerson:999,
    meetupPoint:'Fort Kochi Jetty', category:['Adventure','Nature'],
    whatsappLink:'https://chat.whatsapp.com/invite/kochibackwater',
    photos:['https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=600','https://images.unsplash.com/photo-1593693397690-362cb9666fc2?w=600','https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600'],
    guideIdx:2,
  },
];

const REELS_DATA = [
  { caption:'Golden hour at Gateway of India 🌅 #Mumbai #Travel', city:'Mumbai', type:'HIDDEN_GEM', locationName:'Gateway of India', video:'https://res.cloudinary.com/demo/video/upload/v1689832276/samples/sea-turtle.mp4', thumb:'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=400', likes:234, views:1892, guideIdx:0, lat:18.9220, lng:72.8347 },
  { caption:'Morning aarti at Dashashwamedh Ghat 🙏 #Varanasi #Spiritual', city:'Varanasi', type:'HIDDEN_GEM', locationName:'Dashashwamedh Ghat', video:'https://res.cloudinary.com/demo/video/upload/v1689832276/samples/elephants.mp4', thumb:'https://images.unsplash.com/photo-1561361058-c24e02aa6a72?w=400', likes:1203, views:9876, guideIdx:5, lat:25.3176, lng:82.9739 },
  { caption:'Amber Fort magic at sunrise ✨ #Jaipur #RoyalRajasthan', city:'Jaipur', type:'VIEWPOINT', locationName:'Amber Fort', video:'https://res.cloudinary.com/demo/video/upload/v1689832276/samples/cld-sample-video.mp4', thumb:'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=400', likes:567, views:4321, guideIdx:3, lat:26.9855, lng:75.8513 },
  { caption:'Backwaters of Kerala — pure peace 🌿 #Kochi #Kerala', city:'Kochi', type:'HIDDEN_GEM', locationName:'Kerala Backwaters', video:'https://res.cloudinary.com/demo/video/upload/v1689832276/samples/dance-2.mp4', thumb:'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=400', likes:445, views:3210, guideIdx:2, lat:9.9312, lng:76.2673 },
  { caption:'Sunset at Chapora Fort 🏖️ #Goa #HiddenGem', city:'Goa', type:'VIEWPOINT', locationName:'Chapora Fort', video:'https://res.cloudinary.com/demo/video/upload/v1689832276/samples/basketball.mp4', thumb:'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400', likes:891, views:7654, guideIdx:7, lat:15.6060, lng:73.7397 },
  { caption:'Street food trail in Chandni Chowk 🍢 #Delhi #FoodSpot', city:'Delhi', type:'FOOD_SPOT', locationName:'Chandni Chowk', video:'https://res.cloudinary.com/demo/video/upload/v1689832276/samples/sea-turtle.mp4', thumb:'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400', likes:332, views:2456, guideIdx:1, lat:28.6562, lng:77.2310 },
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
    { name:'Demo Traveler', email:'traveler@demo.com', avatar:'https://i.pravatar.cc/150?img=20' },
    { name:'Rohan Mehta', email:'rohan@traveller.com', avatar:'https://i.pravatar.cc/150?img=21' },
    { name:'Sneha Kapoor', email:'sneha@traveller.com', avatar:'https://i.pravatar.cc/150?img=22' },
    { name:'Vikram Das', email:'vikram@traveller.com', avatar:'https://i.pravatar.cc/150?img=23' },
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
      await travelerProfiles.create(u.id);
      const guide = await guideProfiles.create({
        userId:u.id, bio:g.bio, city:g.city, country:'India',
        languages:g.langs, expertiseTags:g.tags,
        isPhotographer:!!g.isPhotographer,
        hourlyRate:g.hourly, halfDayRate:g.half, fullDayRate:g.full,
        photographyRate:g.photographyRate||null,
        placesOneHour:g.placesOneHour||'', placesHalfDay:g.placesHalfDay||'', placesFullDay:g.placesFullDay||'',
        providesCab:!!g.providesCab, cabPricePerKm:g.cabPricePerKm||0, cabFullDayPrice:g.cabFullDayPrice||0,
        hotelRecommendations:g.hotelRecommendations||'', restaurantRecommendations:g.restaurantRecommendations||'',
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

      // Seed reviews (JSON mode only — PG requires real booking FK)
      if (!db.USE_PG) {
        const reviewComments = [
          [`Amazing guide! ${g.name} showed us hidden spots we'd never have found alone. Highly recommend!`, 5],
          [`Very knowledgeable about ${g.city}. The food recommendations were spot on. Will book again.`, 5],
          [`Great experience overall. ${g.name} is punctual, friendly and very informative.`, 4],
        ];
        for (let i = 0; i < Math.min(travellers.length, 3); i++) {
          const traveller = travellers[i];
          if (!traveller) continue;
          try {
            const fakeBookingId = `seed-bk-${u.id.slice(0,8)}-${i}`;
            await reviews.create({
              bookingId: fakeBookingId, reviewerId: traveller.id, revieweeId: u.id,
              rating: reviewComments[i][1], comment: reviewComments[i][0],
            });
          } catch(re) { /* skip duplicate */ }
        }
      }
    } catch (e) { console.log('  - Guide exists:', g.name); }
  }

  // Create group tours (only if table is empty)
  let tourCount = 0;
  try { const all = await groupTours.findMany({}); tourCount = Array.isArray(all) ? all.length : 0; } catch {}
  if (tourCount === 0) {
    for (const t of SEED_GROUP_TOURS) {
      try {
        const guideUser = createdGuides[t.guideIdx] || createdGuides[0];
        if (!guideUser) continue;
        const guide = await guideProfiles.findByUserId(guideUser.user.id).catch(() => null);
        await groupTours.create({
          guideId: guide?.id || null,
          creatorId: guideUser.user.id,
          creatorType: 'GUIDE',
          title: t.title, description: t.description, city: t.city,
          date: t.date, startTime: t.startTime, duration: t.duration,
          maxMembers: t.maxMembers, pricePerPerson: t.pricePerPerson,
          meetupPoint: t.meetupPoint, category: t.category,
          whatsappLink: t.whatsappLink, photos: t.photos,
          coverImage: t.photos?.[0] || '',
        });
        console.log('  ✓ Group Tour:', t.title);
      } catch (e) { console.log('  - Tour error:', e.message.slice(0,60)); }
    }
    // Also create the original TOURS_DATA group tours
    for (const t of TOURS_DATA) {
      try {
        const guideUser = createdGuides[t.guideIdx] || createdGuides[0];
        if (!guideUser) continue;
        const guide = await guideProfiles.findByUserId(guideUser.user.id).catch(() => null);
        await groupTours.create({
          guideId: guide?.id || null, creatorId: guideUser.user.id, creatorType: 'GUIDE',
          title: t.title, description: t.desc, city: t.city,
          date: t.date, startTime: t.time, duration: t.dur,
          maxMembers: t.max, pricePerPerson: t.price,
          meetupPoint: t.meet, category: t.cats, coverImage: t.img,
        });
        console.log('  ✓ Tour:', t.title);
      } catch (e) { console.log('  - Tour error:', e.message.slice(0,50)); }
    }
  } else {
    console.log(`  ℹ️  Skipping group tours — ${tourCount} already exist`);
  }

  // Create reels (only if table is empty)
  let reelCount = 0;
  try { const all = await reels.findAll(); reelCount = Array.isArray(all) ? all.length : 0; } catch {}
  if (reelCount === 0) {
    for (const r of REELS_DATA) {
      try {
        const guideUser = createdGuides[r.guideIdx] || createdGuides[0];
        if (!guideUser) continue;
        const reel = await reels.create({
          userId:guideUser.user.id, videoUrl:r.video, thumbnailUrl:r.thumb,
          caption:r.caption, reelType:r.type, city:r.city, locationName:r.locationName,
          latitude:r.lat, longitude:r.lng,
        });
        if (db.USE_PG) {
          const { Pool } = require('pg');
          const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl:{ rejectUnauthorized:false } });
          await pool.query('UPDATE reels SET likes_count=$1, views=$2 WHERE id=$3', [r.likes, r.views, reel.id]).catch(()=>{});
          await pool.end();
        }
        console.log('  ✓ Reel:', r.caption.slice(0,40));
      } catch (e) { console.log('  - Reel error:', e.message.slice(0,50)); }
    }
  } else {
    console.log('  ℹ️  Skipping reels —', reelCount, 'already exist');
  }

  console.log('\n✅ Seeding complete!\n');
  console.log('📋 Demo Login Credentials:');
  console.log('   GUIDE (Mumbai)   → arjun@guide.com    | Guide@1234');
  console.log('   GUIDE (Delhi)    → priya@guide.com    | Guide@1234');
  console.log('   GUIDE (Varanasi) → meera@guide.com    | Guide@1234');
  console.log('   GUIDE (Goa)      → kavya@guide.com    | Guide@1234');
  console.log('   TRAVELER         → traveler@demo.com  | Travel@1234');
  console.log('\n   All 8 guides visible on map with real coordinates! 🗺️\n');
  // NO process.exit() here — server keeps running
}

// Export for use by index.js
module.exports = { seed };

// Also runnable standalone: node src/seed.js
if (require.main === module) {
  seed().then(() => process.exit(0)).catch(err => { console.error('Seed error:', err); process.exit(1); });
}
