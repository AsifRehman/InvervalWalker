import React, { useState, useEffect, useCallback } from 'react';
import CircularProgress from './components/CircularProgress';
import { IntervalType, DEFAULT_CONFIG, IntervalConfig } from './types';
import { speak, playBeep, startMetronome, stopMetronome, initAudio } from './services/audioService';
import { getWalkingMotivation } from './services/geminiService';
import { Play, Pause, RotateCcw, Sparkles, Volume2, VolumeX, Settings, X, Minus, Plus, Trophy } from 'lucide-react';

const App: React.FC = () => {
  const [config, setConfig] = useState<IntervalConfig>(DEFAULT_CONFIG);
  const [intervalType, setIntervalType] = useState<IntervalType>(IntervalType.IDLE);
  const [timeLeft, setTimeLeft] = useState<number>(DEFAULT_CONFIG.slowDurationSec);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [cycles, setCycles] = useState<number>(0); // Completed cycles
  const [motivation, setMotivation] = useState<string>("Ready to start? Let's go!");
  const [isLoadingMotivation, setIsLoadingMotivation] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const getDurationForType = useCallback((type: IntervalType) => {
    switch (type) {
      case IntervalType.SLOW: return config.slowDurationSec;
      case IntervalType.FAST: return config.fastDurationSec;
      default: return config.slowDurationSec;
    }
  }, [config]);

  const getBpmForType = useCallback((type: IntervalType) => {
    switch (type) {
      case IntervalType.SLOW: return config.slowBpm;
      case IntervalType.FAST: return config.fastBpm;
      default: return config.slowBpm;
    }
  }, [config]);

  // Switch interval logic
  const switchInterval = useCallback(() => {
    let nextType = IntervalType.SLOW;
    let nextTime = config.slowDurationSec;
    let message = "";

    if (intervalType === IntervalType.SLOW) {
      nextType = IntervalType.FAST;
      nextTime = config.fastDurationSec;
      message = "Time to speed up! Match the beat.";
    } else {
      // Coming from FAST (end of a cycle)
      const nextCycleCount = cycles + 1;
      
      if (nextCycleCount >= config.totalCycles) {
        // Workout Finished
        setIsRunning(false);
        setIntervalType(IntervalType.FINISHED);
        setTimeLeft(0);
        setCycles(nextCycleCount);
        speak("Workout complete! Great job.");
        // Play a little victory sound sequence if possible, or just beep
        playBeep();
        setTimeout(playBeep, 200);
        return;
      }

      // Continue to next Slow interval
      nextType = IntervalType.SLOW;
      nextTime = config.slowDurationSec;
      message = "Slow down. Recover.";
      setCycles(nextCycleCount);
    }

    // Audio Feedback
    playBeep();
    speak(message);

    setIntervalType(nextType);
    setTimeLeft(nextTime);
  }, [intervalType, config, cycles]);

  // Timer Effect
  useEffect(() => {
    let interval: number | undefined;

    if (isRunning && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      switchInterval();
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, switchInterval]);

  // Metronome Effect
  useEffect(() => {
    if (isRunning && !isMuted) {
      const bpm = getBpmForType(intervalType);
      const isFast = intervalType === IntervalType.FAST;
      startMetronome(bpm, isFast);
    } else {
      stopMetronome();
    }
    // Cleanup on unmount
    return () => stopMetronome();
  }, [isRunning, intervalType, isMuted, config, getBpmForType]);


  // Handlers
  const handleStart = () => {
    // Initialize Audio Context on user interaction
    initAudio();
    
    if (intervalType === IntervalType.IDLE || intervalType === IntervalType.FINISHED) {
      if (intervalType === IntervalType.FINISHED) {
         setCycles(0);
      }
      setIntervalType(IntervalType.SLOW);
      setTimeLeft(config.slowDurationSec);
      speak("Starting session. Walk to the beat.");
    } else {
      speak("Resuming.");
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
    speak("Paused.");
  };

  const handleReset = () => {
    setIsRunning(false);
    setIntervalType(IntervalType.IDLE);
    setTimeLeft(config.slowDurationSec);
    setCycles(0);
    setMotivation("Ready to start? Let's go!");
    stopMetronome();
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleGetMotivation = async () => {
    if (isLoadingMotivation) return;
    setIsLoadingMotivation(true);
    const context = intervalType === IntervalType.FAST 
      ? "User is in a high intensity fast walk interval" 
      : "User is in a recovery slow walk interval";
    
    const quote = await getWalkingMotivation(context);
    setMotivation(quote);
    speak(quote);
    setIsLoadingMotivation(false);
  };

  const updateBpm = (type: 'SLOW' | 'FAST', delta: number) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      if (type === 'SLOW') {
        newConfig.slowBpm = Math.max(60, Math.min(140, prev.slowBpm + delta));
      } else {
        newConfig.fastBpm = Math.max(100, Math.min(200, prev.fastBpm + delta));
      }
      return newConfig;
    });
  };

  const updateCycles = (delta: number) => {
    setConfig(prev => ({
      ...prev,
      totalCycles: Math.max(1, Math.min(20, prev.totalCycles + delta))
    }));
  };

  // Dynamic Background
  const getBgGradient = () => {
    if (intervalType === IntervalType.FAST) return 'bg-gradient-to-br from-brand-dark to-orange-900/40';
    if (intervalType === IntervalType.SLOW) return 'bg-gradient-to-br from-brand-dark to-blue-900/40';
    if (intervalType === IntervalType.FINISHED) return 'bg-gradient-to-br from-brand-dark to-green-900/40';
    return 'bg-brand-dark';
  };

  // Determine which cycle to display (1-based index)
  const displayCycle = intervalType === IntervalType.FINISHED 
    ? config.totalCycles 
    : cycles + 1;

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-between p-6 ${getBgGradient()} transition-colors duration-1000 relative overflow-hidden`}>
      
      {/* Header */}
      <header className="w-full max-w-md flex justify-between items-center z-10">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-white tracking-wide">Interval<span className="text-brand-green">Walker</span></h1>
        </div>
        
        <div className="flex items-center gap-3">
           <button 
            onClick={() => setShowSettings(true)}
            className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors text-white"
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>
          <button 
            onClick={toggleMute}
            className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors text-white"
            aria-label={isMuted ? "Unmute metronome" : "Mute metronome"}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </header>

      {/* Main Timer Display */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-md z-10">
        <div className="mb-8 relative">
            <CircularProgress 
              size={300} 
              strokeWidth={10} 
              totalTime={getDurationForType(intervalType)} 
              currentTime={timeLeft}
              type={intervalType}
              currentCycle={displayCycle}
              totalCycles={config.totalCycles}
            />
        </div>

        {/* Status Text & BPM */}
        <div className="text-center min-h-[5rem] px-4 flex flex-col gap-1">
           <p className="text-lg text-white/90 font-medium animate-pulse-slow">
             {intervalType === IntervalType.IDLE && "Tap Start to Begin"}
             {intervalType === IntervalType.SLOW && "Keep a steady, comfortable pace."}
             {intervalType === IntervalType.FAST && "Push hard! Match the beat."}
             {intervalType === IntervalType.FINISHED && "Session Complete! Well done."}
           </p>
           {(intervalType === IntervalType.SLOW || intervalType === IntervalType.FAST) && (
             <p className="text-sm text-brand-green font-mono uppercase tracking-widest flex items-center justify-center gap-2">
               Cadence: {getBpmForType(intervalType)} BPM
             </p>
           )}
        </div>
      </main>

      {/* Motivation Section */}
      <div className="w-full max-w-md bg-white/5 backdrop-blur-md rounded-xl p-4 mb-6 border border-white/10 min-h-[100px] flex flex-col justify-center relative">
        <p className="text-sm text-gray-300 italic text-center pr-8">
          "{motivation}"
        </p>
        <button 
          onClick={handleGetMotivation}
          disabled={isLoadingMotivation || intervalType === IntervalType.FINISHED}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
          aria-label="Get AI Motivation"
        >
          {intervalType === IntervalType.FINISHED ? (
             <Trophy size={18} className="text-brand-green" />
          ) : (
             <Sparkles size={18} className={isLoadingMotivation ? "animate-spin text-brand-orange" : "text-yellow-400"} />
          )}
        </button>
      </div>

      {/* Controls */}
      <div className="w-full max-w-md grid grid-cols-2 gap-4 z-10 pb-6">
        {!isRunning && intervalType !== IntervalType.FINISHED ? (
          <button 
            onClick={handleStart}
            className="col-span-1 flex items-center justify-center gap-2 bg-brand-green hover:bg-green-500 text-white py-4 rounded-2xl text-lg font-bold shadow-lg shadow-green-900/20 active:scale-95 transition-all"
          >
            <Play fill="currentColor" /> {intervalType === IntervalType.IDLE ? 'START' : 'RESUME'}
          </button>
        ) : intervalType === IntervalType.FINISHED ? (
          <button 
            onClick={handleReset}
            className="col-span-1 flex items-center justify-center gap-2 bg-brand-blue hover:bg-blue-500 text-white py-4 rounded-2xl text-lg font-bold shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
          >
            <RotateCcw /> NEW RUN
          </button>
        ) : (
          <button 
            onClick={handlePause}
            className="col-span-1 flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white py-4 rounded-2xl text-lg font-bold shadow-lg shadow-yellow-900/20 active:scale-95 transition-all"
          >
            <Pause fill="currentColor" /> PAUSE
          </button>
        )}

        {intervalType !== IntervalType.FINISHED && (
          <button 
            onClick={handleReset}
            className="col-span-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-4 rounded-2xl text-lg font-bold shadow-lg shadow-gray-900/20 active:scale-95 transition-all"
          >
            <RotateCcw /> RESET
          </button>
        )}
        
        {/* If finished, show a disabled or hidden secondary button to keep layout consistent, or just make NEW RUN span 2 cols? 
            Let's make NEW RUN span 2 cols if finished.
        */}
        {intervalType === IntervalType.FINISHED && (
           <style>{`.col-span-1:first-child { grid-column: span 2; }`}</style>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 z-50 bg-brand-dark/90 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm border border-gray-700 shadow-2xl max-h-full overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Workout Settings</h2>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-1 rounded-full hover:bg-white/10"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              
              {/* Total Sets */}
              <div className="space-y-2 p-3 bg-white/5 rounded-xl">
                 <div className="flex justify-between items-center">
                    <span className="text-gray-300 font-medium">Number of Sets</span>
                    <span className="text-2xl font-mono font-bold text-white">{config.totalCycles}</span>
                 </div>
                 <div className="flex items-center gap-2 justify-between">
                     <span className="text-xs text-gray-500">(Slow + Fast) x {config.totalCycles}</span>
                     <div className="flex gap-2">
                        <button onClick={() => updateCycles(-1)} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 active:scale-95">
                          <Minus size={18} />
                        </button>
                        <button onClick={() => updateCycles(1)} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 active:scale-95">
                          <Plus size={18} />
                        </button>
                     </div>
                 </div>
              </div>

              {/* Slow Walk Adjuster */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-brand-blue font-medium">Slow Cadence</span>
                  <span className="text-xl font-mono font-bold">{config.slowBpm} <span className="text-xs text-gray-500 font-sans">BPM</span></span>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => updateBpm('SLOW', -5)} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 active:scale-95">
                    <Minus size={20} />
                  </button>
                  <input 
                    type="range" 
                    min="60" 
                    max="120" 
                    step="5"
                    value={config.slowBpm}
                    onChange={(e) => setConfig(prev => ({...prev, slowBpm: parseInt(e.target.value)}))}
                    className="flex-1 accent-brand-blue h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <button onClick={() => updateBpm('SLOW', 5)} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 active:scale-95">
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              {/* Fast Walk Adjuster */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-brand-orange font-medium">Fast Cadence</span>
                  <span className="text-xl font-mono font-bold">{config.fastBpm} <span className="text-xs text-gray-500 font-sans">BPM</span></span>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => updateBpm('FAST', -5)} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 active:scale-95">
                    <Minus size={20} />
                  </button>
                  <input 
                    type="range" 
                    min="100" 
                    max="180" 
                    step="5"
                    value={config.fastBpm}
                    onChange={(e) => setConfig(prev => ({...prev, fastBpm: parseInt(e.target.value)}))}
                    className="flex-1 accent-brand-orange h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <button onClick={() => updateBpm('FAST', 5)} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 active:scale-95">
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-full bg-brand-green text-white py-3 rounded-xl font-bold hover:bg-green-600 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;