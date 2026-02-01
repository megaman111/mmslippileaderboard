import React, { useState, useEffect } from 'react';

export function FreeRankedDay() {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate Free Ranked Day status
  const getFreeRankedStatus = () => {
    // Base date: February 4, 2026 at 12:00 AM PST
    // Convert to UTC for consistent calculation
    const baseDate = new Date('2026-02-04T08:00:00.000Z'); // 12 AM PST = 8 AM UTC
    const now = new Date();
    
    // Calculate milliseconds since base date
    const timeDiff = now.getTime() - baseDate.getTime();
    
    // If we're before the base date, calculate time until first free day
    if (timeDiff < 0) {
      const timeUntilFirst = Math.abs(timeDiff);
      const daysLeft = Math.floor(timeUntilFirst / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.floor((timeUntilFirst % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeUntilFirst % (1000 * 60 * 60)) / (1000 * 60));
      const secondsLeft = Math.floor((timeUntilFirst % (1000 * 60)) / 1000);
      
      return {
        isLive: false,
        timeRemaining: {
          days: daysLeft,
          hours: hoursLeft,
          minutes: minutesLeft,
          seconds: secondsLeft
        },
        nextDate: baseDate
      };
    }
    
    // Calculate days since base date
    const daysSinceBase = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    
    // Free Ranked Day occurs every 4 days starting from base date
    const cycleDay = daysSinceBase % 4;
    
    // Check if we're currently in a free ranked day (24-hour window)
    const currentFreeDay = new Date(baseDate.getTime() + (Math.floor(daysSinceBase / 4) * 4 * 24 * 60 * 60 * 1000));
    const endOfCurrentFreeDay = new Date(currentFreeDay.getTime() + (24 * 60 * 60 * 1000));
    
    const isLive = cycleDay === 0 && now >= currentFreeDay && now < endOfCurrentFreeDay;
    
    if (isLive) {
      // Calculate time remaining in current free day
      const timeLeft = endOfCurrentFreeDay.getTime() - now.getTime();
      const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const secondsLeft = Math.floor((timeLeft % (1000 * 60)) / 1000);
      
      return {
        isLive: true,
        timeRemaining: {
          hours: hoursLeft,
          minutes: minutesLeft,
          seconds: secondsLeft
        },
        nextDate: null
      };
    } else {
      // Calculate next free ranked day
      const daysUntilNext = 4 - cycleDay;
      const nextFreeDay = new Date(baseDate.getTime() + (Math.floor(daysSinceBase / 4) * 4 + 4) * 24 * 60 * 60 * 1000);
      
      const timeUntilNext = nextFreeDay.getTime() - now.getTime();
      const daysLeft = Math.floor(timeUntilNext / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.floor((timeUntilNext % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeUntilNext % (1000 * 60 * 60)) / (1000 * 60));
      const secondsLeft = Math.floor((timeUntilNext % (1000 * 60)) / 1000);
      
      return {
        isLive: false,
        timeRemaining: {
          days: daysLeft,
          hours: hoursLeft,
          minutes: minutesLeft,
          seconds: secondsLeft
        },
        nextDate: nextFreeDay
      };
    }
  };

  const status = getFreeRankedStatus();

  const formatTime = (time: any) => {
    if (status.isLive) {
      return `${time.hours.toString().padStart(2, '0')}:${time.minutes.toString().padStart(2, '0')}:${time.seconds.toString().padStart(2, '0')}`;
    } else {
      if (time.days > 0) {
        return `${time.days}d ${time.hours.toString().padStart(2, '0')}:${time.minutes.toString().padStart(2, '0')}:${time.seconds.toString().padStart(2, '0')}`;
      } else {
        return `${time.hours.toString().padStart(2, '0')}:${time.minutes.toString().padStart(2, '0')}:${time.seconds.toString().padStart(2, '0')}`;
      }
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700 w-72">
      <h3 className="text-white text-lg font-bold mb-3 text-center border-b border-gray-600 pb-2 flex items-center justify-center gap-2">
        🆓 Free Ranked Day
      </h3>
      
      <div className="space-y-3">
        {status.isLive ? (
          // Currently Live
          <div className="bg-gradient-to-r from-green-900 to-green-800 rounded p-3 hover:from-green-800 hover:to-green-700 hover:scale-[1.02] hover:shadow-lg transition-all duration-300 ease-out group">
            <div className="text-center mb-2">
              <div className="text-green-200 font-bold text-lg mb-1 group-hover:text-green-100 transition-colors duration-300">
                LIVE NOW!
              </div>
              <div className="text-green-300 text-sm group-hover:text-green-200 transition-colors duration-300">
                Free Ranked is currently active!
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-green-100 text-xs mb-1">Time Remaining:</div>
              <div className="text-green-100 font-mono text-xl font-bold group-hover:scale-110 transition-transform duration-300 ease-out">
                {formatTime(status.timeRemaining)}
              </div>
            </div>
          </div>
        ) : (
          // Countdown to Next
          <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded p-3 hover:from-blue-800 hover:to-blue-700 hover:scale-[1.02] hover:shadow-lg transition-all duration-300 ease-out group">
            <div className="text-center mb-2">
              <div className="text-blue-200 font-bold text-lg mb-1 group-hover:text-blue-100 transition-colors duration-300">
                Next Free Day
              </div>
              <div className="text-blue-300 text-sm group-hover:text-blue-200 transition-colors duration-300">
                {status.nextDate?.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-blue-100 text-xs mb-1">Countdown:</div>
              <div className="text-blue-100 font-mono text-xl font-bold group-hover:scale-110 transition-transform duration-300 ease-out">
                {formatTime(status.timeRemaining)}
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-gray-700 rounded p-3 hover:bg-gray-600 hover:scale-[1.02] hover:shadow-md transition-all duration-300 ease-out cursor-pointer group">
          <div className="text-center">
            <div className="text-gray-300 font-semibold text-sm mb-1 group-hover:text-gray-200 transition-colors duration-300">
              Schedule
            </div>
            <div className="text-gray-400 text-xs group-hover:text-gray-300 transition-colors duration-300">
              Every 4 days • 24 hours each
            </div>
            <div className="text-gray-400 text-xs group-hover:text-gray-300 transition-colors duration-300">
              12:00 AM - 11:59 PM
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-600">
          Master → Grandmaster updates at 1:00 AM PST
        </div>
      </div>
    </div>
  );
}