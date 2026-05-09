/**
 * LocalLens Seed Script
 * Exports: seed() function — called by index.js on first startup
 * Also runnable standalone: node src/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');

const GUIDES_DATA = [
  {
    name: 'Arjun Mehta', email: 'arjun@guide.com',
    avatar: 'https://i.pravatar.cc/150?img=11',
    city: 'Mumbai', lat: 18.9220, lng: 72.8347,
    bio: 'Born and raised in Mumbai, I know every hidden lane of this city. From street food trails to Bollywood film locations, I make Mumbai unforgettable.',
    tags: ['Street Food', 'Bollywood', 'History', 'Architecture'],
    langs: ['English', 'Hindi', 'Marathi'],
    hourly: 800, half: 2500, full: 4500,
    isPhotographer: false,
    placesOneHour: 'Gateway of India, Colaba Causeway market walk',
    placesHalfDay: 'Gateway of India, Colaba Causeway, CST Station (UNESCO), Kala Ghoda Art District',
    placesFullDay: 'CST Station, Dharavi tour, Dhobi Ghat, Juhu Beach, Bandra Fort, Worli Sea Link sunset',
    providesCab: true, cabPricePerKm: 14, cabFullDayPrice: 1800,
    hotelRecommendations: 'Taj Mahal Palace (luxury), Abode Bombay (boutique), Zostel Mumbai (budget)',
    restaurantRecommendations: 'Bademiya for kebabs, Leopold Cafe for history, Cafe Madras for South Indian breakfast, Trishna for seafood',
    rating: 4.9, reviews: 127, bookings: 143, available: true,
  },
  {
    name: 'Priya Sharma', email: 'priya@guide.com',
    avatar: 'https://i.pravatar.cc/150?img=5',
    city: 'Delhi', lat: 28.6562, lng: 77.2410,
    bio: 'History teacher turned guide. Delhi is a 5000-year-old story and I tell it better than any textbook. Mughal architecture, Chandni Chowk chaos, and modern Delhi — all in one day.',
    tags: ['Mughal History', 'Street Food', 'Heritage', 'Photography'],
    langs: ['English', 'Hindi', 'Punjabi'],
    hourly: 700, half: 2200, full: 4000,
    isPhotographer: true,
    placesOneHour: 'India Gate, Rajpath walk, brief Rashtrapati Bhavan view',
    placesHalfDay: 'Red Fort, Jama Masjid, Chandni Chowk food walk, Paranthe Wali Gali',
    placesFullDay: "Qutub Minar, Humayun's Tomb, Lodhi Garden, Khan Market, Red Fort, Chandni Chowk evening",
    providesCab: true, cabPricePerKm: 12, cabFullDayPrice: 1600,
    hotelRecommendations: 'The Imperial (luxury), Haveli Dharampura (heritage), Stops Hostel (budget)',
    restaurantRecommendations: "Karim's for Mughlai, Natraj for dahi bhalle, Indian Accent for fine dining, Paranthe Wali Gali for breakfast",
    rating: 4.8, reviews: 98, bookings: 112, available: true,
  },
  {
    name: 'Rahul Nair', email: 'rahul@guide.com',
    avatar: 'https://i.pravatar.cc/150?img=15',
    city: 'Kochi', lat: 9.9658, lng: 76.2421,
    bio: 'Kerala native, marine biologist, and passionate storyteller. I will take you through backwaters, spice markets, and colonial history that no travel blog has covered.',
    tags: ['Backwaters', 'Spice Tour', 'Colonial History', 'Nature'],
    langs: ['English', 'Malayalam', 'Hindi'],
    hourly: 600, half: 1800, full: 3200,
    isPhotographer: false,
    placesOneHour: 'Fort Kochi beach walk, Chinese fishing nets, Jewish cemetery',
    placesHalfDay: 'Fort Kochi, Mattancherry Dutch Palace, Jew Town spice market, Paradesi Synagogue',
    placesFullDay: 'Fort Kochi heritage walk, Mattancherry, backwater boat ride, Cherai Beach, spice plantation visit',
    providesCab: false, cabPricePerKm: 0, cabFullDayPrice: 0,
    hotelRecommendations: 'Brunton Boatyard (heritage luxury), Old Harbour Hotel (boutique), Zostel Kochi (budget)',
    restaurantRecommendations: 'Oceanos for seafood, Kashi Art Cafe for breakfast, Dal Roti for North Indian, Grand Pavilion for Kerala sadya',
    rating: 4.7, reviews: 84, bookings: 96, available: true,
  },
  {
    name: 'Sneha Patel', email: 'sneha.guide@guide.com',
    avatar: 'https://i.pravatar.cc/150?img=9',
    city: 'Jaipur', lat: 26.9124, lng: 75.7873,
    bio: "Pink City is my playground. I photograph and narrate Jaipur's royalty, bazaars and havelis. I specialise in photography tours — every stop is Instagram gold.",
    tags: ['Royal Heritage', 'Photography', 'Bazaars', 'Architecture'],
    langs: ['English', 'Hindi', 'Rajasthani'],
    hourly: 750, half: 2000, full: 3800, photographyRate: 1200,
    isPhotographer: true,
    placesOneHour: 'Hawa Mahal exterior, Johri Bazaar walk',
    placesHalfDay: 'Hawa Mahal, City Palace, Jantar Mantar, Johari Bazaar shopping',
    placesFullDay: 'Amber Fort, Jal Mahal, Hawa Mahal, City Palace, Jantar Mantar, Bapu Bazaar evening',
    providesCab: true, cabPricePerKm: 13, cabFullDayPrice: 1500,
    hotelRecommendations: 'Rambagh Palace (iconic luxury), Samode Haveli (heritage), Zostel Jaipur (budget)',
    restaurantRecommendations: 'Laxmi Misthan Bhandar for sweets, Suvarna Mahal for royal dining, Peacock Rooftop for views, Tapri for chai',
    rating: 4.9, reviews: 156, bookings: 178, available: true,
  },
  {
    name: 'Vikram Rao', email: 'vikram@guide.com',
    avatar: 'https://i.pravatar.cc/150?img=3',
    city: 'Bangalore', lat: 12.9716, lng: 77.5946,
    bio: "Tech city has a soul beyond startups. I take you through Bangalore's garden city past, craft beer culture, ancient temples hidden between skyscrapers, and the best filter coffee spots.",
    tags: ['Craft Beer', 'Gardens', 'Tech Culture', 'Temple Trails', 'Food'],
    langs: ['English', 'Kannada', 'Hindi', 'Tamil'],
    hourly: 900, half: 2800, full: 5000,
    isPhotographer: false,
    placesOneHour: 'Cubbon Park walk, Vidhana Soudha photo stop',
    placesHalfDay: 'Cubbon Park, Vidhana Soudha, Commercial Street shopping, Shivaji Nagar market',
    placesFullDay: "Tipu Sultan's Summer Palace, Lalbagh Botanical Garden, Bull Temple, VV Puram food street, Indiranagar craft beer trail",
    providesCab: true, cabPricePerKm: 16, cabFullDayPrice: 2000,
    hotelRecommendations: 'The Leela Palace (luxury), Taj MG Road (business), Zostel Bangalore (budget)',
    restaurantRecommendations: "MTR for filter coffee and breakfast, Koshy's for colonial nostalgia, Toit for craft beer, VV Puram food street for chaats",
    rating: 4.6, reviews: 73, bookings: 88, available: true,
  },
  {
    name: 'Meera Iyer', email: 'meera@guide.com',
    avatar: 'https://i.pravatar.cc/150?img=10',
    city: 'Varanasi', lat: 25.3176, lng: 82.9739,
    bio: "Born on the ghats of Varanasi, I have witnessed 10,000 sunrises over the Ganga. I guide spiritual seekers, photographers and curious travelers through the world's oldest living city.",
    tags: ['Spirituality', 'Photography', 'Ghat Culture', 'Boat Rides', 'Temples'],
    langs: ['English', 'Hindi', 'Sanskrit basics'],
    hourly: 500, half: 1500, full: 2800,
    isPhotographer: true,
    placesOneHour: 'Dashashwamedh Ghat, Ganga Aarti preparation walk',
    placesHalfDay: "Sunrise boat ride, Manikarnika Ghat, Kashi Vishwanath Temple lane, Vishwanath Gali",
    placesFullDay: "Pre-dawn Ganga Aarti boat ride, 5 main ghats walk, Sarnath (Buddha's first sermon site), Banaras Hindu University, evening Ganga Aarti at Dashashwamedh",
    providesCab: false, cabPricePerKm: 0, cabFullDayPrice: 0,
    hotelRecommendations: 'Brijrama Palace (heritage ghat hotel), Suryauday Haveli (boutique), Zostel Varanasi (budget backpacker)',
    restaurantRecommendations: 'Kashi Chat Bhandar for street food, Brown Bread Bakery for breakfast, Pizzeria Vaatika for rooftop views, Deena Chat Bhandar for tamatar chaat',
    rating: 5.0, reviews: 201, bookings: 234, available: true,
  },
  {
    name: 'Aditya Singh', email: 'aditya@guide.com',
    avatar: 'https://i.pravatar.cc/150?img=12',
    city: 'Udaipur', lat: 24.5854, lng: 73.7125,
    bio: 'City of Lakes is my canvas. I am a trained architect and art historian — Udaipur\'s palaces, havelis and lake culture come alive through my lens and stories.',
    tags: ['Palaces', 'Lake Tours', 'Art & Craft', 'Photography', 'Architecture'],
    langs: ['English', 'Hindi', 'Rajasthani'],
    hourly: 700, half: 2000, full: 3500, photographyRate: 1100,
    isPhotographer: true,
    placesOneHour: 'Lake Pichola promenade, City Palace exterior view',
    placesHalfDay: 'City Palace, Jagdish Temple, Lake Pichola boat ride, Bagore Ki Haveli',
    placesFullDay: 'City Palace full tour, Lake Pichola boat to Jag Mandir, Sajjangarh Monsoon Palace, Saheliyon Ki Bari, Shilpgram craft village',
    providesCab: true, cabPricePerKm: 12, cabFullDayPrice: 1400,
    hotelRecommendations: 'Taj Lake Palace (on water — iconic), Raas Leela (boutique), Zostel Udaipur (budget)',
    restaurantRecommendations: 'Ambrai for lake view dining, Upre rooftop restaurant, Natraj for local thali, Millets of Mewar for healthy options',
    rating: 4.8, reviews: 112, bookings: 129, available: true,
  },
  {
    name: 'Kavya Menon', email: 'kavya@guide.com',
    avatar: 'https://i.pravatar.cc/150?img=16',
    city: 'Goa', lat: 15.4909, lng: 73.8278,
    bio: 'I am not a beach guide — I am a Goa guide. I will show you the Goa that tourists never find: 400-year-old Portuguese churches, spice plantations, Konkani cuisine trails and empty beaches at golden hour.',
    tags: ['Heritage', 'Beaches', 'Portuguese Culture', 'Spice Tours', 'Food'],
    langs: ['English', 'Konkani', 'Hindi', 'Portuguese basics'],
    hourly: 850, half: 2500, full: 4200, photographyRate: 1300,
    isPhotographer: true,
    placesOneHour: 'Fontainhas Latin Quarter walk, old Portuguese houses',
    placesHalfDay: 'Fontainhas, Se Cathedral, Basilica of Bom Jesus, Old Goa heritage walk',
    placesFullDay: 'Old Goa churches, spice plantation with lunch, Dudhsagar Falls viewpoint, Anjuna flea market or Chapora Fort, sunset at Vagator Beach',
    providesCab: true, cabPricePerKm: 15, cabFullDayPrice: 2200,
    hotelRecommendations: 'Taj Exotica (luxury beach), Casa de Lila (heritage boutique), Jungle by Sturm (mid-range), Party hostels in North Goa (budget)',
    restaurantRecommendations: 'Vinayak Family Restaurant for fish curry rice, Gunpowder for coastal cuisine, Thalassa for Greek-Goan fusion, Joseph Bar for feni',
    rating: 4.7, reviews: 89, bookings: 103, available: true,
  },
];

const TOURS_DATA = [
  { title:'Mumbai Street Food Crawl', city:'Mumbai', desc:'Taste 15 iconic Mumbai street foods in 3 hours — vada pav, pav bhaji, bhel puri and more. No tourist traps, only locals eat here.', price:499, max:10, date:'2026-07-10', time:'18:00', dur:'3 hours', cats:['Food','Cultural'], meet:'CST Railway Station main entrance', img:'https://images.unsplash.com/photo-1567337710282-00832b415979?w=400', guideIdx:0 },
  { title:'Jaipur Sunrise Palace Walk', city:'Jaipur', desc:'Beat the crowds — watch the sun rise over Amber Fort and explore Hawa Mahal before any tourist buses arrive. Photography heaven.', price:699, max:8, date:'2026-07-12', time:'05:30', dur:'4 hours', cats:['History','Photography'], meet:'Hawa Mahal main gate', img:'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=400', guideIdx:3 },
  { title:'Kochi Backwater Sunrise Kayak', city:'Kochi', desc:'Kayak through the misty backwaters at sunrise, spot birds, visit a toddy shop and have fresh Kerala breakfast at a fisherman home.', price:899, max:6, date:'2026-07-15', time:'06:00', dur:'5 hours', cats:['Nature','Adventure'], meet:'Fort Kochi Beach parking lot', img:'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=400', guideIdx:2 },
  { title:'Delhi Old City Night Walk', city:'Delhi', desc:'Discover the magic of Chandni Chowk after dark — street food, perfume shops, light shows at mosques, and the most photogenic alleyways in India.', price:599, max:12, date:'2026-07-18', time:'19:30', dur:'3 hours', cats:['History','Street Food'], meet:'Red Fort metro gate 1', img:'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400', guideIdx:1 },
  { title:'Goa Hidden Beach Hopping', city:'Goa', desc:'Skip Baga and Calangute — visit 4 secret beaches only locals know, including one accessible only by boat. Includes fresh catch lunch.', price:1299, max:8, date:'2026-07-20', time:'08:00', dur:'7 hours', cats:['Beach','Nature','Adventure'], meet:'Panjim jetty', img:'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400', guideIdx:7 },
  { title:'Varanasi Dawn Boat and Aarti', city:'Varanasi', desc:'Row silently through dawn mist on the Ganga, watch morning rituals at the ghats, and evening Ganga Aarti front row.', price:799, max:8, date:'2026-07-22', time:'04:30', dur:'6 hours', cats:['Spirituality','Photography'], meet:'Dashashwamedh Ghat steps', img:'https://images.unsplash.com/photo-1561361058-c24e72565bb2?w=400', guideIdx:5 },
  { title:'Udaipur Lake Palace Boat Tour', city:'Udaipur', desc:'Float across Lake Pichola to Jag Mandir, explore the City Palace and watch the sunset paint the Aravalli hills gold.', price:999, max:6, date:'2026-07-25', time:'15:00', dur:'4 hours', cats:['Heritage','Photography'], meet:'City Palace jetty', img:'https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?w=400', guideIdx:6 },
  { title:'Bangalore Craft Beer Trail', city:'Bangalore', desc:"Explore the city's thriving microbrewery culture — visit 3 top craft breweries, understand the brewing process, and eat the best bar food in town.", price:1199, max:10, date:'2026-07-28', time:'17:00', dur:'4 hours', cats:['Food','Nightlife'], meet:'Indiranagar 100 Feet Road', img:'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400', guideIdx:4 },
];

const REELS_DATA = [
  { caption:'Golden hour at Gateway of India 🌅 #Mumbai #Travel', city:'Mumbai', type:'HIDDEN_GEM', video:'https://res.cloudinary.com/demo/video/upload/v1689832276/samples/sea-turtle.mp4', thumb:'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=400', likes:234, views:1892, guideIdx:0 },
  { caption:'Morning aarti at Dashashwamedh Ghat 🙏 #Varanasi #Spiritual', city:'Varanasi', type:'HIDDEN_GEM', video:'https://res.cloudinary.com/demo/video/upload/v1689832276/samples/elephants.mp4', thumb:'https://images.unsplash.com/photo-1561361058-c24e02aa6a72?w=400', likes:1203, views:9876, guideIdx:5 },
  { caption:'Amber Fort magic at sunrise ✨ #Jaipur #RoyalRajasthan', city:'Jaipur', type:'VIEWPOINT', video:'https://res.cloudinary.com/demo/video/upload/v1689832276/samples/cld-sample-video.mp4', thumb:'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=400', likes:567, views:4321, guideIdx:3 },
  { caption:'Backwaters of Kerala — pure peace 🌿 #Kochi #Kerala', city:'Kochi', type:'HIDDEN_GEM', video:'https://res.cloudinary.com/demo/video/upload/v1689832276/samples/dance-2.mp4', thumb:'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=400', likes:445, views:3210, guideIdx:2 },
  { caption:'Sunset at Chapora Fort 🏖️ #Goa #HiddenGem', city:'Goa', type:'VIEWPOINT', video:'https://res.cloudinary.com/demo/video/upload/v1689832276/samples/basketball.mp4', thumb:'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400', likes:891, views:7654, guideIdx:7 },
  { caption:'Street food trail in Chandni Chowk 🍢 #Delhi #FoodSpot', city:'Delhi', type:'FOOD_SPOT', video:'https://res.cloudinary.com/demo/video/upload/v1689832276/samples/sea-turtle.mp4', thumb:'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400', likes:332, views:2890, guideIdx:1 },
  { caption:'Lake Pichola at golden hour 💛 Udaipur is the most romantic city in India', city:'Udaipur', type:'VIEWPOINT', video:'https://res.cloudinary.com/demo/video/upload/v1689832276/samples/elephants.mp4', thumb:'https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?w=400', likes:678, views:5432, guideIdx:6 },
  { caption:'Filter coffee and dosas at MTR Bangalore 🫖 #Bangalore #BreakfastOfChampions', city:'Bangalore', type:'FOOD_SPOT', video:'https://res.cloudinary.com/demo/video/upload/v1689832276/samples/cld-sample-video.mp4', thumb:'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=400', likes:289, views:2100, guideIdx:4 },
];

const SEED_REVIEWS = [
  { rating: 5, comment: 'Absolutely incredible experience! Best tour I\'ve ever had. Knew every hidden spot.' },
  { rating: 5, comment: 'So knowledgeable and friendly. Made the trip 10x better than any guidebook could.' },
  { rating: 4, comment: 'Great experience, very passionate guide. Highly recommend!' },
  { rating: 5, comment: 'Worth every rupee. Will book again on my next visit!' },
  { rating: 5, comment: 'A true local expert. Took us places we\'d never have found on our own.' },
  { rating: 4, comment: 'Excellent guide, very punctual and accommodating. Great stories too.' },
  { rating: 5, comment: 'Life-changing experience. This is how travel should feel.' },
  { rating: 5, comment: 'Our guide was amazing — funny, smart, and passionate about their city.' },
];


const SEED_GROUP_TOURS = [
  {
    title: 'Mumbai Street Food Crawl 🍢',
    description: 'Explore Mumbai legendary street food scene — from Juhu beach bhel puri to Mohammad Ali Road kebabs. A guided walk through 8 iconic food stops with stories behind each dish.',
    city: 'Mumbai', date: '2026-06-15', startTime: '6:00 PM',
    duration: '3 hours', maxMembers: 10, pricePerPerson: 599,
    meetupPoint: 'Churchgate Station Exit 2',
    category: ['Food', 'Culture'],
    whatsappLink: 'https://chat.whatsapp.com/invite/mumbaifoodies',
    photos: [
      'https://images.unsplash.com/photo-1567337710282-00832b415979?w=600',
      'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600',
      'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=600',
      'https://images.unsplash.com/photo-1559847844-5315695dadae?w=600',
    ],
    guideIdx: 0,
  },
  {
    title: 'Jaipur Sunrise Photography Walk 📸',
    description: 'Catch the magical golden hour light at Hawa Mahal and Amber Fort. Perfect for photographers and travel bloggers. Bring your camera — every frame will be frame-worthy.',
    city: 'Jaipur', date: '2026-06-20', startTime: '5:30 AM',
    duration: '4 hours', maxMembers: 8, pricePerPerson: 799,
    meetupPoint: 'Hawa Mahal Main Gate',
    category: ['Photography', 'Heritage'],
    whatsappLink: 'https://chat.whatsapp.com/invite/jaipurphoto',
    photos: [
      'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=600',
      'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=600',
      'https://images.unsplash.com/photo-1524613032530-449a5d94c285?w=600',
      'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600',
    ],
    guideIdx: 3,
  },
  {
    title: 'Varanasi Ganga Aarti & Ghat Walk 🪔',
    description: 'Witness the world-famous Ganga Aarti ceremony from a private boat, followed by a guided walk through 7 ghats with stories of life, death and spirituality in the oldest city on Earth.',
    city: 'Varanasi', date: '2026-06-18', startTime: '5:00 AM',
    duration: '3 hours', maxMembers: 12, pricePerPerson: 499,
    meetupPoint: 'Dasaswamedh Ghat Steps',
    category: ['Culture', 'Heritage', 'Photography'],
    whatsappLink: 'https://chat.whatsapp.com/invite/varanasiaarti',
    photos: [
      'https://images.unsplash.com/photo-1561361058-c24e02aa6a72?w=600',
      'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=600',
      'https://images.unsplash.com/photo-1548013146-72479768bada?w=600',
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600',
    ],
    guideIdx: 5,
  },
  {
    title: 'Goa Hidden Beaches & Fort Trek 🏖️',
    description: 'Skip the tourist beaches. We explore Goa secret coves, ruined Portuguese forts and spice-scented villages that most visitors never find. Ends with sunset at Chapora Fort.',
    city: 'Goa', date: '2026-06-25', startTime: '8:00 AM',
    duration: 'Full Day', maxMembers: 8, pricePerPerson: 1299,
    meetupPoint: 'Mapusa Bus Stand',
    category: ['Adventure', 'Nature', 'Heritage'],
    whatsappLink: 'https://chat.whatsapp.com/invite/goahidden',
    photos: [
      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=600',
      'https://images.unsplash.com/photo-1587923371016-f68aa5b8e9be?w=600',
      'https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=600',
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=600',
    ],
    guideIdx: 7,
  },
  {
    title: 'Delhi Mughal Heritage Walk 🕌',
    description: 'From Humayun Tomb to Lodhi Garden to the lanes of Nizamuddin — a deep dive into Delhi Mughal soul with a historian guide. Includes chai and snack stops.',
    city: 'Delhi', date: '2026-07-01', startTime: '7:00 AM',
    duration: '4 hours', maxMembers: 10, pricePerPerson: 699,
    meetupPoint: 'Humayun Tomb Main Gate',
    category: ['Heritage', 'Culture', 'Photography'],
    whatsappLink: 'https://chat.whatsapp.com/invite/delhimughal',
    photos: [
      'https://images.unsplash.com/photo-1548013146-72479768bada?w=600',
      'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600',
      'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600',
      'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600',
    ],
    guideIdx: 1,
  },
  {
    title: 'Kochi Backwater Sunrise Kayak 🛶',
    description: 'Paddle through Kerala famous backwaters at sunrise — mirror-still water, fishing boats, coconut groves. No experience needed. Includes breakfast at a homestay after.',
    city: 'Kochi', date: '2026-06-22', startTime: '5:45 AM',
    duration: '3 hours', maxMembers: 6, pricePerPerson: 999,
    meetupPoint: 'Fort Kochi Jetty',
    category: ['Adventure', 'Nature'],
    whatsappLink: 'https://chat.whatsapp.com/invite/kochibackwater',
    photos: [
      'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=600',
      'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?w=600',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600',
      'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=600',
    ],
    guideIdx: 2,
  },
];

async function seed() {
  const db = require('./db');
  const { users, guideProfiles, travelerProfiles, groupTours, reels } = db;

  console.log('\n🌱 Seeding LocalLens database...\n');

  const passwordHash = await bcrypt.hash('Guide@1234', 12);
  const travHash = await bcrypt.hash('Travel@1234', 12);

  // Create traveller accounts
  const travellers = [];
  for (const t of [
    { name:'Demo Traveler', email:'traveler@demo.com', avatar:'https://i.pravatar.cc/150?img=20', hash: travHash },
    { name:'Rohan Mehta', email:'rohan@traveller.com', avatar:'https://i.pravatar.cc/150?img=21', hash: travHash },
    { name:'Ananya Das', email:'ananya@traveller.com', avatar:'https://i.pravatar.cc/150?img=22', hash: travHash },
    { name:'Nikhil Kapoor', email:'nikhil@traveller.com', avatar:'https://i.pravatar.cc/150?img=23', hash: travHash },
  ]) {
    try {
      const u = await users.create({ email:t.email, passwordHash:t.hash, fullName:t.name, avatarUrl:t.avatar, role:'TRAVELER' });
      await travelerProfiles.create(u.id);
      travellers.push(u);
      console.log('  ✓ Traveller:', t.name);
    } catch (e) {
      try { const ex = await users.findByEmail(t.email); if (ex) travellers.push(ex); } catch {}
      console.log('  - Traveller exists:', t.name);
    }
  }

  // Create guides
  const createdGuides = [];
  for (const g of GUIDES_DATA) {
    try {
      const u = await users.create({ email:g.email, passwordHash, fullName:g.name, avatarUrl:g.avatar, role:'GUIDE' });
      await travelerProfiles.create(u.id).catch(() => {});
      const guide = await guideProfiles.create({
        userId: u.id, bio: g.bio, city: g.city, country: 'India',
        languages: g.langs, expertiseTags: g.tags,
        isPhotographer: !!g.isPhotographer,
        hourlyRate: g.hourly, halfDayRate: g.half, fullDayRate: g.full,
        photographyRate: g.photographyRate || null,
        placesOneHour: g.placesOneHour, placesHalfDay: g.placesHalfDay, placesFullDay: g.placesFullDay,
        providesCab: !!g.providesCab, cabPricePerKm: g.cabPricePerKm || 0, cabFullDayPrice: g.cabFullDayPrice || 0,
        hotelRecommendations: g.hotelRecommendations, restaurantRecommendations: g.restaurantRecommendations,
      });
      await guideProfiles.update(guide.id, {
        latitude: g.lat + (Math.random()-0.5)*0.02,
        longitude: g.lng + (Math.random()-0.5)*0.02,
        isAvailable: g.available, avgRating: g.rating,
        totalReviews: g.reviews, totalBookings: g.bookings,
        walletBalance: Math.round(g.bookings * g.hourly * 0.9),
        totalEarnings: Math.round(g.bookings * g.hourly * 0.9),
      });
      createdGuides.push({ guide, user: u });
      console.log('  ✓ Guide:', g.name, 'in', g.city);
    } catch (e) {
      console.log('  - Guide exists:', g.name);
      try {
        const ex = await users.findByEmail(g.email);
        if (ex) { const gp = await guideProfiles.findByUserId(ex.id); if (gp) createdGuides.push({ guide: gp, user: ex }); }
      } catch {}
    }
  }

  // Seed reviews for each guide
  if (travellers.length > 0 && createdGuides.length > 0) {
    let pool = null;
    if (db.USE_PG) {
      try { const { Pool } = require('pg'); pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl:{ rejectUnauthorized:false } }); } catch {}
    }
    const { v4: uuidv4 } = require('uuid');
    for (let gi = 0; gi < createdGuides.length; gi++) {
      const { user: guideUser } = createdGuides[gi];
      const numReviews = 2 + (gi % 2);
      for (let ri = 0; ri < numReviews; ri++) {
        const reviewer = travellers[ri % travellers.length];
        if (!reviewer || reviewer.id === guideUser.id) continue;
        const rv = SEED_REVIEWS[(gi * 3 + ri) % SEED_REVIEWS.length];
        try {
          if (pool) {
            await pool.query(
              `INSERT INTO reviews(id,reviewer_id,reviewee_id,rating,comment,created_at) VALUES($1,$2,$3,$4,$5,NOW()) ON CONFLICT DO NOTHING`,
              [uuidv4(), reviewer.id, guideUser.id, rv.rating, rv.comment]
            );
          } else {
            const s = require('./db');
            if (s.reviews && s.reviews.create) await s.reviews.create({ reviewerId: reviewer.id, revieweeId: guideUser.id, rating: rv.rating, comment: rv.comment }).catch(() => {});
          }
          console.log(`  ✓ Review: ${reviewer.fullName} → ${guideUser.fullName}`);
        } catch {}
      }
    }
    if (pool) await pool.end().catch(() => {});
  }

  // Create group tours
  for (const t of TOURS_DATA) {
    try {
      const ge = createdGuides[t.guideIdx] || createdGuides[0];
      if (!ge) continue;
      const gp = await guideProfiles.findByUserId(ge.user.id);
      if (!gp) continue;
      await groupTours.create({ guideId:gp.id, title:t.title, description:t.desc, city:t.city, date:t.date, startTime:t.time, duration:t.dur, maxMembers:t.max, pricePerPerson:t.price, meetupPoint:t.meet, category:t.cats, coverImage:t.img });
      console.log('  ✓ Tour:', t.title);
    } catch (e) { console.log('  - Tour error:', e.message.slice(0,60)); }
  }

  // Create reels — skip if already seeded
  let shouldSeedReels = true;
  try {
    const existingReels = await reels.findByUser ? null : null; // check via db
    if (db.USE_PG) {
      const { Pool } = require('pg');
      const rp = new Pool({ connectionString: process.env.DATABASE_URL, ssl:{ rejectUnauthorized:false } });
      const rc = await rp.query('SELECT COUNT(*) as cnt FROM reels');
      await rp.end();
      if (parseInt(rc.rows[0]?.cnt) > 0) { shouldSeedReels = false; console.log('  - Reels already seeded, skipping'); }
    }
  } catch {}

  if (shouldSeedReels) {
    for (const r of REELS_DATA) {
      try {
        const ge = createdGuides[r.guideIdx] || createdGuides[0];
        if (!ge) continue;
        const reel = await reels.create({ userId:ge.user.id, videoUrl:r.video, thumbnailUrl:r.thumb, caption:r.caption, reelType:r.type, city:r.city, locationName:r.city });
        if (db.USE_PG) {
          try {
            const { Pool } = require('pg');
            const p2 = new Pool({ connectionString: process.env.DATABASE_URL, ssl:{ rejectUnauthorized:false } });
            const likes = Math.floor(Math.random()*80)+10;
            const views = Math.floor(Math.random()*500)+100;
            await p2.query('UPDATE reels SET likes_count=$1,views=$2 WHERE id=$3', [likes, views, reel.id]);
            await p2.end();
          } catch {}
        }
        console.log('  ✓ Reel:', r.caption.slice(0,50));
      } catch (e) { console.log('  - Reel error:', e.message.slice(0,60)); }
    }
  }

  // Seed group tours — skip if already seeded
  let shouldSeedTours = true;
  try {
    if (db.USE_PG) {
      const { Pool } = require('pg');
      const tp = new Pool({ connectionString: process.env.DATABASE_URL, ssl:{ rejectUnauthorized:false } });
      const tc = await tp.query('SELECT COUNT(*) as cnt FROM group_tours');
      await tp.end();
      if (parseInt(tc.rows[0]?.cnt) > 0) { shouldSeedTours = false; console.log('  - Group tours already seeded, skipping'); }
    }
  } catch {}

  if (shouldSeedTours) {
    for (const t of SEED_GROUP_TOURS) {
      try {
        const ge = createdGuides[t.guideIdx] || createdGuides[0];
        if (!ge) continue;
        const gp = await guideProfiles.findByUserId(ge.user.id);
        await groupTours.create({
          guideId: gp?.id || null,
          creatorId: ge.user.id,
          creatorType: 'GUIDE',
          title: t.title, description: t.description, city: t.city,
          date: t.date, startTime: t.startTime, duration: t.duration,
          maxMembers: t.maxMembers, pricePerPerson: t.pricePerPerson,
          meetupPoint: t.meetupPoint, category: t.category,
          whatsappLink: t.whatsappLink, photos: t.photos,
        });
        console.log('  ✓ Group tour:', t.title);
      } catch (e) { console.log('  - Tour error:', e.message.slice(0, 60)); }
    }
  }

  console.log('');
  console.log('Seeding complete!');
  console.log('📋 Demo Login Credentials:');
  console.log('   TRAVELER  → traveler@demo.com      | Travel@1234');
  console.log('   GUIDE 1   → arjun@guide.com        | Guide@1234  (Mumbai)');
  console.log('   GUIDE 2   → priya@guide.com        | Guide@1234  (Delhi)');
  console.log('   GUIDE 3   → rahul@guide.com        | Guide@1234  (Kochi)');
  console.log('   GUIDE 4   → sneha.guide@guide.com  | Guide@1234  (Jaipur)');
  console.log('   GUIDE 5   → vikram@guide.com       | Guide@1234  (Bangalore)');
  console.log('   GUIDE 6   → meera@guide.com        | Guide@1234  (Varanasi)');
  console.log('   GUIDE 7   → aditya@guide.com       | Guide@1234  (Udaipur)');
  console.log('   GUIDE 8   → kavya@guide.com        | Guide@1234  (Goa)');
  console.log('\n   All 8 guides visible on the map with real coordinates! 🗺️\n');
}

module.exports = { seed };

if (require.main === module) {
  seed().then(() => process.exit(0)).catch(err => { console.error('Seed error:', err); process.exit(1); });
}
