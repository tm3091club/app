// Version utility for tracking app versions
// This version will be updated automatically for each push to GitHub
// Format: M.DD.YY-X where X is the push count for that day

// Get current date-based version
const getCurrentDateVersion = (): string => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const year = now.getFullYear().toString().slice(-2);
  
  return `${month}.${day.toString().padStart(2, '0')}.${year}`;
};

// Get push count for today (this will be managed by git hooks or build process)
const getPushCount = (): number => {
  // For now, we'll use a simple approach
  // In a full implementation, this would read from a file or git metadata
  const today = new Date().toDateString();
  const lastUpdate = localStorage.getItem('lastVersionUpdate');
  
  if (lastUpdate === today) {
    const currentCount = parseInt(localStorage.getItem('pushCount') || '0');
    return currentCount + 1;
  } else {
    localStorage.setItem('lastVersionUpdate', today);
    localStorage.setItem('pushCount', '1');
    return 1;
  }
};

// Generate the full version string
const generateVersion = (): string => {
  const dateVersion = getCurrentDateVersion();
  const pushCount = getPushCount();
  return `${dateVersion}-${pushCount}`;
};

// Current version - this will be updated automatically
const CURRENT_VERSION = "9.11.25-38";

export const getAppVersion = (): string => {
  return CURRENT_VERSION;
};

// Get the current version
export const APP_VERSION = getAppVersion();

// Helper function to get just the date part
export const getVersionDate = (): string => {
  return getCurrentDateVersion();
};

// Helper function to get the next version (for reference)
export const getNextVersion = (): string => {
  const dateVersion = getCurrentDateVersion();
  const nextPushCount = getPushCount() + 1;
  return `${dateVersion}-${nextPushCount}`;
};

// Function to manually update version (for git hooks)
export const updateVersion = (): void => {
  const newVersion = generateVersion();
  console.log(`Version updated to: ${newVersion}`);
  // In a real implementation, this would write to a file or update git metadata
};
