"use client";

import { useState, useEffect } from "react";
import {
  getTimeUntilNextDistribution,
  formatCountdownTime,
} from "@/utils/timeCountdown";

interface CountdownTimerProps {
  className?: string;
}

export default function CountdownTimer({
  className = "",
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(() =>
    getTimeUntilNextDistribution()
  );

  useEffect(() => {
    // Update every minute
    const interval = setInterval(() => {
      setTimeRemaining(getTimeUntilNextDistribution());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <span className={className}>
      {formatCountdownTime(
        timeRemaining.days,
        timeRemaining.hours,
        timeRemaining.minutes
      )}
    </span>
  );
}
