/**
 * LocalLens – Dual-mode Database (PostgreSQL + JSON fallback)
 * Set DATABASE_URL env var for PostgreSQL, otherwise uses JSON files.
 */
const fs = require('fs');
const path = require('path');
const USE_PG = !!(process.env.DATABASE_URL);
let pgPool = null;

if (USE_PG) {
  const { Pool } = require('pg');
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 10, idleTimeoutMillis: 30000,
  });
  console.log('🐘 PostgreSQL mode');
  let retries = 5;
  const testConnection = async () => {
    try {
      await pgPool.query('SELECT 1');
      console.log('PostgreSQL connected');
    } catch (err) {
      if (retries-- > 0) {
        console.log(`DB not ready, retrying in 3s... (${retries} left)`);
        setTimeout(testConnection, 3000);
      } else {
        console.error('Could not connect to PostgreSQL after 5 retries');
        process.exit(1);
      }
    }
  };
  testConnection();
} else {
  console.log('📦 JSON file mode (set DATABASE_URL for PostgreSQL)');
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
function now() { return new Date().toISOString(); }

async function query(sql, params=[]) {
  const client = await pgPool.connect();
  try { const r = await client.query(sql, params); return r.rows; }
  finally { client.release(); }
}

const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
function loadStore(name) {
  const file = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(file)) { fs.writeFileSync(file, '[]'); return []; }
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}
function saveStore(name, data) {
  fs.writeFileSync(path.join(DATA_DIR, `${name}.json`), JSON.stringify(data, null, 2));
}

// Schema bootstrap
async function initSchema() {
  if (!USE_PG) return;
  const sql = `
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,phone TEXT,password_hash TEXT NOT NULL,full_name TEXT NOT NULL,avatar_url TEXT,role TEXT DEFAULT 'TRAVELER',is_active BOOLEAN DEFAULT true,is_email_verified BOOLEAN DEFAULT false,referral_code TEXT,referred_by TEXT,created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS guide_profiles(id TEXT PRIMARY KEY,user_id TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE,bio TEXT DEFAULT '',city TEXT DEFAULT '',country TEXT DEFAULT 'India',languages TEXT[] DEFAULT '{}',expertise_tags TEXT[] DEFAULT '{}',is_photographer BOOLEAN DEFAULT false,is_available BOOLEAN DEFAULT false,hourly_rate NUMERIC DEFAULT 500,half_day_rate NUMERIC DEFAULT 2000,full_day_rate NUMERIC DEFAULT 3500,photography_rate NUMERIC,total_bookings INT DEFAULT 0,total_earnings NUMERIC DEFAULT 0,avg_rating NUMERIC DEFAULT 0,total_reviews INT DEFAULT 0,latitude NUMERIC,longitude NUMERIC,wallet_balance NUMERIC DEFAULT 0,verification_status TEXT DEFAULT 'UNVERIFIED',cover_image TEXT,is_blacklisted BOOLEAN DEFAULT false,created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS follows(id TEXT PRIMARY KEY,follower_id TEXT REFERENCES users(id) ON DELETE CASCADE,following_id TEXT REFERENCES users(id) ON DELETE CASCADE,status TEXT DEFAULT 'PENDING',created_at TIMESTAMPTZ DEFAULT NOW(),UNIQUE(follower_id,following_id));
    CREATE TABLE IF NOT EXISTS traveler_profiles(id TEXT PRIMARY KEY,user_id TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE,interests TEXT[] DEFAULT '{}',home_city TEXT,total_tours_booked INT DEFAULT 0,loyalty_points INT DEFAULT 0,wallet_balance NUMERIC DEFAULT 0,created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS bookings(id TEXT PRIMARY KEY,guide_id TEXT REFERENCES users(id),traveler_id TEXT REFERENCES users(id),booking_type TEXT DEFAULT 'PRIVATE',duration TEXT DEFAULT 'ONE_HOUR',status TEXT DEFAULT 'PENDING',date TEXT,start_time TEXT,meetup_location TEXT DEFAULT '',special_requests TEXT DEFAULT '',base_price NUMERIC DEFAULT 0,platform_fee NUMERIC DEFAULT 0,total_amount NUMERIC DEFAULT 0,payment_status TEXT DEFAULT 'PENDING',escrow_released BOOLEAN DEFAULT false,tour_completed_at TIMESTAMPTZ,created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS group_tours(id TEXT PRIMARY KEY,guide_id TEXT REFERENCES guide_profiles(id),title TEXT NOT NULL,description TEXT DEFAULT '',city TEXT DEFAULT '',date TEXT,start_time TEXT,duration TEXT DEFAULT '3 hours',max_members INT DEFAULT 6,price_per_person NUMERIC DEFAULT 0,meetup_point TEXT DEFAULT '',meetup_lat NUMERIC,meetup_lng NUMERIC,itinerary JSONB DEFAULT '[]',category TEXT[] DEFAULT '{}',cover_image TEXT,is_active BOOLEAN DEFAULT true,created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS group_tour_members(id TEXT PRIMARY KEY,group_tour_id TEXT REFERENCES group_tours(id) ON DELETE CASCADE,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,joined_at TIMESTAMPTZ DEFAULT NOW(),payment_status TEXT DEFAULT 'PENDING',UNIQUE(group_tour_id,user_id));
    CREATE TABLE IF NOT EXISTS reels(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,video_url TEXT NOT NULL,thumbnail_url TEXT,caption TEXT DEFAULT '',reel_type TEXT DEFAULT 'GENERAL',city TEXT DEFAULT '',location_name TEXT DEFAULT '',latitude NUMERIC,longitude NUMERIC,views INT DEFAULT 0,likes_count INT DEFAULT 0,comments_count INT DEFAULT 0,is_active BOOLEAN DEFAULT true,created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS reel_likes(id TEXT PRIMARY KEY,reel_id TEXT REFERENCES reels(id) ON DELETE CASCADE,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,created_at TIMESTAMPTZ DEFAULT NOW(),UNIQUE(reel_id,user_id));
    CREATE TABLE IF NOT EXISTS reel_comments(id TEXT PRIMARY KEY,reel_id TEXT REFERENCES reels(id) ON DELETE CASCADE,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,content TEXT NOT NULL,created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,booking_id TEXT REFERENCES bookings(id) ON DELETE CASCADE,sender_id TEXT REFERENCES users(id),receiver_id TEXT REFERENCES users(id),content TEXT NOT NULL,is_read BOOLEAN DEFAULT false,read_at TIMESTAMPTZ,created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS reviews(id TEXT PRIMARY KEY,booking_id TEXT UNIQUE REFERENCES bookings(id),reviewer_id TEXT REFERENCES users(id),reviewee_id TEXT REFERENCES users(id),rating NUMERIC NOT NULL,comment TEXT DEFAULT '',photos TEXT[] DEFAULT '{}',guide_response TEXT,created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS guide_availability(id TEXT PRIMARY KEY,guide_id TEXT REFERENCES guide_profiles(id) ON DELETE CASCADE,date DATE NOT NULL,start_time TEXT NOT NULL,end_time TEXT DEFAULT '',is_booked BOOLEAN DEFAULT false,created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS bucket_list(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,city TEXT NOT NULL,description TEXT DEFAULT '',is_completed BOOLEAN DEFAULT false,completed_at TIMESTAMPTZ,created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS direct_messages(id TEXT PRIMARY KEY,sender_id TEXT REFERENCES users(id) ON DELETE CASCADE,receiver_id TEXT REFERENCES users(id) ON DELETE CASCADE,content TEXT NOT NULL,is_read BOOLEAN DEFAULT false,read_at TIMESTAMPTZ,created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS notifications(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,body TEXT DEFAULT '',type TEXT DEFAULT 'GENERAL',data JSONB DEFAULT '{}',is_read BOOLEAN DEFAULT false,created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS hidden_gems(id TEXT PRIMARY KEY,guide_id TEXT REFERENCES guide_profiles(id) ON DELETE CASCADE,name TEXT NOT NULL,description TEXT DEFAULT '',category TEXT DEFAULT '',city TEXT DEFAULT '',latitude NUMERIC DEFAULT 0,longitude NUMERIC DEFAULT 0,is_locked BOOLEAN DEFAULT true,photos TEXT[] DEFAULT '{}',created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS wallet_transactions(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,amount NUMERIC NOT NULL,type TEXT DEFAULT 'CREDIT',description TEXT DEFAULT '',booking_id TEXT,created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS sos_alerts(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),latitude NUMERIC,longitude NUMERIC,booking_id TEXT,message TEXT DEFAULT 'SOS Alert',is_resolved BOOLEAN DEFAULT false,created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE INDEX IF NOT EXISTS idx_dm_sender ON direct_messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_dm_receiver ON direct_messages(receiver_id);
    CREATE INDEX IF NOT EXISTS idx_wallet_user ON wallet_transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
    ALTER TABLE guide_profiles ADD COLUMN IF NOT EXISTS cover_image TEXT;
    ALTER TABLE guide_profiles ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT false;
    ALTER TABLE guide_profiles ADD COLUMN IF NOT EXISTS places_one_hour TEXT DEFAULT '';
    ALTER TABLE guide_profiles ADD COLUMN IF NOT EXISTS places_half_day TEXT DEFAULT '';
    ALTER TABLE guide_profiles ADD COLUMN IF NOT EXISTS places_full_day TEXT DEFAULT '';
    ALTER TABLE guide_profiles ADD COLUMN IF NOT EXISTS provides_cab BOOLEAN DEFAULT false;
    ALTER TABLE guide_profiles ADD COLUMN IF NOT EXISTS cab_price_per_km NUMERIC DEFAULT 0;
    ALTER TABLE guide_profiles ADD COLUMN IF NOT EXISTS cab_full_day_price NUMERIC DEFAULT 0;
    ALTER TABLE guide_profiles ADD COLUMN IF NOT EXISTS hotel_recommendations TEXT DEFAULT '';
    ALTER TABLE guide_profiles ADD COLUMN IF NOT EXISTS restaurant_recommendations TEXT DEFAULT '';
    ALTER TABLE group_tours ADD COLUMN IF NOT EXISTS whatsapp_link TEXT DEFAULT '';
    ALTER TABLE group_tours ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';
    ALTER TABLE group_tours ADD COLUMN IF NOT EXISTS creator_id TEXT REFERENCES users(id);
    ALTER TABLE group_tours ADD COLUMN IF NOT EXISTS creator_type TEXT DEFAULT 'TRAVELER';
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS number_of_people INT DEFAULT 1;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hotel_preference TEXT DEFAULT '';
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS restaurant_preference TEXT DEFAULT '';
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
  `;
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  console.log('PostgreSQL schema ready');
}

// USERS
const users = {
  async findAll() {
    if (USE_PG) return (await query('SELECT * FROM users')).map(r=>({id:r.id,email:r.email,phone:r.phone,passwordHash:r.password_hash,fullName:r.full_name,avatarUrl:r.avatar_url,role:r.role,isActive:r.is_active,isEmailVerified:r.is_email_verified,referralCode:r.referral_code,createdAt:r.created_at,updatedAt:r.updated_at}));
    return loadStore('users');
  },
  async findById(id) {
    if (!id) return null;
    if (USE_PG) { const r=(await query('SELECT * FROM users WHERE id=$1',[id]))[0]; return r?{id:r.id,email:r.email,phone:r.phone,passwordHash:r.password_hash,fullName:r.full_name,avatarUrl:r.avatar_url,role:r.role,isActive:r.is_active,isEmailVerified:r.is_email_verified,referralCode:r.referral_code,createdAt:r.created_at}:null; }
    return loadStore('users').find(u=>u.id===id)||null;
  },
  async findByEmail(email) {
    if (!email) return null;
    if (USE_PG) { const r=(await query('SELECT * FROM users WHERE LOWER(email)=LOWER($1)',[email]))[0]; return r?{id:r.id,email:r.email,phone:r.phone,passwordHash:r.password_hash,fullName:r.full_name,avatarUrl:r.avatar_url,role:r.role,isActive:r.is_active,isEmailVerified:r.is_email_verified,referralCode:r.referral_code,createdAt:r.created_at}:null; }
    return loadStore('users').find(u=>u.email?.toLowerCase()===email?.toLowerCase())||null;
  },
  async create(data) {
    const id=uuid(), rc=uuid().slice(0,8).toUpperCase();
    if (USE_PG) { const r=(await query('INSERT INTO users(id,email,phone,password_hash,full_name,avatar_url,role,referral_code) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[id,data.email,data.phone||null,data.passwordHash,data.fullName,data.avatarUrl||null,data.role||'TRAVELER',rc]))[0]; return {id:r.id,email:r.email,phone:r.phone,passwordHash:r.password_hash,fullName:r.full_name,avatarUrl:r.avatar_url,role:r.role,isActive:r.is_active,referralCode:r.referral_code,createdAt:r.created_at}; }
    const u={id,email:data.email,phone:data.phone||null,passwordHash:data.passwordHash,fullName:data.fullName,avatarUrl:data.avatarUrl||null,role:data.role||'TRAVELER',isActive:true,isEmailVerified:false,referralCode:rc,createdAt:now(),updatedAt:now()};
    const s=loadStore('users'); s.push(u); saveStore('users',s); return u;
  },
  async update(id,upd) {
    if (USE_PG) {
      const map={fullName:'full_name',avatarUrl:'avatar_url',phone:'phone',role:'role',passwordHash:'password_hash',isActive:'is_active'};
      const f=[],v=[]; let i=1;
      for(const[k,val]of Object.entries(upd)){const c=map[k];if(!c)continue;f.push(`${c}=$${i++}`);v.push(val);}
      f.push('updated_at=NOW()'); v.push(id);
      const r=(await query(`UPDATE users SET ${f.join(',')} WHERE id=$${i} RETURNING *`,v))[0];
      return r?{id:r.id,email:r.email,phone:r.phone,fullName:r.full_name,avatarUrl:r.avatar_url,role:r.role,isActive:r.is_active,createdAt:r.created_at}:null;
    }
    const s=loadStore('users'); const idx=s.findIndex(u=>u.id===id); if(idx===-1)return null;
    s[idx]={...s[idx],...upd,updatedAt:now()}; saveStore('users',s); return s[idx];
  },
};

// ── GUIDE PROFILES ──
const _gp = (r,u,extra={}) => r?{id:r.id,userId:r.user_id||r.userId,bio:r.bio,city:r.city||r.city,country:r.country,languages:r.languages||[],expertiseTags:r.expertise_tags||r.expertiseTags||[],isPhotographer:r.is_photographer||r.isPhotographer,isAvailable:r.is_available||r.isAvailable,hourlyRate:parseFloat(r.hourly_rate||r.hourlyRate)||0,halfDayRate:parseFloat(r.half_day_rate||r.halfDayRate)||0,fullDayRate:parseFloat(r.full_day_rate||r.fullDayRate)||0,photographyRate:r.photography_rate||r.photographyRate?parseFloat(r.photography_rate||r.photographyRate):null,totalBookings:r.total_bookings||r.totalBookings||0,totalEarnings:parseFloat(r.total_earnings||r.totalEarnings)||0,avgRating:parseFloat(r.avg_rating||r.avgRating)||0,totalReviews:r.total_reviews||r.totalReviews||0,latitude:r.latitude?parseFloat(r.latitude):null,longitude:r.longitude?parseFloat(r.longitude):null,walletBalance:parseFloat(r.wallet_balance||r.walletBalance)||0,verificationStatus:r.verification_status||r.verificationStatus,coverImage:r.cover_image||r.coverImage||null,isBlacklisted:r.is_blacklisted||r.isBlacklisted||false,distance:extra.distance||null,placesOneHour:r.places_one_hour||r.placesOneHour||'',placesHalfDay:r.places_half_day||r.placesHalfDay||'',placesFullDay:r.places_full_day||r.placesFullDay||'',providesCab:!!(r.provides_cab||r.providesCab),cabPricePerKm:parseFloat(r.cab_price_per_km||r.cabPricePerKm)||0,cabFullDayPrice:parseFloat(r.cab_full_day_price||r.cabFullDayPrice)||0,hotelRecommendations:r.hotel_recommendations||r.hotelRecommendations||'',restaurantRecommendations:r.restaurant_recommendations||r.restaurantRecommendations||'',createdAt:r.created_at||r.createdAt,user:u||null}:null;
const guideProfiles = {
  async _eu(g) {
    if(!g)return null;
    const u=await users.findById(g.userId);
    return {...g,user:u?{id:u.id,fullName:u.fullName,avatarUrl:u.avatarUrl,email:u.email,createdAt:u.createdAt}:null};
  },
  async findMany(q={}) {
    const {city,search,minPrice,maxPrice,rating,isAvailable,lat,lng,radius=50,page=1,limit=12}=q;
    if(USE_PG){
      let sql=`SELECT g.*,u.full_name,u.avatar_url,u.email,u.created_at as uc`;
      const p=[]; let i=1;
      if(lat&&lng){
        sql+=`,ROUND((6371*acos(LEAST(1,cos(radians($${i++}))*cos(radians(g.latitude))*cos(radians(g.longitude)-radians($${i++}))+sin(radians($${i++}))*sin(radians(g.latitude)))))::numeric,1) as distance`;
        p.push(parseFloat(lat),parseFloat(lng),parseFloat(lat));
      }
      sql+=` FROM guide_profiles g JOIN users u ON u.id=g.user_id WHERE 1=1`;
      if(search){sql+=` AND (LOWER(g.city) LIKE LOWER($${i++}) OR LOWER(u.full_name) LIKE LOWER($${i++}) OR g.expertise_tags::text ILIKE $${i++} OR LOWER(g.bio) LIKE LOWER($${i++}))`;const t=`%${search}%`;p.push(t,t,t,t);}
      else if(city){sql+=` AND LOWER(g.city) LIKE LOWER($${i++})`;p.push(`%${city}%`);}
      if(minPrice){sql+=` AND g.hourly_rate>=$${i++}`;p.push(parseFloat(minPrice));}
      if(maxPrice){sql+=` AND g.hourly_rate<=$${i++}`;p.push(parseFloat(maxPrice));}
      if(rating){sql+=` AND g.avg_rating>=$${i++}`;p.push(parseFloat(rating));}
      if(isAvailable==='true')sql+=` AND g.is_available=true`;
      if(lat&&lng){sql+=` AND g.latitude IS NOT NULL AND g.longitude IS NOT NULL AND (6371*acos(LEAST(1,cos(radians($${i++}))*cos(radians(g.latitude))*cos(radians(g.longitude)-radians($${i++}))+sin(radians($${i++}))*sin(radians(g.latitude)))))<$${i++}`;p.push(parseFloat(lat),parseFloat(lng),parseFloat(lat),parseFloat(radius));}
      sql+= lat&&lng ? ` ORDER BY distance ASC` : ` ORDER BY g.avg_rating DESC,g.total_bookings DESC`;
      sql+=` LIMIT $${i++} OFFSET $${i++}`;
      p.push(parseInt(limit),(parseInt(page)-1)*parseInt(limit));
      const rows=await query(sql,p);
      return rows.map(r=>_gp(r,{id:r.user_id,fullName:r.full_name,avatarUrl:r.avatar_url,email:r.email,createdAt:r.uc},{distance:r.distance||null}));
    }
    let s=loadStore('guide_profiles');
    if(search)s=s.filter(g=>g.city?.toLowerCase().includes(search.toLowerCase())||g.bio?.toLowerCase().includes(search.toLowerCase())||(g.expertiseTags||[]).join(' ').toLowerCase().includes(search.toLowerCase()));
    else if(city)s=s.filter(g=>g.city?.toLowerCase().includes(city.toLowerCase()));
    if(minPrice)s=s.filter(g=>g.hourlyRate>=parseFloat(minPrice));
    if(maxPrice)s=s.filter(g=>g.hourlyRate<=parseFloat(maxPrice));
    if(rating)s=s.filter(g=>g.avgRating>=parseFloat(rating));
    if(isAvailable==='true')s=s.filter(g=>g.isAvailable===true);
    const skip=(parseInt(page)-1)*parseInt(limit);
    return Promise.all(s.slice(skip,skip+parseInt(limit)).map(g=>this._eu(g)));
  },
  async countMany(q={}) {
    if(USE_PG){const all=await this.findMany({...q,page:1,limit:10000});return all.length;}
    return (await this.findMany({...q,page:1,limit:10000})).length;
  },
  async findAll() { return this.findMany({page:1,limit:1000}); },
  async findById(id) {
    if(!id)return null;
    if(USE_PG){const r=(await query(`SELECT g.*,u.full_name,u.avatar_url,u.email,u.created_at as uc FROM guide_profiles g JOIN users u ON u.id=g.user_id WHERE g.id=$1`,[id]))[0]; return r?_gp(r,{id:r.user_id,fullName:r.full_name,avatarUrl:r.avatar_url,email:r.email,createdAt:r.uc}):null;}
    return this._eu(loadStore('guide_profiles').find(g=>g.id===id)||null);
  },
  async findByUserId(uid) {
    if(!uid)return null;
    if(USE_PG){const r=(await query(`SELECT g.*,u.full_name,u.avatar_url,u.email,u.created_at as uc FROM guide_profiles g JOIN users u ON u.id=g.user_id WHERE g.user_id=$1`,[uid]))[0]; return r?_gp(r,{id:r.user_id,fullName:r.full_name,avatarUrl:r.avatar_url,email:r.email,createdAt:r.uc}):null;}
    return this._eu(loadStore('guide_profiles').find(g=>g.userId===uid)||null);
  },
  async create(data) {
    if(USE_PG){
      const id=uuid();
      await query(`INSERT INTO guide_profiles(id,user_id,bio,city,country,languages,expertise_tags,is_photographer,hourly_rate,half_day_rate,full_day_rate,photography_rate,places_one_hour,places_half_day,places_full_day,provides_cab,cab_price_per_km,cab_full_day_price,hotel_recommendations,restaurant_recommendations) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,[id,data.userId,data.bio||'',data.city||'',data.country||'India',data.languages||[],data.expertiseTags||[],!!data.isPhotographer,parseFloat(data.hourlyRate)||500,parseFloat(data.halfDayRate)||2000,parseFloat(data.fullDayRate)||3500,data.photographyRate?parseFloat(data.photographyRate):null,data.placesOneHour||'',data.placesHalfDay||'',data.placesFullDay||'',!!data.providesCab,parseFloat(data.cabPricePerKm)||0,parseFloat(data.cabFullDayPrice)||0,data.hotelRecommendations||'',data.restaurantRecommendations||'']);
      return this.findById(id);
    }
    const s=loadStore('guide_profiles');
    if(s.find(g=>g.userId===data.userId))throw new Error('Guide profile already exists');
    const g={id:uuid(),userId:data.userId,bio:data.bio||'',city:data.city||'',country:data.country||'India',languages:data.languages||[],expertiseTags:data.expertiseTags||[],isPhotographer:!!data.isPhotographer,isAvailable:false,hourlyRate:parseFloat(data.hourlyRate)||500,halfDayRate:parseFloat(data.halfDayRate)||2000,fullDayRate:parseFloat(data.fullDayRate)||3500,photographyRate:data.photographyRate?parseFloat(data.photographyRate):null,totalBookings:0,totalEarnings:0,avgRating:0,totalReviews:0,latitude:null,longitude:null,walletBalance:0,verificationStatus:'UNVERIFIED',placesOneHour:data.placesOneHour||'',placesHalfDay:data.placesHalfDay||'',placesFullDay:data.placesFullDay||'',providesCab:!!data.providesCab,cabPricePerKm:parseFloat(data.cabPricePerKm)||0,cabFullDayPrice:parseFloat(data.cabFullDayPrice)||0,hotelRecommendations:data.hotelRecommendations||'',restaurantRecommendations:data.restaurantRecommendations||'',createdAt:now(),updatedAt:now()};
    s.push(g); saveStore('guide_profiles',s); return this._eu(g);
  },
  async update(id,upd) {
    if(USE_PG){
      const map={bio:'bio',city:'city',country:'country',languages:'languages',expertiseTags:'expertise_tags',isPhotographer:'is_photographer',isAvailable:'is_available',hourlyRate:'hourly_rate',halfDayRate:'half_day_rate',fullDayRate:'full_day_rate',photographyRate:'photography_rate',totalBookings:'total_bookings',totalEarnings:'total_earnings',avgRating:'avg_rating',totalReviews:'total_reviews',latitude:'latitude',longitude:'longitude',walletBalance:'wallet_balance',coverImage:'cover_image',isBlacklisted:'is_blacklisted',placesOneHour:'places_one_hour',placesHalfDay:'places_half_day',placesFullDay:'places_full_day',providesCab:'provides_cab',cabPricePerKm:'cab_price_per_km',cabFullDayPrice:'cab_full_day_price',hotelRecommendations:'hotel_recommendations',restaurantRecommendations:'restaurant_recommendations'};
      const f=[],v=[]; let i=1;
      for(const[k,val]of Object.entries(upd)){const c=map[k];if(!c)continue;f.push(`${c}=$${i++}`);v.push(val);}
      if(!f.length)return this.findById(id);
      f.push('updated_at=NOW()'); v.push(id);
      await query(`UPDATE guide_profiles SET ${f.join(',')} WHERE id=$${i}`,v);
      return this.findById(id);
    }
    const s=loadStore('guide_profiles'); const idx=s.findIndex(g=>g.id===id); if(idx===-1)return null;
    s[idx]={...s[idx],...upd,updatedAt:now()}; saveStore('guide_profiles',s); return this._eu(s[idx]);
  },
  async updateByUserId(uid,upd) {
    if(USE_PG){const g=await this.findByUserId(uid);if(!g)return null;return this.update(g.id,upd);}
    const s=loadStore('guide_profiles'); const idx=s.findIndex(g=>g.userId===uid); if(idx===-1)return null;
    s[idx]={...s[idx],...upd,updatedAt:now()}; saveStore('guide_profiles',s); return this._eu(s[idx]);
  },
  async recalcRating(uid) {
    const all=await reviews.findByReviewee(uid); if(!all.length)return;
    const avg=all.reduce((s,r)=>s+r.rating,0)/all.length;
    await this.updateByUserId(uid,{avgRating:Math.round(avg*10)/10,totalReviews:all.length});
  },
};

// ── TRAVELER PROFILES ──
const travelerProfiles = {
  async findByUserId(uid) {
    if(USE_PG){const r=(await query('SELECT * FROM traveler_profiles WHERE user_id=$1',[uid]))[0]; return r?{id:r.id,userId:r.user_id,interests:r.interests||[],homeCity:r.home_city,totalToursBooked:r.total_tours_booked||0,loyaltyPoints:r.loyalty_points||0,walletBalance:parseFloat(r.wallet_balance)||0,createdAt:r.created_at}:null;}
    return loadStore('traveler_profiles').find(t=>t.userId===uid)||null;
  },
  async create(uid) {
    const ex=await this.findByUserId(uid); if(ex)return ex;
    if(USE_PG){const r=(await query('INSERT INTO traveler_profiles(id,user_id) VALUES($1,$2) RETURNING *',[uuid(),uid]))[0]; return {id:r.id,userId:r.user_id,interests:[],totalToursBooked:0,loyaltyPoints:0,walletBalance:0,createdAt:r.created_at};}
    const s=loadStore('traveler_profiles'); const p={id:uuid(),userId:uid,interests:[],homeCity:null,totalToursBooked:0,loyaltyPoints:0,walletBalance:0,createdAt:now(),updatedAt:now()}; s.push(p); saveStore('traveler_profiles',s); return p;
  },
  async update(uid,upd) {
    if(USE_PG){
      const map={totalToursBooked:'total_tours_booked',loyaltyPoints:'loyalty_points',walletBalance:'wallet_balance',homeCity:'home_city',interests:'interests'};
      const f=[],v=[]; let i=1;
      for(const[k,val]of Object.entries(upd)){const c=map[k];if(!c)continue;f.push(`${c}=$${i++}`);v.push(val);}
      if(!f.length)return this.findByUserId(uid);
      f.push('updated_at=NOW()'); v.push(uid);
      await query(`UPDATE traveler_profiles SET ${f.join(',')} WHERE user_id=$${i}`,v);
      return this.findByUserId(uid);
    }
    const s=loadStore('traveler_profiles'); const idx=s.findIndex(t=>t.userId===uid); if(idx===-1)return null;
    s[idx]={...s[idx],...upd,updatedAt:now()}; saveStore('traveler_profiles',s); return s[idx];
  },
};

// ── BOOKINGS ──
const _eb = async (b) => {
  if(!b)return null;
  const [g,t]=await Promise.all([users.findById(b.guideId||b.guide_id),users.findById(b.travelerId||b.traveler_id)]);
  return {...b,guideId:b.guideId||b.guide_id,travelerId:b.travelerId||b.traveler_id,bookingType:b.bookingType||b.booking_type,startTime:b.startTime||b.start_time,meetupLocation:b.meetupLocation||b.meetup_location,specialRequests:b.specialRequests||b.special_requests,basePrice:parseFloat(b.basePrice||b.base_price)||0,platformFee:parseFloat(b.platformFee||b.platform_fee)||0,totalAmount:parseFloat(b.totalAmount||b.total_amount)||0,paymentStatus:b.paymentStatus||b.payment_status,escrowReleased:b.escrowReleased||b.escrow_released,numberOfPeople:parseInt(b.numberOfPeople||b.number_of_people)||1,hotelPreference:b.hotelPreference||b.hotel_preference||'',restaurantPreference:b.restaurantPreference||b.restaurant_preference||'',createdAt:b.createdAt||b.created_at,updatedAt:b.updatedAt||b.updated_at,guide:g?{id:g.id,fullName:g.fullName,avatarUrl:g.avatarUrl}:null,traveler:t?{id:t.id,fullName:t.fullName,avatarUrl:t.avatarUrl}:null};
};
const bookings = {
  async findById(id) {
    if(USE_PG){const r=(await query('SELECT * FROM bookings WHERE id=$1',[id]))[0]; return r?_eb(r):null;}
    return _eb(loadStore('bookings').find(b=>b.id===id)||null);
  },
  async findMany(filter={}) {
    if(USE_PG){
      let sql='SELECT * FROM bookings WHERE 1=1'; const p=[]; let i=1;
      if(filter.guideId){sql+=` AND guide_id=$${i++}`;p.push(filter.guideId);}
      if(filter.travelerId){sql+=` AND traveler_id=$${i++}`;p.push(filter.travelerId);}
      if(filter.status){sql+=` AND status=$${i++}`;p.push(filter.status);}
      sql+=' ORDER BY created_at DESC';
      const rows=await query(sql,p); return Promise.all(rows.map(_eb));
    }
    let s=loadStore('bookings');
    if(filter.guideId)s=s.filter(b=>b.guideId===filter.guideId);
    if(filter.travelerId)s=s.filter(b=>b.travelerId===filter.travelerId);
    if(filter.status)s=s.filter(b=>b.status===filter.status);
    s=s.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    return Promise.all(s.map(_eb));
  },
  async create(data) {
    const id=uuid();
    if(USE_PG){await query('INSERT INTO bookings(id,guide_id,traveler_id,booking_type,duration,date,start_time,meetup_location,special_requests,base_price,platform_fee,total_amount,number_of_people,hotel_preference,restaurant_preference) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)',[id,data.guideId,data.travelerId,data.bookingType||'PRIVATE',data.duration||'ONE_HOUR',data.date,data.startTime,data.meetupLocation||'',data.specialRequests||'',data.basePrice||0,data.platformFee||0,data.totalAmount||0,data.numberOfPeople||1,data.hotelPreference||'',data.restaurantPreference||'']);return this.findById(id);}
    const s=loadStore('bookings'); const b={id,...data,status:'PENDING',paymentStatus:'PENDING',escrowReleased:false,createdAt:now(),updatedAt:now()}; s.push(b); saveStore('bookings',s); return _eb(b);
  },
  async updateStatus(id,status) {
    if(USE_PG){await query('UPDATE bookings SET status=$1,updated_at=NOW() WHERE id=$2',[status,id]);return this.findById(id);}
    const s=loadStore('bookings'); const idx=s.findIndex(b=>b.id===id); if(idx===-1)return null;
    s[idx]={...s[idx],status,updatedAt:now()}; saveStore('bookings',s); return _eb(s[idx]);
  },
  async complete(id) {
    const b=await this.findById(id); if(!b)return null;
    if(USE_PG)await query('UPDATE bookings SET status=$1,escrow_released=$2,tour_completed_at=NOW(),updated_at=NOW() WHERE id=$3',['COMPLETED',true,id]);
    else{const s=loadStore('bookings');const idx=s.findIndex(x=>x.id===id);s[idx]={...s[idx],status:'COMPLETED',escrowReleased:true,tourCompletedAt:now(),updatedAt:now()};saveStore('bookings',s);}
    const earn=(b.basePrice||0)*0.9; const g=await guideProfiles.findByUserId(b.guideId);
    if(g){await guideProfiles.update(g.id,{walletBalance:(g.walletBalance||0)+earn,totalEarnings:(g.totalEarnings||0)+earn,totalBookings:(g.totalBookings||0)+1});await walletTransactions.create({userId:b.guideId,amount:earn,type:'CREDIT',description:'Tour completion earnings',bookingId:id});}
    const tp=await travelerProfiles.findByUserId(b.travelerId);
    if(tp)await travelerProfiles.update(b.travelerId,{totalToursBooked:(tp.totalToursBooked||0)+1,loyaltyPoints:(tp.loyaltyPoints||0)+Math.floor((b.totalAmount||0)/100)});
    return this.findById(id);
  },
};

// ── GROUP TOURS ──
const _enrichTour = async(t) => {
  if(!t)return null;
  const guide=await guideProfiles.findById(t.guideId||t.guide_id);
  const mems=USE_PG?await query(`SELECT gtm.*,u.full_name,u.avatar_url FROM group_tour_members gtm JOIN users u ON u.id=gtm.user_id WHERE gtm.group_tour_id=$1`,[t.id]):loadStore('group_tour_members').filter(m=>m.groupTourId===t.id);
  const members=USE_PG?mems.map(m=>({id:m.id,userId:m.user_id,user:{id:m.user_id,fullName:m.full_name,avatarUrl:m.avatar_url}})):await Promise.all(mems.map(async m=>{const u=await users.findById(m.userId);return{...m,user:u?{id:u.id,fullName:u.fullName,avatarUrl:u.avatarUrl}:null};}));
  const base={...t,guideId:t.guideId||t.guide_id,startTime:t.startTime||t.start_time,maxMembers:t.maxMembers||t.max_members,pricePerPerson:parseFloat(t.pricePerPerson||t.price_per_person)||0,meetupPoint:t.meetupPoint||t.meetup_point,meetupLat:t.meetupLat||t.meetup_lat,meetupLng:t.meetupLng||t.meetup_lng,coverImage:t.coverImage||t.cover_image,isActive:t.isActive!==undefined?t.isActive:t.is_active,createdAt:t.createdAt||t.created_at,whatsappLink:t.whatsapp_link||t.whatsappLink||'',photos:t.photos||[],creatorId:t.creator_id||t.creatorId||null,creatorType:t.creator_type||t.creatorType||'TRAVELER'};
  return{...base,guide,members,_count:{members:members.length}};
};
const groupTours = {
  async findMany(q={}) {
    const {city,minPrice,maxPrice}=q;
    if(USE_PG){
      let sql=`SELECT * FROM group_tours WHERE is_active=true`; const p=[]; let i=1;
      if(city){sql+=` AND LOWER(city) LIKE LOWER($${i++})`;p.push(`%${city}%`);}
      if(minPrice){sql+=` AND price_per_person>=$${i++}`;p.push(parseFloat(minPrice));}
      if(maxPrice){sql+=` AND price_per_person<=$${i++}`;p.push(parseFloat(maxPrice));}
      sql+=' ORDER BY date ASC';
      return Promise.all((await query(sql,p)).map(_enrichTour));
    }
    let s=loadStore('group_tours').filter(t=>t.isActive!==false);
    if(city)s=s.filter(t=>t.city?.toLowerCase().includes(city.toLowerCase()));
    if(minPrice)s=s.filter(t=>t.pricePerPerson>=parseFloat(minPrice));
    if(maxPrice)s=s.filter(t=>t.pricePerPerson<=parseFloat(maxPrice));
    return Promise.all(s.sort((a,b)=>new Date(a.date)-new Date(b.date)).map(_enrichTour));
  },
  async findById(id) {
    if(USE_PG){const r=(await query('SELECT * FROM group_tours WHERE id=$1',[id]))[0];return r?_enrichTour(r):null;}
    return _enrichTour(loadStore('group_tours').find(t=>t.id===id)||null);
  },
  async create(data) {
    const id=uuid();
    if(USE_PG){await query(`INSERT INTO group_tours(id,guide_id,title,description,city,date,start_time,duration,max_members,price_per_person,meetup_point,meetup_lat,meetup_lng,itinerary,category,cover_image,whatsapp_link,photos,creator_id,creator_type) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,[id,data.guideId||null,data.title,data.description||'',data.city||'',data.date,data.startTime,data.duration||'3 hours',parseInt(data.maxMembers)||6,parseFloat(data.pricePerPerson)||0,data.meetupPoint||'',data.meetupLat||null,data.meetupLng||null,JSON.stringify(data.itinerary||[]),data.category||[],data.coverImage||null,data.whatsappLink||'',data.photos||[],data.creatorId||null,data.creatorType||'TRAVELER']);return this.findById(id);}
    const s=loadStore('group_tours'); const t={id,...data,isActive:true,createdAt:now(),updatedAt:now()}; s.push(t); saveStore('group_tours',s); return _enrichTour(t);
  },
};
const groupTourMembers = {
  async isJoined(gtId,uid) {
    if(USE_PG){return (await query('SELECT id FROM group_tour_members WHERE group_tour_id=$1 AND user_id=$2',[gtId,uid])).length>0;}
    return !!loadStore('group_tour_members').find(m=>m.groupTourId===gtId&&m.userId===uid);
  },
  async join(gtId,uid) {
    if(await this.isJoined(gtId,uid))throw new Error('Already joined this tour');
    const t=await groupTours.findById(gtId); if(!t)throw new Error('Tour not found');
    if(t._count.members>=t.maxMembers)throw new Error('Tour is full');
    const id=uuid();
    if(USE_PG){await query('INSERT INTO group_tour_members(id,group_tour_id,user_id) VALUES($1,$2,$3)',[id,gtId,uid]);return{id,groupTourId:gtId,userId:uid,joinedAt:now()};}
    const s=loadStore('group_tour_members'); const m={id,groupTourId:gtId,userId:uid,joinedAt:now(),paymentStatus:'PENDING'}; s.push(m); saveStore('group_tour_members',s); return m;
  },
  async findByUserTours(uid) {
    if(USE_PG){const rows=await query('SELECT group_tour_id FROM group_tour_members WHERE user_id=$1',[uid]);return Promise.all(rows.map(r=>groupTours.findById(r.group_tour_id)));}
    const mems=loadStore('group_tour_members').filter(m=>m.userId===uid);
    return Promise.all(mems.map(m=>groupTours.findById(m.groupTourId)));
  },
};

// ── REELS ──
const _er = async(r) => { if(!r)return null; const u=await users.findById(r.userId||r.user_id); return{...r,userId:r.userId||r.user_id,videoUrl:r.videoUrl||r.video_url,thumbnailUrl:r.thumbnailUrl||r.thumbnail_url,reelType:r.reelType||r.reel_type,locationName:r.locationName||r.location_name,likesCount:r.likesCount||r.likes_count||0,commentsCount:r.commentsCount||r.comments_count||0,isActive:r.isActive!==undefined?r.isActive:r.is_active,createdAt:r.createdAt||r.created_at,user:u?{id:u.id,fullName:u.fullName,avatarUrl:u.avatarUrl}:null}; };
const reels = {
  async findMany(q={}) {
    const lim=parseInt(q.limit)||20;
    if(USE_PG){let sql=`SELECT * FROM reels WHERE is_active=true`;const p=[];let i=1;if(q.userId){sql+=` AND user_id=$${i++}`;p.push(q.userId);}sql+=` ORDER BY created_at DESC LIMIT $${i}`;p.push(lim);return Promise.all((await query(sql,p)).map(_er));}
    let s=loadStore('reels').filter(r=>r.isActive!==false);
    if(q.userId)s=s.filter(r=>r.userId===q.userId);
    return Promise.all(s.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,lim).map(_er));
  },
  async findByUser(uid) { return this.findMany({userId:uid,limit:50}); },
  async create(data) {
    const id=uuid();
    if(USE_PG){await query(`INSERT INTO reels(id,user_id,video_url,thumbnail_url,caption,reel_type,city,location_name,latitude,longitude) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[id,data.userId,data.videoUrl,data.thumbnailUrl||null,data.caption||'',data.reelType||'GENERAL',data.city||'',data.locationName||'',data.latitude||null,data.longitude||null]);return _er((await query('SELECT * FROM reels WHERE id=$1',[id]))[0]);}
    const s=loadStore('reels'); const r={id,...data,views:0,likesCount:0,commentsCount:0,isActive:true,createdAt:now()}; s.push(r); saveStore('reels',s); return _er(r);
  },
  async like(reelId,uid) {
    if(USE_PG){const ex=await query('SELECT id FROM reel_likes WHERE reel_id=$1 AND user_id=$2',[reelId,uid]);if(ex.length){await query('DELETE FROM reel_likes WHERE reel_id=$1 AND user_id=$2',[reelId,uid]);await query('UPDATE reels SET likes_count=GREATEST(0,likes_count-1) WHERE id=$1',[reelId]);return false;}await query('INSERT INTO reel_likes(id,reel_id,user_id) VALUES($1,$2,$3)',[uuid(),reelId,uid]);await query('UPDATE reels SET likes_count=likes_count+1 WHERE id=$1',[reelId]);return true;}
    const ls=loadStore('reel_likes'); const ex=ls.find(l=>l.reelId===reelId&&l.userId===uid);
    const rs=loadStore('reels'); const idx=rs.findIndex(r=>r.id===reelId);
    if(ex){saveStore('reel_likes',ls.filter(l=>!(l.reelId===reelId&&l.userId===uid)));if(idx!==-1){rs[idx].likesCount=Math.max(0,(rs[idx].likesCount||0)-1);saveStore('reels',rs);}return false;}
    ls.push({id:uuid(),reelId,userId:uid,createdAt:now()});saveStore('reel_likes',ls);
    if(idx!==-1){rs[idx].likesCount=(rs[idx].likesCount||0)+1;saveStore('reels',rs);}return true;
  },
  async view(reelId) {
    if(USE_PG){await query('UPDATE reels SET views=views+1 WHERE id=$1',[reelId]);return;}
    const s=loadStore('reels'); const idx=s.findIndex(r=>r.id===reelId); if(idx!==-1){s[idx].views=(s[idx].views||0)+1;saveStore('reels',s);}
  },
};

// ── MESSAGES ──
const reelComments = {
  async create(data) {
    const id = uuid();
    if (USE_PG) {
      await query('INSERT INTO reel_comments(id,reel_id,user_id,content) VALUES($1,$2,$3,$4)', [id, data.reelId, data.userId, data.content]);
      await query('UPDATE reels SET comments_count=comments_count+1 WHERE id=$1', [data.reelId]);
      const row = (await query('SELECT rc.*,u.full_name,u.avatar_url FROM reel_comments rc JOIN users u ON u.id=rc.user_id WHERE rc.id=$1', [id]))[0];
      return { id: row.id, reelId: row.reel_id, userId: row.user_id, content: row.content, createdAt: row.created_at, user: { id: row.user_id, fullName: row.full_name, avatarUrl: row.avatar_url } };
    }
    const s = loadStore('reel_comments');
    const comment = { id, reelId: data.reelId, userId: data.userId, content: data.content, createdAt: now() };
    s.push(comment); saveStore('reel_comments', s);
    const rs = loadStore('reels'); const rIdx = rs.findIndex(r => r.id === data.reelId);
    if (rIdx !== -1) { rs[rIdx].commentsCount = (rs[rIdx].commentsCount || 0) + 1; saveStore('reels', rs); }
    const u = await users.findById(data.userId);
    return { ...comment, user: u ? { id: u.id, fullName: u.fullName, avatarUrl: u.avatarUrl } : null };
  },
  async findByReel(reelId) {
    if (USE_PG) {
      const rows = await query('SELECT rc.*,u.full_name,u.avatar_url FROM reel_comments rc JOIN users u ON u.id=rc.user_id WHERE rc.reel_id=$1 ORDER BY rc.created_at ASC', [reelId]);
      return rows.map(row => ({ id: row.id, reelId: row.reel_id, userId: row.user_id, content: row.content, createdAt: row.created_at, user: { id: row.user_id, fullName: row.full_name, avatarUrl: row.avatar_url } }));
    }
    const rows = loadStore('reel_comments').filter(c => c.reelId === reelId).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
    return Promise.all(rows.map(async c => {
      const u = await users.findById(c.userId);
      return { ...c, user: u ? { id: u.id, fullName: u.fullName, avatarUrl: u.avatarUrl } : null };
    }));
  },
};
const messages = {
  async findByBooking(bid) {
    if(USE_PG){const rows=await query(`SELECT m.*,u.full_name as sn,u.avatar_url as sa FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.booking_id=$1 ORDER BY m.created_at ASC`,[bid]);return rows.map(r=>({id:r.id,bookingId:r.booking_id,senderId:r.sender_id,receiverId:r.receiver_id,content:r.content,isRead:r.is_read,createdAt:r.created_at,sender:{id:r.sender_id,fullName:r.sn,avatarUrl:r.sa}}));}
    const s=loadStore('messages').filter(m=>m.bookingId===bid).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
    return Promise.all(s.map(async m=>{const u=await users.findById(m.senderId);return{...m,sender:u?{id:u.id,fullName:u.fullName,avatarUrl:u.avatarUrl}:null};}));
  },
  async create(data) {
    const id=uuid();
    if(USE_PG){await query('INSERT INTO messages(id,booking_id,sender_id,receiver_id,content) VALUES($1,$2,$3,$4,$5)',[id,data.bookingId,data.senderId,data.receiverId,data.content]);const rows=await query('SELECT m.*,u.full_name as sn,u.avatar_url as sa FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id=$1',[id]);const r=rows[0];return{id:r.id,bookingId:r.booking_id,senderId:r.sender_id,receiverId:r.receiver_id,content:r.content,isRead:r.is_read,createdAt:r.created_at,sender:{id:r.sender_id,fullName:r.sn,avatarUrl:r.sa}};}
    const s=loadStore('messages'); const m={id,...data,isRead:false,createdAt:now()}; s.push(m); saveStore('messages',s);
    const u=await users.findById(data.senderId); return{...m,sender:u?{id:u.id,fullName:u.fullName,avatarUrl:u.avatarUrl}:null};
  },
  async markRead(bid,uid) {
    if(USE_PG){await query('UPDATE messages SET is_read=true,read_at=NOW() WHERE booking_id=$1 AND receiver_id=$2 AND is_read=false',[bid,uid]);return;}
    const s=loadStore('messages'); s.forEach(m=>{if(m.bookingId===bid&&m.receiverId===uid&&!m.isRead){m.isRead=true;m.readAt=now();}}); saveStore('messages',s);
  },
};

// ── REVIEWS ──
const reviews = {
  async findById(id) {
    if (USE_PG) {
      const r = (await query('SELECT * FROM reviews WHERE id=$1', [id]))[0];
      return r ? { id: r.id, bookingId: r.booking_id, reviewerId: r.reviewer_id, revieweeId: r.reviewee_id, rating: parseFloat(r.rating), comment: r.comment, guideResponse: r.guide_response, createdAt: r.created_at } : null;
    }
    return loadStore('reviews').find(r => r.id === id) || null;
  },
  async findByReviewee(uid) {
    if(USE_PG){const rows=await query(`SELECT r.*,u.full_name as rn,u.avatar_url as ra FROM reviews r JOIN users u ON u.id=r.reviewer_id WHERE r.reviewee_id=$1 ORDER BY r.created_at DESC`,[uid]);return rows.map(r=>({id:r.id,bookingId:r.booking_id,reviewerId:r.reviewer_id,revieweeId:r.reviewee_id,rating:parseFloat(r.rating),comment:r.comment,guideResponse:r.guide_response,createdAt:r.created_at,reviewer:{id:r.reviewer_id,fullName:r.rn,avatarUrl:r.ra}}));}
    const s=loadStore('reviews').filter(r=>r.revieweeId===uid);
    return Promise.all(s.map(async r=>{const u=await users.findById(r.reviewerId);return{...r,reviewer:u?{id:u.id,fullName:u.fullName,avatarUrl:u.avatarUrl}:null};}));
  },
  async create(data) {
    if(USE_PG){const ex=await query('SELECT id FROM reviews WHERE booking_id=$1',[data.bookingId]);if(ex.length)throw new Error('Review already submitted');const id=uuid();await query('INSERT INTO reviews(id,booking_id,reviewer_id,reviewee_id,rating,comment) VALUES($1,$2,$3,$4,$5,$6)',[id,data.bookingId,data.reviewerId,data.revieweeId,parseFloat(data.rating),data.comment||'']);await guideProfiles.recalcRating(data.revieweeId);const rows=await query('SELECT r.*,u.full_name as rn,u.avatar_url as ra FROM reviews r JOIN users u ON u.id=r.reviewer_id WHERE r.id=$1',[id]);const r=rows[0];return{id:r.id,bookingId:r.booking_id,reviewerId:r.reviewer_id,revieweeId:r.reviewee_id,rating:parseFloat(r.rating),comment:r.comment,createdAt:r.created_at,reviewer:{id:r.reviewer_id,fullName:r.rn,avatarUrl:r.ra}};}
    const s=loadStore('reviews'); if(s.find(r=>r.bookingId===data.bookingId))throw new Error('Review already submitted');
    const rev={id:uuid(),...data,rating:parseFloat(data.rating),photos:[],guideResponse:null,createdAt:now()}; s.push(rev); saveStore('reviews',s); await guideProfiles.recalcRating(data.revieweeId); return rev;
  },
  async update(id, upd) {
    if (USE_PG) {
      if (upd.guideResponse !== undefined) await query('UPDATE reviews SET guide_response=$1 WHERE id=$2', [upd.guideResponse, id]);
      return this.findById(id);
    }
    const s = loadStore('reviews'); const idx = s.findIndex(r => r.id === id); if (idx === -1) return null;
    s[idx] = { ...s[idx], ...upd }; saveStore('reviews', s); return s[idx];
  },
  _store(){return loadStore('reviews');}, _save(d){saveStore('reviews',d);},
};

// ── NOTIFICATIONS ──
const notifications = {
  async findByUser(uid) {
    if(USE_PG){const rows=await query('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[uid]);return rows.map(r=>({id:r.id,userId:r.user_id,title:r.title,body:r.body,type:r.type,data:r.data,isRead:r.is_read,createdAt:r.created_at}));}
    return loadStore('notifications').filter(n=>n.userId===uid).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  },
  async create(data) {
    const id=uuid();
    if(USE_PG){await query('INSERT INTO notifications(id,user_id,title,body,type,data) VALUES($1,$2,$3,$4,$5,$6)',[id,data.userId,data.title,data.body||'',data.type||'GENERAL',data.data?JSON.stringify(data.data):null]);return{id,...data,isRead:false,createdAt:now()};}
    const s=loadStore('notifications'); const n={id,...data,isRead:false,createdAt:now()}; s.push(n); saveStore('notifications',s); return n;
  },
  async markRead(id) {
    if(USE_PG){await query('UPDATE notifications SET is_read=true WHERE id=$1',[id]);return{id,isRead:true};}
    const s=loadStore('notifications'); const idx=s.findIndex(n=>n.id===id); if(idx!==-1){s[idx].isRead=true;saveStore('notifications',s);return s[idx];} return null;
  },
};

// ── HIDDEN GEMS ──
const hiddenGems = {
  async findByGuide(gid) {
    if(USE_PG)return query('SELECT * FROM hidden_gems WHERE guide_id=$1',[gid]);
    return loadStore('hidden_gems').filter(g=>g.guideId===gid);
  },
  async findMany(q={}) {
    if(USE_PG){let sql='SELECT * FROM hidden_gems WHERE 1=1';const p=[];let i=1;if(q.city){sql+=` AND LOWER(city) LIKE LOWER($${i++})`;p.push(`%${q.city}%`);}return query(sql,p);}
    let s=loadStore('hidden_gems'); if(q.city)s=s.filter(g=>g.city?.toLowerCase().includes(q.city.toLowerCase())); return s;
  },
  async create(data) {
    const id=uuid();
    if(USE_PG){await query('INSERT INTO hidden_gems(id,guide_id,name,description,category,city,latitude,longitude,is_locked,photos) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id,data.guideId,data.name,data.description||'',data.category||'',data.city||'',parseFloat(data.latitude)||0,parseFloat(data.longitude)||0,data.isLocked!==false,data.photos||[]]);return(await query('SELECT * FROM hidden_gems WHERE id=$1',[id]))[0];}
    const s=loadStore('hidden_gems'); const g={id,guideId:data.guideId,name:data.name,description:data.description||'',category:data.category||'',city:data.city||'',latitude:parseFloat(data.latitude)||0,longitude:parseFloat(data.longitude)||0,isLocked:data.isLocked!==false,photos:data.photos||[],createdAt:now()}; s.push(g); saveStore('hidden_gems',s); return g;
  },
};

// ── WALLET TRANSACTIONS ──
const walletTransactions = {
  async findByUser(uid) {
    if(USE_PG)return query('SELECT * FROM wallet_transactions WHERE user_id=$1 ORDER BY created_at DESC',[uid]);
    return loadStore('wallet_transactions').filter(t=>t.userId===uid).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  },
  async create(data) {
    const id=uuid();
    if(USE_PG){await query('INSERT INTO wallet_transactions(id,user_id,amount,type,description,booking_id) VALUES($1,$2,$3,$4,$5,$6)',[id,data.userId,parseFloat(data.amount),data.type||'CREDIT',data.description||'',data.bookingId||null]);return{id,...data,createdAt:now()};}
    const s=loadStore('wallet_transactions'); const t={id,...data,amount:parseFloat(data.amount),createdAt:now()}; s.push(t); saveStore('wallet_transactions',s); return t;
  },
};

// ── SOS ALERTS ──
const sosAlerts = {
  async create(data) {
    const id=uuid();
    if(USE_PG){await query('INSERT INTO sos_alerts(id,user_id,latitude,longitude,booking_id,message) VALUES($1,$2,$3,$4,$5,$6)',[id,data.userId,data.latitude,data.longitude,data.bookingId||null,data.message||'SOS Alert']);return{id,...data,isResolved:false,createdAt:now()};}
    const s=loadStore('sos_alerts'); const a={id,...data,isResolved:false,createdAt:now()}; s.push(a); saveStore('sos_alerts',s); return a;
  },
};

module.exports = { users, guideProfiles, travelerProfiles, bookings, groupTours, groupTourMembers, reels, reelComments, messages, reviews, notifications, hiddenGems, walletTransactions, sosAlerts, initSchema, USE_PG, query, follows: null }; // follows added below


// ── FOLLOWS (Friend Requests) ──
const follows = {
  async follow(followerId, followingId) {
    if (followerId === followingId) throw new Error('Cannot follow yourself');
    if (USE_PG) {
      await query(`CREATE TABLE IF NOT EXISTS follows(id TEXT PRIMARY KEY, follower_id TEXT REFERENCES users(id) ON DELETE CASCADE, following_id TEXT REFERENCES users(id) ON DELETE CASCADE, status TEXT DEFAULT 'PENDING', created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(follower_id,following_id))`);
      const ex = await query('SELECT id,status FROM follows WHERE follower_id=$1 AND following_id=$2',[followerId,followingId]);
      if (ex.length) { if(ex[0].status==='ACCEPTED') throw new Error('Already following'); throw new Error('Request already sent'); }
      const id = require('crypto').randomUUID();
      await query('INSERT INTO follows(id,follower_id,following_id,status) VALUES($1,$2,$3,$4)',[id,followerId,followingId,'PENDING']);
      return { id, followerId, followingId, status:'PENDING' };
    }
    const s = loadStore('follows');
    if (s.find(f=>f.followerId===followerId&&f.followingId===followingId)) throw new Error('Request already sent');
    const f = { id:uuid(), followerId, followingId, status:'PENDING', createdAt:now() };
    s.push(f); saveStore('follows',s); return f;
  },
  async accept(id, userId) {
    if (USE_PG) {
      await query(`CREATE TABLE IF NOT EXISTS follows(id TEXT PRIMARY KEY, follower_id TEXT REFERENCES users(id) ON DELETE CASCADE, following_id TEXT REFERENCES users(id) ON DELETE CASCADE, status TEXT DEFAULT 'PENDING', created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(follower_id,following_id))`);
      await query('UPDATE follows SET status=$1 WHERE id=$2 AND following_id=$3',['ACCEPTED',id,userId]);
      return { id, status:'ACCEPTED' };
    }
    const s = loadStore('follows'); const idx=s.findIndex(f=>f.id===id&&f.followingId===userId);
    if(idx!==-1){s[idx].status='ACCEPTED';saveStore('follows',s);} return s[idx];
  },
  async unfollow(followerId, followingId) {
    if (USE_PG) {
      await query(`CREATE TABLE IF NOT EXISTS follows(id TEXT PRIMARY KEY, follower_id TEXT REFERENCES users(id) ON DELETE CASCADE, following_id TEXT REFERENCES users(id) ON DELETE CASCADE, status TEXT DEFAULT 'PENDING', created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(follower_id,following_id))`);
      await query('DELETE FROM follows WHERE follower_id=$1 AND following_id=$2',[followerId,followingId]);
      return true;
    }
    saveStore('follows', loadStore('follows').filter(f=>!(f.followerId===followerId&&f.followingId===followingId)));
    return true;
  },
  async getFollowers(userId) {
    if (USE_PG) {
      await query(`CREATE TABLE IF NOT EXISTS follows(id TEXT PRIMARY KEY, follower_id TEXT REFERENCES users(id) ON DELETE CASCADE, following_id TEXT REFERENCES users(id) ON DELETE CASCADE, status TEXT DEFAULT 'PENDING', created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(follower_id,following_id))`);
      const rows = await query('SELECT f.*,u.full_name,u.avatar_url FROM follows f JOIN users u ON u.id=f.follower_id WHERE f.following_id=$1 AND f.status=$2',[userId,'ACCEPTED']);
      return rows.map(r=>({id:r.id,followerId:r.follower_id,followingId:r.following_id,status:r.status,user:{id:r.follower_id,fullName:r.full_name,avatarUrl:r.avatar_url}}));
    }
    const s=loadStore('follows').filter(f=>f.followingId===userId&&f.status==='ACCEPTED');
    return Promise.all(s.map(async f=>{const u=await users.findById(f.followerId);return{...f,user:u?{id:u.id,fullName:u.fullName,avatarUrl:u.avatarUrl}:null};}));
  },
  async getFollowing(userId) {
    if (USE_PG) {
      await query(`CREATE TABLE IF NOT EXISTS follows(id TEXT PRIMARY KEY, follower_id TEXT REFERENCES users(id) ON DELETE CASCADE, following_id TEXT REFERENCES users(id) ON DELETE CASCADE, status TEXT DEFAULT 'PENDING', created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(follower_id,following_id))`);
      const rows = await query('SELECT f.*,u.full_name,u.avatar_url FROM follows f JOIN users u ON u.id=f.following_id WHERE f.follower_id=$1 AND f.status=$2',[userId,'ACCEPTED']);
      return rows.map(r=>({id:r.id,followerId:r.follower_id,followingId:r.following_id,status:r.status,user:{id:r.following_id,fullName:r.full_name,avatarUrl:r.avatar_url}}));
    }
    const s=loadStore('follows').filter(f=>f.followerId===userId&&f.status==='ACCEPTED');
    return Promise.all(s.map(async f=>{const u=await users.findById(f.followingId);return{...f,user:u?{id:u.id,fullName:u.fullName,avatarUrl:u.avatarUrl}:null};}));
  },
  async getPending(userId) {
    if (USE_PG) {
      await query(`CREATE TABLE IF NOT EXISTS follows(id TEXT PRIMARY KEY, follower_id TEXT REFERENCES users(id) ON DELETE CASCADE, following_id TEXT REFERENCES users(id) ON DELETE CASCADE, status TEXT DEFAULT 'PENDING', created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(follower_id,following_id))`);
      const rows = await query('SELECT f.*,u.full_name,u.avatar_url FROM follows f JOIN users u ON u.id=f.follower_id WHERE f.following_id=$1 AND f.status=$2',[userId,'PENDING']);
      return rows.map(r=>({id:r.id,followerId:r.follower_id,followingId:r.following_id,status:r.status,user:{id:r.follower_id,fullName:r.full_name,avatarUrl:r.avatar_url}}));
    }
    const s=loadStore('follows').filter(f=>f.followingId===userId&&f.status==='PENDING');
    return Promise.all(s.map(async f=>{const u=await users.findById(f.followerId);return{...f,user:u?{id:u.id,fullName:u.fullName,avatarUrl:u.avatarUrl}:null};}));
  },
  async getStatus(followerId, followingId) {
    if (USE_PG) {
      try {
        const rows = await query('SELECT status FROM follows WHERE follower_id=$1 AND following_id=$2',[followerId,followingId]);
        return rows[0]?.status || null;
      } catch { return null; }
    }
    return loadStore('follows').find(f=>f.followerId===followerId&&f.followingId===followingId)?.status || null;
  },
};

module.exports.follows = follows;

const directMessages = {
  async getConversation(userA, userB) {
    if(USE_PG){
      return query(`SELECT dm.*,u.full_name as sender_name,u.avatar_url as sender_avatar FROM direct_messages dm JOIN users u ON u.id=dm.sender_id WHERE (dm.sender_id=$1 AND dm.receiver_id=$2) OR (dm.sender_id=$2 AND dm.receiver_id=$1) ORDER BY dm.created_at ASC`,[userA,userB]);
    }
    const store=loadStore('direct_messages');
    return store.filter(m=>(m.senderId===userA&&m.receiverId===userB)||(m.senderId===userB&&m.receiverId===userA)).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  },
  async getInbox(userId) {
    if(USE_PG){
      const rows = await query(`
        SELECT DISTINCT ON (contact_id)
          contact_id,
          u.full_name as contact_name,
          u.avatar_url as contact_avatar,
          u.role as contact_role,
          dm.content as last_message,
          dm.created_at as last_message_time,
          dm.sender_id,
          (SELECT COUNT(*) FROM direct_messages WHERE sender_id=contact_id AND receiver_id=$1 AND is_read=false) as unread_count
        FROM (
          SELECT CASE WHEN sender_id=$1 THEN receiver_id ELSE sender_id END as contact_id, id, content, created_at, sender_id
          FROM direct_messages WHERE sender_id=$1 OR receiver_id=$1
        ) dm
        JOIN users u ON u.id=dm.contact_id
        ORDER BY contact_id, dm.created_at DESC
      `,[userId]);
      return rows.map(r=>({contactId:r.contact_id,contactName:r.contact_name,contactAvatar:r.contact_avatar,contactRole:r.contact_role,lastMessage:r.last_message,lastMessageTime:r.last_message_time,unreadCount:parseInt(r.unread_count)||0}));
    }
    const store=loadStore('direct_messages');
    const contacts=new Map();
    store.filter(m=>m.senderId===userId||m.receiverId===userId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).forEach(m=>{
      const contactId=m.senderId===userId?m.receiverId:m.senderId;
      if(!contacts.has(contactId))contacts.set(contactId,{contactId,lastMessage:m.content,lastMessageTime:m.createdAt,unreadCount:0});
    });
    return Promise.all([...contacts.values()].map(async c=>{const u=await users.findById(c.contactId);return{...c,contactName:u?.fullName||'',contactAvatar:u?.avatarUrl||'',contactRole:u?.role||'TRAVELER'};}));
  },
  async send(senderId, receiverId, content) {
    const id=uuid();
    if(USE_PG){await query('INSERT INTO direct_messages(id,sender_id,receiver_id,content) VALUES($1,$2,$3,$4)',[id,senderId,receiverId,content]);return(await query('SELECT * FROM direct_messages WHERE id=$1',[id]))[0];}
    const msg={id,senderId,receiverId,content,isRead:false,readAt:null,createdAt:now()};
    const s=loadStore('direct_messages');s.push(msg);saveStore('direct_messages',s);return msg;
  },
  async markRead(senderId, receiverId) {
    if(USE_PG){await query('UPDATE direct_messages SET is_read=true,read_at=NOW() WHERE sender_id=$1 AND receiver_id=$2 AND is_read=false',[senderId,receiverId]);return;}
    const s=loadStore('direct_messages');
    s.forEach(m=>{if(m.senderId===senderId&&m.receiverId===receiverId&&!m.isRead){m.isRead=true;m.readAt=now();}});
    saveStore('direct_messages',s);
  },
  async getUnreadCount(userId) {
    if(USE_PG){const r=await query('SELECT COUNT(*) as cnt FROM direct_messages WHERE receiver_id=$1 AND is_read=false',[userId]);return parseInt(r[0]?.cnt)||0;}
    return loadStore('direct_messages').filter(m=>m.receiverId===userId&&!m.isRead).length;
  },
};

module.exports.directMessages = directMessages;
