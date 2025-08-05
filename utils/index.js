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

export function convertDate(date) {
    const todayLocal = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        0, // Set hours to 0 (midnight local)
        0, // Set minutes to 0
        0  // Set seconds to 0
    );

    // Helper to add leading zero for single-digit numbers
    const pad = (num) => String(num).padStart(2, '0');

    const year = todayLocal.getFullYear();
    const month = pad(todayLocal.getMonth() + 1); // getMonth() is 0-indexed
    const day = pad(todayLocal.getDate());
    const hours = pad(todayLocal.getHours());   // Will be '00'
    const minutes = pad(todayLocal.getMinutes()); // Will be '00'
    const seconds = pad(todayLocal.getSeconds()); // Will be '00'

    // Construct the string
    const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

    return formattedDate;
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
