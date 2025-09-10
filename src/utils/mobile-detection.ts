/**
 * Mobile Detection and Voice Input Utilities
 * Handles device detection and provides mobile-specific configurations
 */

export interface DeviceInfo {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  supportsSpeechRecognition: boolean;
  supportsFullSpeechAPI: boolean;
}

export interface VoiceConfig {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  language: string;
  timeout: number;
  pauseDetection: number;
  useManualStop: boolean;
}

/**
 * Detect device and browser capabilities
 */
export const getDeviceInfo = (): DeviceInfo => {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  
  // Mobile detection patterns (updated for 2025)
  const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  
  // Browser detection
  const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
  const isChrome = /Chrome/i.test(userAgent) && !/Edge/i.test(userAgent);
  
  // Speech recognition support detection
  const SpeechRecognition = typeof window !== 'undefined' ? 
    (window.SpeechRecognition || (window as any).webkitSpeechRecognition) : null;
  const supportsSpeechRecognition = !!SpeechRecognition;
  
  // Full API support (continuous mode works properly)
  // iOS has limited support, Android Chrome works well
  const supportsFullSpeechAPI = supportsSpeechRecognition && !isIOS;
  
  return {
    isMobile,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    supportsSpeechRecognition,
    supportsFullSpeechAPI
  };
};

/**
 * Get optimal voice recognition configuration for current device
 */
export const getVoiceConfig = (deviceInfo?: DeviceInfo): VoiceConfig => {
  const device = deviceInfo || getDeviceInfo();
  
  // Updated settings for continuous mode with smart pause detection
  if (device.isMobile) {
    return {
      continuous: true, // Enable continuous mode for better UX
      interimResults: true,
      maxAlternatives: 1, // Reduce processing on mobile
      language: 'en-US',
      timeout: 30000, // 30 second fallback timeout
      pauseDetection: 8000, // 8 seconds of silence triggers stop
      useManualStop: false // Auto-stop on pause detection
    };
  }
  
  // Desktop settings
  return {
    continuous: true,
    interimResults: true,
    maxAlternatives: 3,
    language: 'en-US',
    timeout: 30000, // Standardized 30 second timeout
    pauseDetection: 8000, // 8 seconds of silence triggers stop
    useManualStop: false
  };
};

/**
 * Check if device needs iOS keyboard dictation fallback
 */
export const needsIOSFallback = (deviceInfo?: DeviceInfo): boolean => {
  const device = deviceInfo || getDeviceInfo();
  return device.isIOS && !device.supportsSpeechRecognition;
};

/**
 * Get user-friendly device-specific guidance messages
 */
export const getVoiceGuidance = (deviceInfo?: DeviceInfo) => {
  const device = deviceInfo || getDeviceInfo();
  
  if (device.isIOS && !device.supportsSpeechRecognition) {
    return {
      title: 'Voice Input Available',
      message: 'Tap the text field, then use the microphone button on your iOS keyboard for dictation.',
      buttonText: 'Use Keyboard Dictation',
      icon: 'Keyboard'
    };
  }
  
  if (device.isIOS && device.supportsSpeechRecognition) {
    return {
      title: 'Voice Recording',
      message: 'Tap and hold to record. Release when finished speaking.',
      buttonText: 'Hold to Record',
      icon: 'MicIcon'
    };
  }
  
  if (device.isAndroid) {
    return {
      title: 'Voice Input',
      message: 'Tap to start recording. Speak clearly for best results.',
      buttonText: 'Start Recording',
      icon: 'MicIcon'
    };
  }
  
  // Desktop fallback
  return {
    title: 'Voice Recognition',
    message: 'Click to start continuous voice recognition.',
    buttonText: 'Start Voice Input',
    icon: 'MicIcon'
  };
};

/**
 * Get appropriate error messages for different scenarios
 */
export const getVoiceErrorMessage = (error: string, deviceInfo?: DeviceInfo): string => {
  const device = deviceInfo || getDeviceInfo();
  
  if (device.isIOS) {
    return 'Voice input may be limited on iOS. Try using the keyboard microphone button instead.';
  }
  
  if (device.isMobile && !device.supportsSpeechRecognition) {
    return 'Voice input not supported on this browser. Try using Chrome or Safari.';
  }
  
  // Standard error handling
  return error || 'Voice recognition failed. Please check your microphone permissions.';
};

/**
 * Debug information for troubleshooting
 */
export const getDebugInfo = (): Record<string, any> => {
  const device = getDeviceInfo();
  const config = getVoiceConfig(device);
  
  return {
    device,
    config,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
    speechRecognition: {
      available: typeof window !== 'undefined' && !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition),
      constructor: typeof window !== 'undefined' ? 
        (window.SpeechRecognition ? 'SpeechRecognition' : 
         (window as any).webkitSpeechRecognition ? 'webkitSpeechRecognition' : 'None') : 'N/A'
    },
    permissions: {
      available: typeof navigator !== 'undefined' && 'permissions' in navigator,
      mediaDevices: typeof navigator !== 'undefined' && 'mediaDevices' in navigator
    }
  };
};