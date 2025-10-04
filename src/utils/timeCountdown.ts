/**
 * Calculate the time remaining until the next 10th day of the month at 00:00 UTC
 * @returns Object containing days, hours, and minutes remaining
 */
export function getTimeUntilNextDistribution(): {
  days: number;
  hours: number;
  minutes: number;
  totalMs: number;
} {
  const now = new Date();
  
  // Get current year and month
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  
  // Calculate next distribution date (10th of next month at 00:00 UTC)
  let nextDistributionYear = currentYear;
  let nextDistributionMonth = currentMonth + 1;
  
  // Handle year rollover
  if (nextDistributionMonth > 11) {
    nextDistributionMonth = 0;
    nextDistributionYear++;
  }
  
  // Create the next distribution date
  const nextDistribution = new Date(Date.UTC(nextDistributionYear, nextDistributionMonth, 10, 0, 0, 0));
  
  // Calculate time difference
  const timeDiff = nextDistribution.getTime() - now.getTime();
  
  // If we're past the 10th of current month, calculate for next month
  if (now.getUTCDate() > 10) {
    return getTimeUntilNextDistribution();
  }
  
  // If we're before the 10th of current month, calculate for current month
  if (now.getUTCDate() < 10) {
    const currentMonthDistribution = new Date(Date.UTC(currentYear, currentMonth, 10, 0, 0, 0));
    const currentTimeDiff = currentMonthDistribution.getTime() - now.getTime();
    
    return {
      days: Math.floor(currentTimeDiff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((currentTimeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((currentTimeDiff % (1000 * 60 * 60)) / (1000 * 60)),
      totalMs: currentTimeDiff,
    };
  }
  
  // If it's exactly the 10th, return time until next month
  return {
    days: Math.floor(timeDiff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60)),
    totalMs: timeDiff,
  };
}

/**
 * Format the countdown time into a readable string
 * @param days Number of days
 * @param hours Number of hours
 * @param minutes Number of minutes
 * @returns Formatted string
 */
export function formatCountdownTime(days: number, hours: number, minutes: number): string {
  const parts: string[] = [];
  
  if (days > 0) {
    parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  }
  
  if (hours > 0) {
    parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  }
  
  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  }
  
  if (parts.length === 0) {
    return 'less than 1 minute';
  }
  
  if (parts.length === 1) {
    return parts[0];
  }
  
  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  }
  
  // For 3 parts, use commas and "and"
  return `${parts[0]}, ${parts[1]}, and ${parts[2]}`;
}
