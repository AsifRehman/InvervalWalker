import React from 'react';
import { IntervalType } from '../types';

interface CircularProgressProps {
  size: number;
  strokeWidth: number;
  totalTime: number;
  currentTime: number;
  type: IntervalType;
  currentCycle: number;
  totalCycles: number;
}

const CircularProgress: React.FC<CircularProgressProps> = ({ 
  size, 
  strokeWidth, 
  totalTime, 
  currentTime,
  type,
  currentCycle,
  totalCycles
}) => {
  // Center of the SVG
  const center = size / 2;

  // --- Outer Ring (Set Progress) ---
  const outerRadius = (size - strokeWidth) / 2;
  const outerCircumference = outerRadius * 2 * Math.PI;
  // If IDLE, show 0 progress. If Running/Finished, show current cycle progress.
  // e.g. Set 1/5 -> 20% filled (showing we are working on or have completed the 1st chunk)
  const setProgressCount = type === IntervalType.IDLE ? 0 : currentCycle;
  const setProgressRatio = totalCycles > 0 ? Math.min(setProgressCount / totalCycles, 1) : 0;
  const outerDashoffset = outerCircumference - setProgressRatio * outerCircumference;

  // --- Inner Ring (Interval Timer) ---
  // Add a gap between rings
  const gap = 14; 
  const innerRadius = outerRadius - strokeWidth - gap;
  const innerCircumference = innerRadius * 2 * Math.PI;
  const timeProgress = totalTime > 0 ? currentTime / totalTime : 0;
  const innerDashoffset = innerCircumference - timeProgress * innerCircumference;

  // Colors
  let innerColorClass = 'stroke-gray-500';
  let outerColorClass = 'stroke-gray-700'; // Default outer track
  let outerProgressColor = 'stroke-brand-green';

  if (type === IntervalType.SLOW) innerColorClass = 'stroke-brand-blue';
  if (type === IntervalType.FAST) innerColorClass = 'stroke-brand-orange';
  if (type === IntervalType.FINISHED) {
    innerColorClass = 'stroke-brand-green';
    outerProgressColor = 'stroke-brand-green'; // All green when done
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* --- Outer Ring (Sets) --- */}
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={outerRadius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-800/50"
        />
        {/* Progress */}
        <circle
          cx={center}
          cy={center}
          r={outerRadius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={outerCircumference}
          strokeDashoffset={outerDashoffset}
          strokeLinecap="round"
          className={`${outerProgressColor} transition-all duration-1000 ease-out`}
        />

        {/* --- Inner Ring (Interval) --- */}
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={innerRadius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-800"
        />
        {/* Progress */}
        <circle
          cx={center}
          cy={center}
          r={innerRadius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={innerCircumference}
          strokeDashoffset={innerDashoffset}
          strokeLinecap="round"
          className={`${innerColorClass} transition-all duration-1000 ease-linear`}
        />
      </svg>
      
      {/* Text Center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-8">
        {/* Interval Timer */}
        <span className={`text-6xl font-bold font-mono tracking-tighter ${type === IntervalType.IDLE ? 'text-gray-500' : 'text-white'}`}>
          {formatTime(currentTime)}
        </span>
        
        {/* Status Text */}
        <span className="text-sm uppercase tracking-widest text-gray-400 mt-2 mb-3">
          {type === IntervalType.IDLE ? 'Ready' : type === IntervalType.SLOW ? 'Slow Walk' : type === IntervalType.FAST ? 'Fast Walk' : 'Done'}
        </span>

        {/* Set Counter (Bigger Font) */}
        {(type !== IntervalType.IDLE) && (
          <div className="flex flex-col items-center">
             <span className="text-2xl font-bold text-white tracking-wide">
               {currentCycle} <span className="text-gray-500 text-lg">/ {totalCycles}</span>
             </span>
             <span className="text-[10px] text-gray-500 uppercase tracking-wider">Sets Completed</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CircularProgress;