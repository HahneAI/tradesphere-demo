/**
 * Mobile Gesture Utilities
 * Provides touch-friendly interactions including swipe, long press, and haptic feedback
 */

export interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface SwipeGestureConfig {
  minDistance?: number;
  maxTime?: number;
  threshold?: number;
}

export interface LongPressConfig {
  duration?: number;
  moveThreshold?: number;
}

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';
export type HapticFeedbackType = 'impact' | 'selection' | 'notification';

// Default configurations
const DEFAULT_SWIPE_CONFIG: Required<SwipeGestureConfig> = {
  minDistance: 50,
  maxTime: 500,
  threshold: 30
};

const DEFAULT_LONG_PRESS_CONFIG: Required<LongPressConfig> = {
  duration: 500,
  moveThreshold: 10
};

/**
 * Detects swipe gestures from touch events
 */
export class SwipeGestureDetector {
  private startPoint: TouchPoint | null = null;
  private config: Required<SwipeGestureConfig>;
  
  constructor(config: SwipeGestureConfig = {}) {
    this.config = { ...DEFAULT_SWIPE_CONFIG, ...config };
  }

  onTouchStart = (event: TouchEvent): void => {
    const touch = event.touches[0];
    this.startPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };
  };

  onTouchEnd = (event: TouchEvent, onSwipe: (direction: SwipeDirection, distance: number) => void): void => {
    if (!this.startPoint) return;

    const touch = event.changedTouches[0];
    const endPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };

    const deltaX = endPoint.x - this.startPoint.x;
    const deltaY = endPoint.y - this.startPoint.y;
    const deltaTime = endPoint.timestamp - this.startPoint.timestamp;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Check if gesture meets criteria
    if (distance < this.config.minDistance || deltaTime > this.config.maxTime) {
      this.startPoint = null;
      return;
    }

    // Determine primary direction
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    if (absX > absY && absX > this.config.threshold) {
      // Horizontal swipe
      const direction = deltaX > 0 ? 'right' : 'left';
      onSwipe(direction, distance);
    } else if (absY > this.config.threshold) {
      // Vertical swipe
      const direction = deltaY > 0 ? 'down' : 'up';
      onSwipe(direction, distance);
    }

    this.startPoint = null;
  };

  reset = (): void => {
    this.startPoint = null;
  };
}

/**
 * Detects long press gestures
 */
export class LongPressDetector {
  private timeoutId: NodeJS.Timeout | null = null;
  private startPoint: TouchPoint | null = null;
  private config: Required<LongPressConfig>;
  
  constructor(config: LongPressConfig = {}) {
    this.config = { ...DEFAULT_LONG_PRESS_CONFIG, ...config };
  }

  onTouchStart = (event: TouchEvent, onLongPress: () => void): void => {
    const touch = event.touches[0];
    this.startPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };

    this.timeoutId = setTimeout(() => {
      if (this.startPoint) {
        onLongPress();
        this.reset();
      }
    }, this.config.duration);
  };

  onTouchMove = (event: TouchEvent): void => {
    if (!this.startPoint || !this.timeoutId) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - this.startPoint.x;
    const deltaY = touch.clientY - this.startPoint.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > this.config.moveThreshold) {
      this.reset();
    }
  };

  onTouchEnd = (): void => {
    this.reset();
  };

  reset = (): void => {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.startPoint = null;
  };
}

/**
 * Haptic feedback utility for mobile devices
 */
export const hapticFeedback = {
  /**
   * Light impact feedback (button tap)
   */
  impact: (intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: 10,
        medium: 20,
        heavy: 30
      };
      navigator.vibrate(patterns[intensity]);
    }
    
    // iOS haptic feedback (if available)
    if ('ontouchstart' in window && (window as any).DeviceMotionEvent) {
      try {
        const Taptic = (window as any).Taptic;
        if (Taptic && Taptic.ImpactFeedbackGenerator) {
          const generator = new Taptic.ImpactFeedbackGenerator(intensity === 'light' ? 0 : intensity === 'medium' ? 1 : 2);
          if (generator.impactOccurred) {
            generator.impactOccurred();
          }
        }
      } catch (e) {
        // Silently fail if haptic feedback is not available
      }
    }
  },

  /**
   * Selection feedback (picker/slider)
   */
  selection: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
    
    try {
      const Taptic = (window as any).Taptic;
      if (Taptic && Taptic.SelectionFeedbackGenerator) {
        const generator = new Taptic.SelectionFeedbackGenerator();
        if (generator.selectionChanged) {
          generator.selectionChanged();
        }
      }
    } catch (e) {
      // Silently fail
    }
  },

  /**
   * Notification feedback (success/warning/error)
   */
  notification: (type: 'success' | 'warning' | 'error' = 'success') => {
    if ('vibrate' in navigator) {
      const patterns = {
        success: [10, 50, 10],
        warning: [20, 100, 20],
        error: [30, 100, 30, 100, 30]
      };
      navigator.vibrate(patterns[type]);
    }
    
    try {
      const Taptic = (window as any).Taptic;
      if (Taptic && Taptic.NotificationFeedbackGenerator) {
        const generator = new Taptic.NotificationFeedbackGenerator();
        const feedbackType = type === 'success' ? 0 : type === 'warning' ? 1 : 2;
        if (generator.notificationOccurred) {
          generator.notificationOccurred(feedbackType);
        }
      }
    } catch (e) {
      // Silently fail
    }
  }
};

/**
 * Utility to check if device supports touch
 */
export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || (navigator as any).msMaxTouchPoints > 0;
};

/**
 * Utility to detect mobile device
 */
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Get optimal touch target size based on device
 */
export const getTouchTargetSize = (): { minSize: number; recommendedSize: number } => {
  const isMobile = isMobileDevice();
  return {
    minSize: isMobile ? 44 : 32,
    recommendedSize: isMobile ? 48 : 36
  };
};

/**
 * Debounce utility for search inputs
 */
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Throttle utility for scroll events
 */
export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};