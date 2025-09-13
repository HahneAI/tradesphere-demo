/**
 * Enhanced Puppeteer Login Test Script
 * Fixes React form interaction issues for automated login
 */

const APP_URL = 'http://localhost:5173'; // Local dev server (fallback)
const DEPLOYED_URL = 'https://full-code.netlify.app'; // Live production URL

// Test credentials
const TEST_USER = {
  firstName: 'pup',
  betaCodeId: '97'
};

async function enhancedFormFill(pageId, selector, value) {
  console.log(`📝 Enhanced form fill: ${selector} = "${value}"`);
  
  try {
    // Step 1: Focus the field
    console.log('🎯 Focusing field...');
    await mcp__puppeteer_stealth__puppeteer_click(pageId, selector);
    await delay(200);
    
    // Step 2: Clear existing content completely
    console.log('🧹 Clearing field...');
    await mcp__puppeteer_stealth__puppeteer_evaluate(pageId, `
      const field = document.querySelector('${selector}');
      if (field) {
        field.focus();
        field.select();
        field.value = '';
        
        // Trigger events for React
        field.dispatchEvent(new Event('focus', { bubbles: true }));
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `);
    await delay(300);
    
    // Step 3: Type character by character with events
    console.log('⌨️ Typing character by character...');
    for (let i = 0; i < value.length; i++) {
      const char = value[i];
      
      // Type the character
      await mcp__puppeteer_stealth__puppeteer_evaluate(pageId, `
        const field = document.querySelector('${selector}');
        if (field) {
          const currentValue = field.value;
          field.value = currentValue + '${char}';
          
          // Trigger comprehensive event chain for React
          field.dispatchEvent(new KeyboardEvent('keydown', { 
            key: '${char}', 
            bubbles: true, 
            cancelable: true 
          }));
          
          field.dispatchEvent(new Event('input', { 
            bubbles: true, 
            cancelable: true 
          }));
          
          field.dispatchEvent(new KeyboardEvent('keyup', { 
            key: '${char}', 
            bubbles: true, 
            cancelable: true 
          }));
          
          field.dispatchEvent(new Event('change', { 
            bubbles: true, 
            cancelable: true 
          }));
        }
      `);
      
      // Small delay between characters to simulate human typing
      await delay(50 + Math.random() * 100); // 50-150ms variance
    }
    
    // Step 4: Final blur to complete the interaction
    console.log('👋 Blurring field...');
    await mcp__puppeteer_stealth__puppeteer_evaluate(pageId, `
      const field = document.querySelector('${selector}');
      if (field) {
        field.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    `);
    await delay(200);
    
    console.log(`✅ Enhanced form fill completed for ${selector}`);
    
  } catch (error) {
    console.error(`❌ Enhanced form fill failed for ${selector}:`, error);
    throw error;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeDebugScreenshot(pageId, step, description) {
  const filename = `debug-${step}-${description.replace(/\s+/g, '-').toLowerCase()}.png`;
  console.log(`📸 Taking screenshot: ${filename}`);
  
  try {
    await mcp__puppeteer_stealth__puppeteer_screenshot(pageId, {
      path: filename,
      fullPage: true
    });
    console.log(`✅ Screenshot saved: ${filename}`);
  } catch (error) {
    console.log(`⚠️ Screenshot failed: ${error.message}`);
  }
}

async function monitorConsole(pageId, actionDescription) {
  console.log(`🔍 Monitoring console for: ${actionDescription}`);
  
  try {
    const consoleOutput = await mcp__puppeteer_stealth__puppeteer_evaluate(pageId, `
      // Capture console logs and errors
      const logs = [];
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;
      
      console.log = (...args) => {
        logs.push({type: 'log', message: args.join(' ')});
        originalLog.apply(console, args);
      };
      
      console.error = (...args) => {
        logs.push({type: 'error', message: args.join(' ')});
        originalError.apply(console, args);
      };
      
      console.warn = (...args) => {
        logs.push({type: 'warn', message: args.join(' ')});
        originalWarn.apply(console, args);
      };
      
      // Return current page state info
      ({
        url: window.location.href,
        title: document.title,
        readyState: document.readyState,
        activeElement: document.activeElement?.tagName || 'none',
        formElements: Array.from(document.querySelectorAll('input, button')).length
      });
    `);
    
    console.log('🔍 Page state:', consoleOutput);
    
  } catch (error) {
    console.log(`⚠️ Console monitoring failed: ${error.message}`);
  }
}

async function testPuppeteerLogin() {
  const pageId = 'login-test-page';
  
  try {
    console.log('🚀 Starting Enhanced Puppeteer Login Test');
    console.log('=====================================');
    
    // Step 1: Launch stealth browser
    console.log('🌐 Launching stealth browser...');
    await mcp__puppeteer_stealth__puppeteer_launch({
      headless: false,
      stealth: true,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-first-run", 
        "--disable-default-apps"
      ],
      viewport: { width: 1400, height: 900 }
    });
    
    // Step 2: Create new page
    console.log('📄 Creating new page...');
    await mcp__puppeteer_stealth__puppeteer_new_page(pageId);
    
    // Step 3: Navigate to app (try localhost first, then deployed)
    console.log('🧭 Navigating to app...');
    let targetUrl = APP_URL;
    
    try {
      await mcp__puppeteer_stealth__puppeteer_navigate(pageId, APP_URL, 'domcontentloaded');
      console.log(`✅ Successfully loaded: ${APP_URL}`);
    } catch (error) {
      console.log(`⚠️ Localhost failed, trying deployed URL: ${DEPLOYED_URL}`);
      targetUrl = DEPLOYED_URL;
      await mcp__puppeteer_stealth__puppeteer_navigate(pageId, DEPLOYED_URL, 'domcontentloaded');
    }
    
    await delay(2000); // Wait for React to initialize
    
    // Step 4: Take initial screenshot
    await takeDebugScreenshot(pageId, '01', 'initial load');
    await monitorConsole(pageId, 'Initial page load');
    
    // Step 5: Check bot detection bypass
    console.log('🕵️ Verifying bot detection bypass...');
    const detectionCheck = await mcp__puppeteer_stealth__puppeteer_evaluate(pageId, `
      ({
        webdriver: navigator.webdriver,
        userAgent: navigator.userAgent.slice(0, 50) + '...',
        plugins: navigator.plugins.length,
        languages: navigator.languages.length
      });
    `);
    
    console.log('🔍 Bot detection check:', detectionCheck);
    
    if (detectionCheck.webdriver) {
      console.log('❌ WARNING: navigator.webdriver is true - bot detection may block login');
    } else {
      console.log('✅ Bot detection bypass successful');
    }
    
    // Step 6: Wait for and locate login form
    console.log('🔍 Waiting for login form...');
    
    try {
      await mcp__puppeteer_stealth__puppeteer_wait_for_selector(pageId, 'input[id="firstName"]', 10000);
      console.log('✅ Login form found');
    } catch (error) {
      console.log('⚠️ Direct selector failed, checking for existing user mode...');
      
      // Try to click existing user tab
      const existingUserTab = await mcp__puppeteer_stealth__puppeteer_evaluate(pageId, `
        const tabs = Array.from(document.querySelectorAll('button'));
        const existingTab = tabs.find(tab => 
          tab.textContent && tab.textContent.includes('Existing User')
        );
        
        if (existingTab) {
          existingTab.click();
          return true;
        }
        return false;
      `);
      
      if (existingUserTab) {
        console.log('✅ Clicked existing user tab');
        await delay(500);
        await takeDebugScreenshot(pageId, '02', 'existing user tab clicked');
      }
    }
    
    // Step 7: Enhanced form filling
    console.log('📝 Starting enhanced form filling...');
    
    // Fill first name field
    console.log('👤 Filling first name field...');
    await enhancedFormFill(pageId, 'input[id="firstName"]', TEST_USER.firstName);
    await takeDebugScreenshot(pageId, '03', 'first name filled');
    
    // Fill beta code ID field  
    console.log('🔑 Filling beta code ID field...');
    await enhancedFormFill(pageId, 'input[id="betaCodeId"]', TEST_USER.betaCodeId);
    await takeDebugScreenshot(pageId, '04', 'beta code id filled');
    
    await monitorConsole(pageId, 'Form fields filled');
    
    // Step 8: Submit form
    console.log('🚀 Submitting form...');
    
    const submitResult = await mcp__puppeteer_stealth__puppeteer_evaluate(pageId, `
      const submitButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent && (
          btn.textContent.includes('Sign In') || 
          btn.textContent.includes('Login') ||
          btn.textContent.includes('Submit')
        )
      );
      
      if (submitButton) {
        console.log('🎯 Submit button found:', submitButton.textContent);
        submitButton.click();
        return { success: true, buttonText: submitButton.textContent };
      } else {
        console.log('❌ Submit button not found');
        const allButtons = Array.from(document.querySelectorAll('button')).map(b => b.textContent);
        console.log('Available buttons:', allButtons);
        return { success: false, availableButtons: allButtons };
      }
    `);
    
    console.log('🎯 Submit result:', submitResult);
    await delay(1000);
    
    // Step 9: Wait for result and take screenshots
    await takeDebugScreenshot(pageId, '05', 'after submit');
    
    // Step 10: Check for successful login or errors
    console.log('🔍 Checking login result...');
    
    const loginResult = await mcp__puppeteer_stealth__puppeteer_evaluate(pageId, `
      const currentUrl = window.location.href;
      const hasErrorMessage = !!document.querySelector('[class*="error"], [class*="alert"], .text-red-700');
      const hasSuccessMessage = !!document.querySelector('[class*="success"], [class*="green"]');
      const hasChatInterface = !!document.querySelector('[class*="chat"], [placeholder*="message"]');
      
      let errorText = '';
      const errorElement = document.querySelector('[class*="error"], [class*="alert"], .text-red-700');
      if (errorElement) {
        errorText = errorElement.textContent || errorElement.innerText || '';
      }
      
      return {
        url: currentUrl,
        hasError: hasErrorMessage,
        hasSuccess: hasSuccessMessage,
        hasChatInterface: hasChatInterface,
        errorText: errorText.trim(),
        title: document.title
      };
    `);
    
    console.log('📊 Login result analysis:', loginResult);
    
    // Step 11: Final status
    if (loginResult.hasChatInterface) {
      console.log('🎉 SUCCESS: Login successful - chat interface detected!');
      await takeDebugScreenshot(pageId, '06', 'login success');
    } else if (loginResult.hasError) {
      console.log('❌ FAILED: Login error detected');
      console.log('🔍 Error message:', loginResult.errorText);
      await takeDebugScreenshot(pageId, '06', 'login error');
    } else {
      console.log('⚠️ UNCLEAR: Login result unclear, check screenshots');
      await takeDebugScreenshot(pageId, '06', 'unclear result');
    }
    
    // Keep browser open for manual inspection
    console.log('🔍 Browser will remain open for manual inspection...');
    console.log('❓ Check the browser window to verify the login result');
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
    await takeDebugScreenshot(pageId, '99', 'error state');
  }
}

// Export for use in Claude Code MCP environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testPuppeteerLogin, enhancedFormFill };
} else {
  // Run directly when called
  console.log('🎬 Executing Enhanced Puppeteer Login Test...');
  testPuppeteerLogin();
}