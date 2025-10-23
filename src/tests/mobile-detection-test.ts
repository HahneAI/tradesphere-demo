/**
 * Mobile Detection Test
 * Quick test to verify mobile detection utility works correctly
 */

import { getDeviceInfo, getVoiceConfig, getVoiceGuidance, needsIOSFallback, getDebugInfo } from '../utils/mobile-detection';

// Mock different user agents for testing
const mockUserAgents = {
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
};

// Test function
const testMobileDetection = () => {
  console.log('🧪 Testing Mobile Detection Utility\n');
  
  // Test with current environment
  console.log('📱 Current Environment:');
  const currentDevice = getDeviceInfo();
  const currentConfig = getVoiceConfig(currentDevice);
  const currentGuidance = getVoiceGuidance(currentDevice);
  
  console.log('Device Info:', {
    isMobile: currentDevice.isMobile,
    isIOS: currentDevice.isIOS,
    isAndroid: currentDevice.isAndroid,
    supportsSpeechRecognition: currentDevice.supportsSpeechRecognition,
    supportsFullSpeechAPI: currentDevice.supportsFullSpeechAPI
  });
  
  console.log('Voice Config:', {
    continuous: currentConfig.continuous,
    timeout: currentConfig.timeout,
    useManualStop: currentConfig.useManualStop
  });
  
  console.log('Voice Guidance:', {
    title: currentGuidance.title,
    buttonText: currentGuidance.buttonText,
    icon: currentGuidance.icon
  });
  
  console.log('Needs iOS Fallback:', needsIOSFallback(currentDevice));
  
  console.log('\n🔍 Debug Info:');
  const debugInfo = getDebugInfo();
  console.log(debugInfo);
  
  // Test expected behaviors
  console.log('\n✅ Test Results:');
  console.log(`- Mobile devices use continuous: false - ${currentDevice.isMobile ? (currentConfig.continuous === false ? 'PASS' : 'FAIL') : 'N/A (Desktop)'}`);
  console.log(`- Mobile timeout is set - ${currentDevice.isMobile ? (currentConfig.timeout === 30000 ? 'PASS' : 'FAIL') : 'N/A (Desktop)'}`);
  console.log(`- iOS fallback detection works - ${currentDevice.isIOS && !currentDevice.supportsSpeechRecognition ? 'DETECTED' : 'N/A'}`);
  
  return {
    device: currentDevice,
    config: currentConfig,
    guidance: currentGuidance,
    debugInfo
  };
};

// Export for use in other tests
export default testMobileDetection;

// Run test if executed directly
if (typeof window !== 'undefined') {
  console.log('Running mobile detection test in browser...');
  testMobileDetection();
}