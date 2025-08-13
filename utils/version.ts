// Version utility for tracking app versions
// This version will be updated manually for each push to GitHub
// Format: M.DD.YY-X where X is the push count for that day

// Current version - update this for each push
const CURRENT_VERSION = "8.13.25-20";

export const getAppVersion = (): string => {
  return CURRENT_VERSION;
};

// Get the current version
export const APP_VERSION = getAppVersion();

// Helper function to generate next version (for reference)
export const getNextVersion = (): string => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const year = now.getFullYear();
  
  // For now, we'll assume this is the first push of the day
  // In practice, you would increment this manually for each push
  const pushCount = 1;
  
  return `${month}.${day.toString().padStart(2, '0')}.${year.toString().slice(-2)}-${pushCount}`;
};
