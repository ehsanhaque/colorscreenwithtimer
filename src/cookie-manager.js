/**
 * Cookie Manager - First-party cookie management for Color Screen with Timer
 * Handles user consent and preference storage
 */

const CookieManager = (function() {
  'use strict';

  // Cookie names
  const COOKIES = {
    CONSENT: 'cswt_cookie_consent',
    CONSENT_DATE: 'cswt_consent_date',
    LANGUAGE: 'cswt_language',
    TIMER_SETTINGS: 'cswt_timer_settings',
    UI_PREFERENCES: 'cswt_ui_preferences'
  };

  // Cookie expiration (365 days)
  const COOKIE_EXPIRY_DAYS = 365;

  /**
   * Set a cookie
   */
  function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  }

  /**
   * Get a cookie value
   */
  function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
    return null;
  }

  /**
   * Delete a cookie
   */
  function deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  }

  /**
   * Check if user has given consent
   */
  function hasConsent() {
    return getCookie(COOKIES.CONSENT) !== null;
  }

  /**
   * Get current consent settings
   */
  function getConsent() {
    const consentStr = getCookie(COOKIES.CONSENT);
    if (!consentStr) {
      return {
        essential: false,
        analytics: false,
        advertising: false
      };
    }

    try {
      return JSON.parse(consentStr);
    } catch (e) {
      return {
        essential: false,
        analytics: false,
        advertising: false
      };
    }
  }

  /**
   * Set consent settings
   */
  function setConsent(consent) {
    const consentObj = {
      essential: true, // Always true
      analytics: !!consent.analytics,
      advertising: !!consent.advertising
    };

    setCookie(COOKIES.CONSENT, JSON.stringify(consentObj), COOKIE_EXPIRY_DAYS);
    setCookie(COOKIES.CONSENT_DATE, new Date().toISOString(), COOKIE_EXPIRY_DAYS);

    // Trigger consent update event
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: consentObj }));

    // Load or remove third-party scripts based on consent
    updateThirdPartyScripts(consentObj);
  }

  /**
   * Update third-party scripts based on consent
   */
  function updateThirdPartyScripts(consent) {
    // Google Analytics
    if (consent.analytics) {
      loadGoogleAnalytics();
    } else {
      removeGoogleAnalytics();
    }

    // Google AdSense
    if (consent.advertising) {
      loadGoogleAdsense();
    } else {
      removeGoogleAdsense();
    }
  }

  /**
   * Load Google Analytics (placeholder - add your GA ID)
   */
  function loadGoogleAnalytics() {
    if (window.gtag) return; // Already loaded

    // TODO: Replace with your Google Analytics ID
    const GA_ID = 'G-XXXXXXXXXX';

    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script1);

    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID);
  }

  /**
   * Remove Google Analytics
   */
  function removeGoogleAnalytics() {
    // Remove GA cookies
    deleteCookie('_ga');
    deleteCookie('_gid');
    deleteCookie('_gat');
  }

  /**
   * Load Google AdSense (placeholder - add your AdSense ID)
   */
  function loadGoogleAdsense() {
    if (document.querySelector('script[src*="adsbygoogle"]')) return; // Already loaded

    // TODO: Replace with your AdSense publisher ID
    // const script = document.createElement('script');
    // script.async = true;
    // script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXX';
    // script.crossOrigin = 'anonymous';
    // document.head.appendChild(script);
  }

  /**
   * Remove Google AdSense
   */
  function removeGoogleAdsense() {
    // Remove AdSense related elements
    const adsenseScripts = document.querySelectorAll('script[src*="adsbygoogle"]');
    adsenseScripts.forEach(script => script.remove());
  }

  // ==================== User Preference Management ====================

  /**
   * Save language preference
   */
  function saveLanguage(languageCode) {
    setCookie(COOKIES.LANGUAGE, languageCode, COOKIE_EXPIRY_DAYS);
  }

  /**
   * Get language preference
   */
  function getLanguage() {
    return getCookie(COOKIES.LANGUAGE) || 'en';
  }

  /**
   * Save timer settings
   */
  function saveTimerSettings(settings) {
    setCookie(COOKIES.TIMER_SETTINGS, JSON.stringify(settings), COOKIE_EXPIRY_DAYS);
  }

  /**
   * Get timer settings
   */
  function getTimerSettings() {
    const settingsStr = getCookie(COOKIES.TIMER_SETTINGS);
    if (!settingsStr) return null;

    try {
      return JSON.parse(settingsStr);
    } catch (e) {
      return null;
    }
  }

  /**
   * Save UI preferences (last used color screen, etc.)
   */
  function saveUIPreferences(preferences) {
    setCookie(COOKIES.UI_PREFERENCES, JSON.stringify(preferences), COOKIE_EXPIRY_DAYS);
  }

  /**
   * Get UI preferences
   */
  function getUIPreferences() {
    const prefsStr = getCookie(COOKIES.UI_PREFERENCES);
    if (!prefsStr) return null;

    try {
      return JSON.parse(prefsStr);
    } catch (e) {
      return null;
    }
  }

  // ==================== Cookie Banner Management ====================

  /**
   * Show cookie banner
   */
  function showBanner() {
    const banner = document.getElementById('cookie-banner');
    if (banner) {
      banner.style.display = 'flex';
      // Add animation
      setTimeout(() => {
        banner.classList.add('show');
      }, 100);
    }
  }

  /**
   * Hide cookie banner
   */
  function hideBanner() {
    const banner = document.getElementById('cookie-banner');
    if (banner) {
      banner.classList.remove('show');
      setTimeout(() => {
        banner.style.display = 'none';
      }, 300);
    }
  }

  /**
   * Initialize cookie manager
   */
  function init() {
    // Check if consent has been given
    if (!hasConsent()) {
      // Show banner on first visit
      showBanner();
    } else {
      // Apply existing consent settings
      const consent = getConsent();
      updateThirdPartyScripts(consent);
    }
  }

  // Public API
  return {
    init: init,
    hasConsent: hasConsent,
    getConsent: getConsent,
    setConsent: setConsent,
    showBanner: showBanner,
    hideBanner: hideBanner,
    saveLanguage: saveLanguage,
    getLanguage: getLanguage,
    saveTimerSettings: saveTimerSettings,
    getTimerSettings: getTimerSettings,
    saveUIPreferences: saveUIPreferences,
    getUIPreferences: getUIPreferences
  };
})();

// Initialize cookie manager when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', CookieManager.init);
} else {
  CookieManager.init();
}
