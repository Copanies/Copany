export function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (Number.isNaN(diffInSeconds)) return "";

  if (diffInSeconds < 60) {
    return "just now";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} min ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hr ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day ago`;
  } else if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months} mo ago`;
  } else {
    const years = Math.floor(diffInSeconds / 31536000);
    return `${years} yr ago`;
  }
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  
  if (Number.isNaN(date.getTime())) return "";
  
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const month = months[date.getMonth()];
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${month} ${day}, ${year}`;
}

export function getMonthlyPeriod(date: string | Date): {
  start: Date;
  end: Date;
  key: string;
} {
  const d = new Date(date);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const startMonth = months[start.getMonth()];
  const startDay = start.getDate().toString().padStart(2, '0');
  const startYear = start.getFullYear();
  
  const endDate = new Date(end.getTime() - 1);
  const endMonth = months[endDate.getMonth()];
  const endDay = endDate.getDate().toString().padStart(2, '0');
  const endYear = endDate.getFullYear();

  return {
    start,
    end,
    key: `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`,
  };
}

