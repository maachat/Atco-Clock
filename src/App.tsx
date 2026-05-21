/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, Timer as TimerIcon, Smartphone } from 'lucide-react';

export default function App() {
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [activeColumn, setActiveColumn] = useState<'h' | 'm' | 's' | null>(null);
  const [wakeLockError, setWakeLockError] = useState<string | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Derive time components
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Attempt to lock screen orientation to portrait programmatically on mount
  useEffect(() => {
    const lockScreen = async () => {
      try {
        const orientation = screen.orientation as any;
        if (orientation && typeof orientation.lock === 'function') {
          await orientation.lock('portrait');
          console.log('App successfully requested portrait locks');
        }
      } catch (err) {
        console.warn('Screen orientation lock request was restricted or unsupported:', err);
      }
    };
    lockScreen();
  }, []);

  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        if (wakeLockRef.current) return;
        const lock = await navigator.wakeLock.request('screen');
        wakeLockRef.current = lock;
        setWakeLockError(null);
        console.log('Wake Lock acquired');
      } catch (err: any) {
        const errMsg = err?.message || '';
        const isPolicyRestricted = err?.name === 'NotAllowedError' || err?.name === 'SecurityError' || errMsg.includes('permissions policy');
        
        if (isPolicyRestricted) {
          console.warn('Wake Lock notice: Screen Wake Lock is disallowed by permissions policy in this preview environment. Open in a new tab for full features.');
          setWakeLockError('Wake Lock restricted in preview. Open in a new tab.');
        } else {
          console.error('Wake Lock error:', err);
          setWakeLockError('Wake Lock failed. The screen may turn off.');
        }
      }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('Wake Lock released');
      } catch (err) {
        console.error('Wake Lock release error:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTotalSeconds((prev) => (prev + 1) % 86400);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  // Re-request wake lock when coming back to the tab
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isRunning) {
        await requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRunning, requestWakeLock]);

  const toggleTimer = async () => {
    const nextRunningState = !isRunning;
    if (nextRunningState) {
      await requestWakeLock();
    } else {
      await releaseWakeLock();
    }
    setIsRunning(nextRunningState);
  };

  const resetTimer = async () => {
    setIsRunning(false);
    setTotalSeconds(0);
    await releaseWakeLock();
  };

  const handleTimeChange = (type: 'h' | 'm' | 's', value: string) => {
    const val = parseInt(value, 10) || 0;
    if (type === 'h') {
      setTotalSeconds(val * 3600 + minutes * 60 + seconds);
    } else if (type === 'm') {
      setTotalSeconds(hours * 3600 + val * 60 + seconds);
    } else {
      setTotalSeconds(hours * 3600 + minutes * 60 + val);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans select-none overflow-hidden">
      
      {/* Mobile Landscape Orientation Lock Screen overlay */}
      <div className="hidden max-lg:landscape:flex fixed inset-0 bg-neutral-950 z-[9999] flex-col items-center justify-center p-8 text-center select-none border-4 border-amber-500/10">
        <motion.div
          animate={{ rotate: [0, -90, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          className="mb-6 p-4 bg-amber-500/10 rounded-full border border-amber-500/20 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
        >
          <Smartphone className="w-12 h-12" />
        </motion.div>
        
        <h2 className="text-xl font-black tracking-[0.15em] text-white uppercase mb-2 drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]">
          Portrait Mode Required
        </h2>
        
        <p className="text-xs text-neutral-400 max-w-xs leading-relaxed uppercase tracking-wider">
          Please rotate your device or restore portrait frame layout to operate the <span className="text-blue-400 font-bold">ATCO Timer</span>.
        </p>

        <div className="mt-8 px-3 py-1 bg-neutral-900/80 border border-neutral-800 rounded text-[9px] text-neutral-500 font-mono tracking-widest uppercase">
          SYSTEM INTERLOCK - PORTRAIT SECURED
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm flex flex-col items-center"
      >
        {/* Header */}
        <header className="mb-12 text-center">
          <div className="flex items-center justify-center gap-2 mb-2 bg-blue-500/10 px-4 py-1 rounded-full border border-blue-500/20">
            <TimerIcon className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold tracking-[0.2em] text-blue-400 uppercase">Aviation Grade</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            ATCO <span className="text-blue-500">TIMER</span>
          </h1>
        </header>

        {/* Timer Display / Picker */}
        <div className="relative group mb-12">
          <div className="flex items-center justify-center gap-2">
            <TimeWheel 
              value={hours} 
              max={23} 
              onChange={(v) => handleTimeChange('h', v)} 
              disabled={isRunning}
              label="HH"
              isActive={activeColumn === 'h' && !isRunning}
              onActivate={() => setActiveColumn('h')}
            />
            <span className="text-2xl font-mono text-blue-500/40 self-center mt-6 select-none animate-pulse">:</span>
            <TimeWheel 
              value={minutes} 
              max={59} 
              onChange={(v) => handleTimeChange('m', v)} 
              disabled={isRunning}
              label="MM"
              isActive={activeColumn === 'm' && !isRunning}
              onActivate={() => setActiveColumn('m')}
            />
            <span className="text-2xl font-mono text-blue-500/40 self-center mt-6 select-none animate-pulse">:</span>
            <TimeWheel 
              value={seconds} 
              max={59} 
              onChange={(v) => handleTimeChange('s', v)} 
              disabled={isRunning}
              label="SS"
              isActive={activeColumn === 's' && !isRunning}
              onActivate={() => setActiveColumn('s')}
            />
          </div>
          
          {/* Subtle glow effect when running */}
          <AnimatePresence>
            {isRunning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 -z-10 bg-blue-500/5 blur-3xl rounded-full"
              />
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 w-full justify-center">
          <ControlButton 
            onClick={resetTimer}
            icon={<RotateCcw className="w-6 h-6" />}
            color="bg-neutral-800"
            label="Reset"
          />
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleTimer}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-colors shadow-lg ${
              isRunning 
                ? 'bg-amber-500 text-black shadow-amber-500/20' 
                : 'bg-emerald-500 text-white shadow-emerald-500/20'
            }`}
          >
            {isRunning ? (
              <Pause className="w-10 h-10 fill-current" />
            ) : (
              <Play className="w-10 h-10 fill-current ml-1" />
            )}
          </motion.button>

          <div className="w-16" /> {/* Spacer for symmetry if needed, or place for another button */}
        </div>

        {/* Footer */}
        <footer className="mt-20 flex flex-col items-center gap-4">
          <AnimatePresence>
            {wakeLockError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-lg max-w-[280px] text-center"
              >
                <p className="text-[10px] text-amber-400 font-medium leading-relaxed">
                  {wakeLockError}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white font-medium">
            Created by MAZOUZI Abdelouahhab
          </p>
          <p className="text-[10px] uppercase tracking-[0.3em] text-blue-500 font-bold">
            Enroute ATC DAAA
          </p>
          <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-600 font-medium">
            2026 ©
          </p>
        </footer>
      </motion.div>
    </div>
  );
}

function TimeWheel({ 
  value, 
  max, 
  onChange, 
  disabled, 
  label,
  isActive,
  onActivate
}: { 
  value: number; 
  max: number; 
  onChange: (v: string) => void;
  disabled: boolean;
  label: string;
  isActive: boolean;
  onActivate: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [localScrollTop, setLocalScrollTop] = useState(value * 40);

  // Sync scroll position when value changes updates programmatically (timer interval tick or reset triggers)
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      const targetScrollTop = value * 40;
      if (Math.abs(el.scrollTop - targetScrollTop) > 6) {
        el.scrollTo({
          top: targetScrollTop,
          behavior: disabled ? 'smooth' : 'instant',
        });
      }
    }
  }, [value, disabled]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (el) {
      setLocalScrollTop(el.scrollTop);
      if (disabled) return;
      const nextIdx = Math.max(0, Math.min(max, Math.round(el.scrollTop / 40)));
      if (nextIdx !== value) {
        onChange(nextIdx.toString());
      }
    }
  };

  const stepBy = (amount: number) => {
    if (disabled) return;
    onActivate();
    const nextVal = (value + amount + (max + 1)) % (max + 1);
    onChange(nextVal.toString());
  };

  return (
    <div 
      className="flex flex-col items-center"
      onPointerDown={() => {
        if (!disabled) onActivate();
      }}
    >
      <span className="text-[10px] font-bold text-neutral-500 mb-1 tracking-wider">{label}</span>
      <div className="relative select-none h-[164px] w-20 md:w-24 overflow-hidden rounded-lg border border-neutral-900 bg-neutral-950/45">
        
        {/* Top/Bottom Shading overlays */}
        <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black to-transparent pointer-events-none z-10" />
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black to-transparent pointer-events-none z-10" />

        {/* Click adjustments for precision manual sizing on mouse-hover */}
        {!disabled && (
          <>
            <button 
              onClick={() => stepBy(-1)}
              className="absolute top-1 left-0 right-0 h-6 flex items-center justify-center opacity-0 hover:opacity-100 bg-blue-500/10 text-blue-400 text-[10px] transition-opacity duration-150 z-20 pointer-events-auto cursor-pointer"
            >
              ▲
            </button>
            <button 
              onClick={() => stepBy(1)}
              className="absolute bottom-1 left-0 right-0 h-6 flex items-center justify-center opacity-0 hover:opacity-100 bg-blue-500/10 text-blue-400 text-[10px] transition-opacity duration-150 z-20 pointer-events-auto cursor-pointer"
            >
              ▼
            </button>
          </>
        )}

        {/* Center active element highlight frame line indicators */}
        <div className={`absolute top-[62px] left-1 right-1 h-[40px] rounded pointer-events-none z-10 transition-all duration-300 ${
          isActive 
            ? 'border border-blue-500 bg-blue-500/10 shadow-[inset_0_0_8px_rgba(59,130,246,0.25),0_0_8px_rgba(59,130,246,0.15)]' 
            : 'border border-neutral-800/80 bg-neutral-900/10'
        }`} />

        {/* Curved scrolling cylinder content */}
        <div
          ref={scrollRef}
          onScroll={() => {
            if (!disabled) onActivate();
            handleScroll();
          }}
          className={`h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none py-0 ${
            disabled ? 'pointer-events-none touch-none overflow-hidden' : 'pointer-events-auto cursor-grab active:cursor-grabbing'
          }`}
          style={{ perspective: '160px', transformStyle: 'preserve-3d' }}
        >
          {/* Top safety spacer element */}
          <div className="h-[62px] shrink-0 pointer-events-none" />

          {/* Numbers grid */}
          {Array.from({ length: max + 1 }, (_, i) => {
            const dist = (i * 40 - localScrollTop) / 40;
            const rotateX = dist * 28;
            const scale = 1 - Math.min(0.2, Math.abs(dist) * 0.08);
            const opacity = Math.max(0.12, 1 - Math.abs(dist) * 0.38);
            const isCenterSelected = Math.round(localScrollTop / 40) === i;

            return (
              <div
                key={i}
                className="snap-center"
                style={{
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: `rotateX(${rotateX}deg) scale(${scale})`,
                  opacity: opacity,
                  transformStyle: 'preserve-3d',
                }}
              >
                <span className={`font-mono tabular-nums tracking-normal transition-all duration-150 ${
                  isCenterSelected 
                    ? 'text-[36px] font-bold text-white drop-shadow-[0_0_10px_rgba(59,130,246,0.45)]' 
                    : 'text-[24px] font-medium text-neutral-500/80'
                }`}>
                  {i.toString().padStart(2, '0')}
                </span>
              </div>
            );
          })}

          {/* Bottom safety spacer element */}
          <div className="h-[62px] shrink-0 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}

function ControlButton({ onClick, icon, color, label }: { 
  onClick: () => void; 
  icon: ReactNode; 
  color: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onClick}
        className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-md transition-colors ${color} hover:brightness-110`}
      >
        {icon}
      </motion.button>
      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{label}</span>
    </div>
  );
}
