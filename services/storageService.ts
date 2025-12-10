import { Dream, DreamCategory } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { MAX_DAILY_DREAMS, RATE_LIMIT_WINDOW_MS } from '../constants';

const STORAGE_KEY = 'global_dream_map_data';
const USER_ID_KEY = 'global_dream_map_user_id';

// Seed data for fallback/demo
const SEED_DREAMS: Dream[] = [
  {
    id: 'seed-1',
    text: "I was flying over a neon city, but the buildings were made of glass and water.",
    category: DreamCategory.SURREAL,
    summary: "Flying over a glass and water neon city.",
    interpretation: "A desire for transparency and fluidity in your waking life.",
    timestamp: Date.now() - 1000000,
    location: { lat: 35.6762, lng: 139.6503 }
  },
  {
    id: 'seed-2',
    text: "Something was chasing me through a dark forest. I couldn't run fast enough.",
    category: DreamCategory.NIGHTMARE,
    summary: "Being chased in a dark forest.",
    interpretation: "Unresolved fears are pursuing you. Turn and face them.",
    timestamp: Date.now() - 5000000,
    location: { lat: 40.7128, lng: -74.0060 }
  },
  {
    id: 'seed-3',
    text: "I met my soulmate in a library that had infinite floors.",
    category: DreamCategory.ROMANTIC,
    summary: "Meeting a soulmate in an infinite library.",
    interpretation: "You seek a connection grounded in shared knowledge and eternity.",
    timestamp: Date.now() - 8000000,
    location: { lat: 51.5074, lng: -0.1278 }
  },
  {
    id: 'seed-4',
    text: "I saw the end of the world, but it was peaceful. The sun turned blue.",
    category: DreamCategory.PROPHETIC,
    summary: "Peaceful apocalypse with a blue sun.",
    interpretation: "Change is coming. It is vast, but you are ready to accept it.",
    timestamp: Date.now() - 12000000,
    location: { lat: -33.8688, lng: 151.2093 }
  },
  {
    id: 'seed-5',
    text: "I was just doing my laundry, but the machine kept eating my socks.",
    category: DreamCategory.MUNDANE,
    summary: "Washing machine eating socks.",
    interpretation: "Small frustrations are eating away at your time. Seek efficiency.",
    timestamp: Date.now() - 200000,
    location: { lat: 48.8566, lng: 2.3522 }
  }
];

// --- IDENTITY & RATE LIMITING ---

export const getAnonymousID = (): string => {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
};

export const getRateLimitStatus = async (): Promise<{ isLimited: boolean; cooldownUntil: number | null }> => {
  const userId = getAnonymousID();
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
  
  let recentDreams: number[] = [];

  // 1. Fetch timestamps from Supabase if connected
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('dreams')
      .select('timestamp')
      .eq('user_id', userId)
      .gt('timestamp', cutoff)
      .order('timestamp', { ascending: true }); // Oldest first
    
    if (!error && data) {
      recentDreams = data.map(d => d.timestamp);
    }
  } else {
    // 2. Fallback to local storage filtering
    const allDreams = getLocalDreams();
    // We assume local dreams might not have user_id if they are seeds, so we check if we saved them
    // For simplicity in local-only mode, we just check *all* dreams created locally in this session context?
    // Actually, let's filter the local storage dreams by an inferred ownership or just assume local user owns local storage dreams.
    // Ideally we add user_id to local storage objects too.
    recentDreams = allDreams
        .filter(d => (d as any).user_id === userId && d.timestamp > cutoff)
        .map(d => d.timestamp)
        .sort((a, b) => a - b);
  }

  // Logic: Max 2 dreams per rolling 24h.
  if (recentDreams.length >= MAX_DAILY_DREAMS) {
    // If we have 2 or more, we are limited until the oldest one in the window expires.
    // The slot opens 24h after the timestamp of the dream that pushed us (or kept us) at the limit.
    // Effectively: We need to wait until the count drops below MAX.
    // The count drops when the oldest dream in the window passes the 24h mark.
    
    // We take the (Count - Max + 1)th oldest dream. 
    // E.g. if we have 2 dreams, we need 1 to expire. That's the 1st one (index 0).
    // If we somehow had 3 dreams (race condition), we need 2 to expire to get to 1, or 2 to expire to get to 0? 
    // We just need count < Max. So we need (Length - Max + 1) dreams to expire.
    // The time we become free is when the (Length - Max)th dream expires?
    // Let's simplify: We are blocked until the oldest valid dream expires.
    
    const oldestValidDreamTimestamp = recentDreams[0];
    return {
      isLimited: true,
      cooldownUntil: oldestValidDreamTimestamp + RATE_LIMIT_WINDOW_MS
    };
  }

  return { isLimited: false, cooldownUntil: null };
};

// --- LOCAL STORAGE HELPERS ---

const getLocalDreams = (): Dream[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const seeded = SEED_DREAMS.map(d => ({
        ...d,
        location: {
            lat: d.location.lat + (Math.random() * 0.1 - 0.05),
            lng: d.location.lng + (Math.random() * 0.1 - 0.05)
        }
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  return JSON.parse(stored);
};

const saveLocalDream = (dream: Dream): Dream[] => {
  const dreams = getLocalDreams();
  const newDreams = [dream, ...dreams];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newDreams));
  return newDreams;
};

// --- PUBLIC API ---

export const fetchDreams = async (): Promise<Dream[]> => {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('dreams')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Error fetching dreams from Supabase:', error);
      return getLocalDreams();
    }

    return data.map((d: any) => ({
      id: d.id,
      text: d.text,
      category: d.category as DreamCategory,
      summary: d.summary,
      interpretation: d.interpretation,
      timestamp: d.timestamp,
      location: {
        lat: d.location_lat,
        lng: d.location_lng
      },
      user_id: d.user_id // Preserve user_id for filtering
    }));
  }

  return Promise.resolve(getLocalDreams());
};

export const saveDream = async (dream: Dream): Promise<Dream> => {
  const userId = getAnonymousID();
  const dreamWithUser = { ...dream, user_id: userId };

  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase
      .from('dreams')
      .insert([
        {
          id: dreamWithUser.id,
          user_id: userId,
          text: dreamWithUser.text,
          category: dreamWithUser.category,
          summary: dreamWithUser.summary,
          interpretation: dreamWithUser.interpretation,
          timestamp: dreamWithUser.timestamp,
          location_lat: dreamWithUser.location.lat,
          location_lng: dreamWithUser.location.lng,
        }
      ]);

    if (error) {
      console.error('Error saving to Supabase:', error);
      saveLocalDream(dreamWithUser); 
      return dreamWithUser;
    }
    
    return dreamWithUser;
  }

  saveLocalDream(dreamWithUser);
  return Promise.resolve(dreamWithUser);
};

export const subscribeToDreams = (callback: (payload: any) => void) => {
  if (isSupabaseConfigured() && supabase) {
    return supabase
      .channel('public:dreams')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dreams' }, (payload) => {
        const d = payload.new;
        const newDream: Dream = {
           id: d.id,
           text: d.text,
           category: d.category,
           summary: d.summary,
           interpretation: d.interpretation,
           timestamp: d.timestamp,
           location: {
             lat: d.location_lat,
             lng: d.location_lng
           }
        };
        callback(newDream);
      })
      .subscribe();
  }
  return null;
};

// --- UTILS ---

export const applyFuzzyLogic = (lat: number, lng: number): { lat: number, lng: number } => {
    const minOffset = 0.09;
    const maxOffset = 0.45;
    
    const latOffset = (Math.random() * (maxOffset - minOffset) + minOffset) * (Math.random() < 0.5 ? -1 : 1);
    const lngOffset = (Math.random() * (maxOffset - minOffset) + minOffset) * (Math.random() < 0.5 ? -1 : 1);

    return {
        lat: lat + latOffset,
        lng: lng + lngOffset
    };
};

export const getRandomLocation = (): { lat: number, lng: number } => {
  const lat = (Math.random() * 140) - 70;
  const lng = (Math.random() * 360) - 180;
  return { lat, lng };
};