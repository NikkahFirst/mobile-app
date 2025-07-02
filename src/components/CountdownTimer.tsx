
import React, { useState, useEffect } from "react";

interface CountdownTimerProps {
  targetDate: Date;
  onExpire?: () => void;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();
      
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (onExpire) onExpire();
        return;
      }
      
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      
      setTimeLeft({ days, hours, minutes, seconds });
    };
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    
    return () => clearInterval(timer);
  }, [targetDate, onExpire]);
  
  return (
    <div className="flex items-center gap-2 text-white font-mono">
      <div className="text-center">
        <div className="bg-black/30 px-2 py-1 rounded">
          <span className="text-xl font-bold">{timeLeft.days}</span>
        </div>
        <div className="text-xs mt-1">Days</div>
      </div>
      <div className="text-xl">:</div>
      <div className="text-center">
        <div className="bg-black/30 px-2 py-1 rounded">
          <span className="text-xl font-bold">{timeLeft.hours.toString().padStart(2, '0')}</span>
        </div>
        <div className="text-xs mt-1">Hours</div>
      </div>
      <div className="text-xl">:</div>
      <div className="text-center">
        <div className="bg-black/30 px-2 py-1 rounded">
          <span className="text-xl font-bold">{timeLeft.minutes.toString().padStart(2, '0')}</span>
        </div>
        <div className="text-xs mt-1">Mins</div>
      </div>
      <div className="text-xl">:</div>
      <div className="text-center">
        <div className="bg-black/30 px-2 py-1 rounded">
          <span className="text-xl font-bold">{timeLeft.seconds.toString().padStart(2, '0')}</span>
        </div>
        <div className="text-xs mt-1">Secs</div>
      </div>
    </div>
  );
};

export default CountdownTimer;
