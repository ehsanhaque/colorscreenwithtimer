/**
 * User Preference Tracker
 * Tracks and saves user preferences like language, timer settings, and UI choices
 */

const PreferenceTracker = (function() {
  'use strict';

  /**
   * Track language selection
   */
  function trackLanguageChange() {
    // Get current page language from URL
    const path = window.location.pathname;

    // Don't update language preference on special pages
    // Only track language on homepage (index pages)
    if (path.includes('/contact')) return;
    if (path.includes('/about')) return;
    if (path.includes('/license')) return;
    if (path.includes('/privacy-policy')) return;
    if (path.includes('/terms-and-conditions')) return;
    if (path.includes('/faq')) return;
    if (path.includes('/cookie-preferences')) return;

    let languageCode = 'en'; // Default

    // Extract language from path (e.g., /de/index.html -> 'de')
    const langMatch = path.match(/^\/([a-z]{2})\//);
    if (langMatch) {
      languageCode = langMatch[1];
    }

    // Save language preference
    if (typeof CookieManager !== 'undefined') {
      CookieManager.saveLanguage(languageCode);
    }
  }

  /**
   * Track timer settings from color screen pages
   */
  function trackTimerSettings() {
    // Look for timer input field
    const timerInput = document.getElementById('timerInput');
    const enableSoundCheckbox = document.getElementById('enableSound');

    if (!timerInput) return;

    // Save timer settings when changed
    const saveSettings = function() {
      const settings = {
        duration: timerInput.value || 0,
        enableSound: enableSoundCheckbox ? enableSoundCheckbox.checked : false,
        lastUsed: new Date().toISOString()
      };

      if (typeof CookieManager !== 'undefined') {
        CookieManager.saveTimerSettings(settings);
      }
    };

    // Add event listeners
    if (timerInput) {
      timerInput.addEventListener('change', saveSettings);
    }

    if (enableSoundCheckbox) {
      enableSoundCheckbox.addEventListener('change', saveSettings);
    }

    // Load saved settings on page load
    if (typeof CookieManager !== 'undefined') {
      const savedSettings = CookieManager.getTimerSettings();
      if (savedSettings) {
        if (timerInput && savedSettings.duration) {
          timerInput.value = savedSettings.duration;
        }
        if (enableSoundCheckbox && typeof savedSettings.enableSound !== 'undefined') {
          enableSoundCheckbox.checked = savedSettings.enableSound;
        }
      }
    }
  }

  /**
   * Track which color screen page the user visited
   */
  function trackColorScreenVisit() {
    const path = window.location.pathname;

    // Check if on a color screen page
    const colorScreens = [
      'blue-screen', 'green-screen', 'red-screen', 'black-screen',
      'yellow-screen', 'orange-screen', 'pink-screen', 'purple-screen',
      'zoom-lighting'
    ];

    for (const screen of colorScreens) {
      if (path.includes(screen)) {
        trackUIPreference('lastColorScreen', screen);
        break;
      }
    }
  }

  /**
   * Generic UI preference tracker
   */
  function trackUIPreference(key, value) {
    if (typeof CookieManager === 'undefined') return;

    // Get existing preferences
    let preferences = CookieManager.getUIPreferences() || {};

    // Update preference
    preferences[key] = value;
    preferences.lastUpdated = new Date().toISOString();

    // Save back
    CookieManager.saveUIPreferences(preferences);
  }

  /**
   * Get a UI preference
   */
  function getUIPreference(key, defaultValue = null) {
    if (typeof CookieManager === 'undefined') return defaultValue;

    const preferences = CookieManager.getUIPreferences();
    if (!preferences || !preferences[key]) return defaultValue;

    return preferences[key];
  }

  /**
   * Initialize preference tracking
   */
  function init() {
    // ALWAYS track language first to save the current page's language
    // This ensures clicking English link saves 'en' before any redirect
    trackLanguageChange();

    // Then apply saved language preference (which may redirect)
    // But since we just saved the current language, the redirect will use the NEW value
    applySavedLanguage();

    // Track color screen visits
    trackColorScreenVisit();

    // Initialize timer tracking if on a color screen page
    if (document.getElementById('timerInput')) {
      trackTimerSettings();
    }

    // Track homepage interactions
    trackHomepageInteractions();
  }

  /**
   * Track homepage color screen selections
   */
  function trackHomepageInteractions() {
    // Only run on homepage
    if (window.location.pathname !== '/' && !window.location.pathname.match(/^\/[a-z]{2}\/?$/)) {
      return;
    }

    // Find all color screen links
    const colorLinks = document.querySelectorAll('a[href*="-screen.html"]');

    colorLinks.forEach(link => {
      link.addEventListener('click', function() {
        const href = this.getAttribute('href');
        const screenName = href.replace('.html', '').replace(/^\//, '');
        trackUIPreference('lastClickedColorScreen', screenName);
      });
    });
  }

  /**
   * Get most recently used color screen
   */
  function getRecentColorScreen() {
    return getUIPreference('lastColorScreen') || getUIPreference('lastClickedColorScreen');
  }

  /**
   * Apply saved language preference (redirect if needed)
   * Returns true if redirecting, false otherwise
   */
  function applySavedLanguage() {
    if (typeof CookieManager === 'undefined') return false;

    const savedLanguage = CookieManager.getLanguage();
    const currentPath = window.location.pathname;

    // Check if user is intentionally changing language
    // If coming from our own site, trust the current URL (user clicked a language link)
    const referrer = document.referrer;
    const isInternalNavigation = referrer && (
      referrer.includes('colorscreenwithtimer.com') ||
      referrer.includes(window.location.host)
    );

    // If internal navigation to homepage, don't redirect - user chose this language
    if (isInternalNavigation && (currentPath === '/' || currentPath === '/index.html')) {
      return false;
    }

    // Don't redirect if on special pages
    if (currentPath.includes('/cookie-preferences')) return false;
    if (currentPath.includes('/contact')) return false;
    if (currentPath.includes('/about')) return false;
    if (currentPath.includes('/license')) return false;
    if (currentPath.includes('/privacy-policy')) return false;
    if (currentPath.includes('/terms-and-conditions')) return false;
    if (currentPath.includes('/faq')) return false;

    // Don't redirect if already on correct language
    if (currentPath.startsWith(`/${savedLanguage}/`)) return false;
    if (savedLanguage === 'en' && (currentPath === '/' || currentPath === '/index.html')) return false;

    // Redirect to saved language when visiting English homepage (external traffic)
    if (currentPath === '/' || currentPath === '/index.html') {
      if (savedLanguage !== 'en') {
        window.location.href = `/${savedLanguage}/`;
        return true; // Will redirect
      }
    }

    return false; // No redirect
  }

  // Public API
  return {
    init: init,
    trackUIPreference: trackUIPreference,
    getUIPreference: getUIPreference,
    getRecentColorScreen: getRecentColorScreen,
    applySavedLanguage: applySavedLanguage
  };
})();

// Initialize preference tracker when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', PreferenceTracker.init);
} else {
  PreferenceTracker.init();
}
