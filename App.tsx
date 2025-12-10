import React, { useState, useEffect } from 'react';
import { Plus, Globe, Info, CloudOff, CloudLightning, Clock, Trash2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DreamMap from './components/DreamMap';
import DreamInputModal from './components/DreamInputModal';
import DreamDetailPopup from './components/DreamDetailPopup';
import CountryStatsPopup from './components/CountryStatsPopup';
import FilterBar from './components/FilterBar';
import { Dream, DreamCategory, CountryStats } from './types';
import { fetchDreams, saveDream, subscribeToDreams, getRateLimitStatus, clearLocalData } from './services/storageService';
import { isSupabaseConfigured } from './services/supabaseClient';
import { calculateRegionalStats } from './services/aggregationService';

function App() {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [filter, setFilter] = useState<DreamCategory | 'ALL'>('ALL');
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [selectedCountryStats, setSelectedCountryStats] = useState<CountryStats | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  
  // Rate Limiting State
  const [rateLimit, setRateLimit] = useState<{ isLimited: boolean; cooldownUntil: number | null }>({
    isLimited: false,
    cooldownUntil: null
  });

  const isOnline = isSupabaseConfigured();
  const [latestDream, setLatestDream] = useState<Dream | null>(null);

  // Initial Load
  useEffect(() => {
    const loadData = async () => {
      const data = await fetchDreams();
      setDreams(data);
      
      // Check rate limit
      const status = await getRateLimitStatus();
      setRateLimit(status);
    };
    loadData();

    const subscription = subscribeToDreams((newDream) => {
       setDreams(prev => [newDream, ...prev]);
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    }
  }, []);

  const handleSaveDream = async (dream: Dream) => {
    await saveDream(dream);
    
    if (!isOnline) {
        setDreams(prev => [dream, ...prev]);
    }
    
    setLatestDream(dream); 
    setSelectedDream(dream); 
    
    // Re-check rate limit after save
    const status = await getRateLimitStatus();
    setRateLimit(status);
  };

  const handleDreamClick = (dream: Dream) => {
    setSelectedCountryStats(null); // Close country stats if open
    setSelectedDream(dream);
  };

  const handleCountryClick = (countryName: string, feature: any) => {
    setSelectedDream(null); // Close dream details if open
    const stats = calculateRegionalStats(countryName, feature, dreams);
    setSelectedCountryStats(stats);
  };

  const handleResetData = () => {
    if (window.confirm("DEBUG: Reset all local identity and data? This will clear your anonymous ID, rate limits, and locally stored dreams.")) {
      clearLocalData();
      window.location.reload();
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#0a0a12] overflow-hidden text-white font-sans selection:bg-purple-500/30">
      
      <DreamMap 
        dreams={dreams} 
        filter={filter} 
        onDreamClick={handleDreamClick}
        onCountryClick={handleCountryClick}
        focusDream={latestDream}
      />

      <div className="absolute top-0 left-0 right-0 z-[400] p-4 sm:p-6 pointer-events-none">
        <div className="flex justify-between items-start">
          <div className="pointer-events-auto">
             <h1 className="text-2xl font-bold tracking-tight text-white/90 drop-shadow-lg flex items-center gap-3">
               <Globe className="text-blue-400" size={24} />
               GLOBAL DREAM MAP
             </h1>
             <div className="flex items-center gap-3 mt-1">
               <p className="text-xs text-blue-200/60 font-mono tracking-widest uppercase">
                 Active Signals: {dreams.length}
               </p>
               <span className="text-xs font-mono px-1.5 py-0.5 rounded border border-white/10 bg-black/40 flex items-center gap-1.5 text-gray-400">
                  {isOnline ? <CloudLightning size={10} className="text-green-400" /> : <CloudOff size={10} className="text-gray-500" />}
                  {isOnline ? 'LIVE' : 'LOCAL'}
               </span>
             </div>
          </div>
          
          <button 
            onClick={() => setShowIntro(true)}
            className="pointer-events-auto p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          >
            <Info size={20} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showIntro && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
             <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                onClick={() => setShowIntro(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
             />
             <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-[#0f0f18] border border-white/10 p-8 rounded-2xl max-w-md shadow-2xl text-center pointer-events-auto"
             >
                <Globe className="mx-auto text-blue-500 mb-4" size={48} />
                <h2 className="text-xl font-bold mb-2">Welcome to the Void</h2>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                  You are viewing a real-time visualization of human subconsciousness. 
                  Every dot represents a dream log. 
                  <br/><br/>
                  Locations are fuzzed by 10-50km to ensure total anonymity. 
                  <br/>
                  <span className="text-blue-400">New:</span> Click on a country to see regional dream statistics.
                </p>
                <button 
                  onClick={() => setShowIntro(false)}
                  className="px-6 py-2 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-colors"
                >
                  Enter Map
                </button>

                {/* DEBUG / TESTING SECTION */}
                <div className="mt-8 pt-6 border-t border-white/5">
                  <button 
                    onClick={handleResetData}
                    className="flex items-center justify-center gap-2 mx-auto px-4 py-1.5 rounded border border-red-500/20 bg-red-500/5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 text-[10px] transition-all font-mono uppercase tracking-wider"
                  >
                    <ShieldCheck size={10} />
                    Reset Identity / Unblock
                  </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedDream && (
          <DreamDetailPopup 
            dream={selectedDream} 
            onClose={() => setSelectedDream(null)} 
          />
        )}
      </AnimatePresence>

      <CountryStatsPopup 
        stats={selectedCountryStats}
        onClose={() => setSelectedCountryStats(null)}
      />

      <div className="fixed bottom-24 right-6 z-[400]">
        <button
          onClick={() => setIsInputOpen(true)}
          className={`group relative flex items-center justify-center w-14 h-14 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all active:scale-95 ${
            rateLimit.isLimited 
              ? 'bg-gray-700 text-gray-400 cursor-pointer' 
              : 'bg-white text-black hover:scale-105'
          }`}
        >
           {rateLimit.isLimited ? <Clock size={24} /> : <Plus size={24} />}
           <span className="absolute right-full mr-4 bg-white/10 backdrop-blur text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
             {rateLimit.isLimited ? 'Rest Required' : 'Log Dream'}
           </span>
        </button>
      </div>

      <FilterBar currentFilter={filter} onFilterChange={setFilter} />

      <DreamInputModal 
        isOpen={isInputOpen} 
        onClose={() => setIsInputOpen(false)} 
        onSave={handleSaveDream}
        cooldownUntil={rateLimit.cooldownUntil}
      />
    </div>
  );
}

export default App;
