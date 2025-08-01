export default function formatJsDateToDatetime(date, format = 'all') {
  // Get components of the date
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  if (format==='date_underscore') {
    return `${year}_${month}_${day}` // e.g., "2025_07_09
  }

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`; // e.g., "2025-07-09 10:00:00" (depending on current time)
}

export function convertDateFormat(dateString) {
  const date = new Date(dateString);
  
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  return date.toLocaleDateString('en-US', options);
}
