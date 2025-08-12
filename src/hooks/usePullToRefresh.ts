
import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * A React hook to implement "pull to refresh" functionality with a delay.
 * This is primarily intended for Progressive Web Apps on iOS, where the native
 * pull-to-refresh gesture is disabled in standalone mode. The refresh is triggered
 * after holding the pull past a threshold for a specified delay.
 *
 * @param onRefresh - The function to call when a refresh is triggered.
 * @param options - Configuration options.
 * @param options.threshold - The distance in pixels the user must pull down to trigger the refresh. Defaults to 80.
 * @param options.enabled - A boolean to enable or disable the hook. Defaults to true.
 * @param options.refreshDelay - The time in ms to hold the pull before refreshing. Defaults to 2000.
 * @returns An object with touch event handlers and state for building a UI.
 */
export function usePullToRefresh(
  onRefresh: () => void,
  options: { threshold?: number; enabled?: boolean; refreshDelay?: number } = {}
) {
  const { threshold = 80, enabled = true, refreshDelay = 2000 } = options;

  const startY = useRef<number | null>(null);
  const isPulling = useRef(false);
  const pullDistance = useRef(0);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0); // A value from 0 to 1
  const [isArmed, setIsArmed] = useState(false); // Countdown is active
  const [countdown, setCountdown] = useState(0);

  const cancelTimers = useCallback(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }
    setIsArmed(current => current ? false : current);
    setCountdown(0);
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
      if (!enabled || isRefreshing || document.documentElement.scrollTop > 0) {
        return;
      }
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
      cancelTimers(); // Cancel any lingering timers
    }, [enabled, isRefreshing, cancelTimers]
  );

  const onTouchMove = useCallback((e: React.TouchEvent) => {
      if (!isPulling.current || startY.current === null) {
        return;
      }

      const diff = e.touches[0].clientY - startY.current;

      // Prevent the browser's native overscroll behavior on any vertical pull
      if (diff > 0) {
        e.preventDefault();
      }
      
      pullDistance.current = diff;
      const progress = Math.max(0, Math.min(diff / threshold, 1));
      setPullProgress(progress);

      if (progress >= 1) { // Pulled past threshold
          // Start timer only if it's not already running
          if (!isArmed) {
              setIsArmed(true);
              
              const initialSeconds = Math.ceil(refreshDelay / 1000);
              setCountdown(initialSeconds);
              
              countdownInterval.current = setInterval(() => {
                setCountdown(prev => Math.max(0, prev - 1));
              }, 1000);

              refreshTimer.current = setTimeout(() => {
                  setIsRefreshing(true);
                  if (countdownInterval.current) {
                    clearInterval(countdownInterval.current);
                    countdownInterval.current = null;
                  }
                  onRefresh();
              }, refreshDelay);
          }
      } else { // Pulled less than threshold or moved finger up
          cancelTimers();
      }
    }, [threshold, onRefresh, refreshDelay, cancelTimers, isArmed]
  );

  const onTouchEnd = useCallback(() => {
    if (!isPulling.current) {
      return;
    }

    isPulling.current = false;
    startY.current = null;
    pullDistance.current = 0;
    
    cancelTimers();
    // Reset the pull progress if refresh was not triggered
    setPullProgress(0);
  }, [cancelTimers]);
  
  // Cleanup timer on unmount
  useEffect(() => {
      return () => {
          cancelTimers();
      };
  }, [cancelTimers]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    isRefreshing,
    pullProgress,
    isArmed,
    countdown,
  };
}
