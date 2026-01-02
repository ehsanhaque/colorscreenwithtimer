/**
 * Color Screen with Timer - Main Application Script
 * Modern, modular JavaScript for fullscreen color display with optional timer
 */

// ==========================================
// DOM ELEMENTS
// ==========================================

const elements = {
  screen: document.getElementById('screen'),
  screenContainer: document.querySelector('.screen-container'),
  picker: document.getElementById('picker'),
  fullscreenBtn: document.getElementById('fullscreen'),
  display: document.getElementById('display'),
  startBtn: document.getElementById('start'),
  resetBtn: document.getElementById('reset'),
  soundSelect: document.getElementById('soundSelect'),
  posSelect: document.getElementById('posSelect'),
  fullscreenTimerToggle: document.getElementById('fullscreenTimerToggle'),
  fields: {
    h: document.getElementById('h'),
    m: document.getElementById('m'),
    s: document.getElementById('s')
  }
};

// ==========================================
// TIMER OVERLAY SETUP
// ==========================================

// Only create overlay if screen element exists (i.e., we're on the timer page)
let overlay = null;
let overlayDisplay = null;

if (elements.screen) {
  overlay = document.createElement('div');
  overlay.className = 'timer-overlay';
  overlay.innerHTML = '<span id="overlayDisplay">00:00:00</span>';
  elements.screen.appendChild(overlay);
  overlayDisplay = document.getElementById('overlayDisplay');
}

// ==========================================
// COLOR MANAGEMENT
// ==========================================

// Only run color/timer functionality if we're on a page with the screen element
if (elements.screen && elements.picker) {

  /**
   * Sets the screen background color and updates the color picker
   * @param {string} color - Hex color code
   */
  function setColor(color) {
    elements.screenContainer.style.background = color;
    elements.screen.style.background = color;
    elements.picker.value = color;

    // Save color preference to cookies
    if (typeof CookieManager !== 'undefined') {
      CookieManager.saveUIPreferences({ selectedColor: color });
    }
  }

  // Color picker event listener
  elements.picker.addEventListener('input', (e) => {
    setColor(e.target.value);
  });

  // Preset color buttons event listeners
  document.querySelectorAll('[data-color]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setColor(btn.dataset.color);
    });
  });

  // Load saved color preference or use default
  let initialColor = elements.picker.value;
  if (typeof CookieManager !== 'undefined') {
    const savedPrefs = CookieManager.getUIPreferences();
    if (savedPrefs && savedPrefs.selectedColor) {
      initialColor = savedPrefs.selectedColor;
    }
  }
  setColor(initialColor);

// ==========================================
// FULLSCREEN MANAGEMENT
// ==========================================

/**
 * Toggles fullscreen mode for the color screen
 */
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    elements.screenContainer.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

/**
 * Updates fullscreen button visibility
 */
function updateFullscreenButtonVisibility() {
  const isFullscreen = !!document.fullscreenElement;
  if (isFullscreen) {
    elements.fullscreenBtn.style.display = 'none';
  } else {
    elements.fullscreenBtn.style.display = 'inline-flex';
  }
}

// Fullscreen button click
elements.fullscreenBtn.addEventListener('click', toggleFullscreen);

// Keyboard shortcut: F key for fullscreen
document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'f' && e.target.tagName !== 'INPUT') {
    e.preventDefault();
    toggleFullscreen();
  }
});

// Listen for fullscreen changes to hide/show button
document.addEventListener('fullscreenchange', updateFullscreenButtonVisibility);

// ==========================================
// TIMER FUNCTIONALITY
// ==========================================

let remaining = 0; // Remaining time in milliseconds
let target = 0; // Target timestamp
let running = false; // Timer running state
let loop = null; // Interval ID

/**
 * Formats milliseconds into HH:MM:SS format
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time string
 */
function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds / 60) % 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Updates the timer display (both main and overlay)
 */
function updateDisplay() {
  const formattedTime = formatTime(remaining);
  elements.display.textContent = formattedTime;
  overlayDisplay.textContent = formattedTime;
}

/**
 * Calculates remaining time from input fields
 */
function setFromInputs() {
  const hours = parseInt(elements.fields.h.value) || 0;
  const minutes = parseInt(elements.fields.m.value) || 0;
  const seconds = parseInt(elements.fields.s.value) || 0;

  remaining = (hours * 3600 + minutes * 60 + seconds) * 1000;
  updateDisplay();
}

/**
 * Starts the countdown timer
 */
function startTimer() {
  setFromInputs();

  if (remaining <= 0) {
    return; // Don't start if time is 0
  }

  target = Date.now() + remaining;
  running = true;
  ensureAudioContext();

  loop = setInterval(() => {
    remaining = target - Date.now();

    if (remaining <= 0) {
      remaining = 0;
      stopTimer(false);
      onTimerComplete();
    }

    updateDisplay();
  }, 150);
}

/**
 * Stops the countdown timer
 * @param {boolean} log - Whether to log the stop (unused, kept for compatibility)
 */
function stopTimer(log = true) {
  running = false;
  clearInterval(loop);
}

/**
 * Resets the timer to initial input values
 */
function resetTimer() {
  stopTimer();
  setFromInputs();
}

// Timer input field listeners
['h', 'm', 's'].forEach((key) => {
  elements.fields[key].addEventListener('input', setFromInputs);
});

// Start/Pause button
elements.startBtn.addEventListener('click', () => {
  if (running) {
    stopTimer();
  } else {
    startTimer();
  }
});

// Reset button
elements.resetBtn.addEventListener('click', resetTimer);

// Initialize timer display
setFromInputs();

// ==========================================
// AUDIO MANAGEMENT
// ==========================================

let sharedAudioContext = null;

/**
 * Ensures audio context is initialized and resumed
 */
async function ensureAudioContext() {
  try {
    if (!sharedAudioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      sharedAudioContext = new AudioContext();
    }

    if (sharedAudioContext.state === 'suspended') {
      await sharedAudioContext.resume();
    }
  } catch (e) {
    console.warn('Audio context initialization failed:', e);
  }
}

/**
 * Generates a tone using Web Audio API
 * @param {Object} options - Tone configuration
 */
function generateTone({ freq = 660, duration = 0.5, type = 'sine', vol = 0.35 }) {
  try {
    if (!sharedAudioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      sharedAudioContext = new AudioContext();
    }

    const oscillator = sharedAudioContext.createOscillator();
    const gainNode = sharedAudioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = freq;
    gainNode.gain.value = vol;

    oscillator.connect(gainNode).connect(sharedAudioContext.destination);
    oscillator.start();
    oscillator.stop(sharedAudioContext.currentTime + duration);
  } catch (e) {
    console.warn('Tone generation failed:', e);
  }
}

// Sound effect functions
function playBeep() {
  generateTone({ freq: 880, duration: 0.2, type: 'sine' });
}

function playDing() {
  generateTone({ freq: 660, duration: 0.6, type: 'sine' });
}

function playChime() {
  generateTone({ freq: 880, duration: 0.4, type: 'triangle' });
  setTimeout(() => {
    generateTone({ freq: 660, duration: 0.4, type: 'triangle' });
  }, 120);
}

function playBuzzer() {
  generateTone({ freq: 220, duration: 0.5, type: 'square', vol: 0.4 });
}

function playPing() {
  generateTone({ freq: 1200, duration: 0.25, type: 'sine' });
}

/**
 * Plays the selected sound effect
 */
async function playSound() {
  const soundType = elements.soundSelect.value;

  // Skip sound if "none" is selected
  if (soundType === 'none') {
    return;
  }

  await ensureAudioContext();

  switch (soundType) {
    case 'beep':
      playBeep();
      break;
    case 'ding':
      playDing();
      break;
    case 'chime':
      playChime();
      break;
    case 'buzzer':
      playBuzzer();
      break;
    case 'ping':
      playPing();
      break;
    default:
      playBeep();
  }
}

/**
 * Handles timer completion (sound + visual effect)
 */
function onTimerComplete() {
  playSound();

  // Pulse animation
  elements.screenContainer.animate(
    [
      { opacity: 1 },
      { opacity: 0.7 },
      { opacity: 1 }
    ],
    {
      duration: 800,
      easing: 'ease-in-out'
    }
  );
}

// ==========================================
// OVERLAY POSITION MANAGEMENT
// ==========================================

/**
 * Updates timer overlay visibility based on fullscreen state
 */
function updateOverlayVisibility() {
  const isFullscreen = !!document.fullscreenElement;
  const isScreenFullscreen = elements.screenContainer.contains(document.fullscreenElement);
  const showTimer = elements.fullscreenTimerToggle.checked;

  const shouldShow = isFullscreen && isScreenFullscreen && showTimer;
  overlay.classList.toggle('visible', shouldShow);
}

/**
 * Applies overlay position class
 * @param {string} positionClass - CSS class for position
 */
function applyOverlayPosition(positionClass) {
  overlay.className = `timer-overlay ${positionClass}`;
  updateOverlayVisibility(); // Preserve visibility state
}

/**
 * Updates position dropdown enabled/disabled state
 */
function updatePositionDropdownState() {
  const isEnabled = elements.fullscreenTimerToggle.checked;
  elements.posSelect.disabled = !isEnabled;

  // Add visual styling for disabled state
  if (!isEnabled) {
    elements.posSelect.style.opacity = '0.5';
    elements.posSelect.style.cursor = 'not-allowed';
  } else {
    elements.posSelect.style.opacity = '1';
    elements.posSelect.style.cursor = 'pointer';
  }
}

// Position select change
elements.posSelect.addEventListener('change', (e) => {
  applyOverlayPosition(e.target.value);
});

// Timer toggle change
elements.fullscreenTimerToggle.addEventListener('change', () => {
  updateOverlayVisibility();
  updatePositionDropdownState();
});

// Fullscreen state change
document.addEventListener('fullscreenchange', updateOverlayVisibility);

// Initialize overlay position and dropdown state
applyOverlayPosition(elements.posSelect.value);
updatePositionDropdownState();

// ==========================================
// KEYBOARD SHORTCUTS
// ==========================================

document.addEventListener('keydown', (e) => {
  // Ignore shortcuts when typing in input fields
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
    return;
  }

  // Space: Start/Pause timer
  if (e.code === 'Space') {
    e.preventDefault();
    if (running) {
      stopTimer();
    } else {
      startTimer();
    }
  }

  // R: Reset timer
  if (e.key.toLowerCase() === 'r') {
    e.preventDefault();
    resetTimer();
  }
});

} // End of screen/timer functionality block

// ==========================================
// LANGUAGE DROPDOWN
// ==========================================

function langChoose() {
  const dropdown = document.getElementById("langDropdown");
  dropdown.classList.toggle("lang-show");

  // Position dropdown correctly to avoid clipping
  if (dropdown.classList.contains("lang-show")) {
    const button = event.target;
    const rect = button.getBoundingClientRect();
    dropdown.style.position = "fixed";
    dropdown.style.top = (rect.bottom + 5) + "px";
    dropdown.style.right = (window.innerWidth - rect.right) + "px";
    dropdown.style.left = "auto";
  }
}

// Close dropdown when clicking outside
window.onclick = function(event) {
  if (!event.target.matches('.lang-dropbtn')) {
    const dropdowns = document.getElementsByClassName("lang-dropdown-content");
    for (let i = 0; i < dropdowns.length; i++) {
      const openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('lang-show')) {
        openDropdown.classList.remove('lang-show');
      }
    }
  }
}

// ==========================================
// ACTIVE PAGE HIGHLIGHTING
// ==========================================

/**
 * Highlights the active page in navigation menu
 */
function highlightActivePage() {
  // Get current page filename from the URL
  let currentPage = window.location.pathname.split('/').pop();

  // Handle root path or empty string
  if (!currentPage || currentPage === '' || currentPage === '/') {
    currentPage = 'index.html';
  }

  console.log('Current page:', currentPage);

  // Get all navigation links
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    // Get the href attribute
    const href = link.getAttribute('href');

    console.log('Checking link:', href, 'against', currentPage);

    // Remove any existing active class first
    link.classList.remove('active');

    // Check if this link matches the current page
    if (href === currentPage) {
      link.classList.add('active');
      console.log('✓ Active link found:', href);
    }
  });
}

// Run on page load - use multiple methods to ensure it runs
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', highlightActivePage);
} else {
  // DOM already loaded, run immediately
  highlightActivePage();
}

// Also run after window fully loads as backup
window.addEventListener('load', highlightActivePage);

// ==========================================
// MOBILE MENU TOGGLES
// ==========================================

const hamburgerMenu = document.getElementById('hamburgerMenu');
const navMenu = document.getElementById('navMenu');
const mobileLangBtn = document.getElementById('mobileLangBtn');
const mobileLangMenu = document.getElementById('mobileLangMenu');
const mobileControls = document.querySelector('.mobile-controls');

// Function to close nav menu
function closeMenu() {
  if (hamburgerMenu && navMenu) {
    hamburgerMenu.classList.remove('active');
    navMenu.classList.remove('active');
    hamburgerMenu.setAttribute('aria-expanded', 'false');
    if (mobileControls) mobileControls.classList.remove('menu-open');
    document.body.style.overflow = '';
  }
}

// Function to open nav menu
function openMenu() {
  if (hamburgerMenu && navMenu) {
    // Close language menu if open
    closeLangMenu();
    hamburgerMenu.classList.add('active');
    navMenu.classList.add('active');
    hamburgerMenu.setAttribute('aria-expanded', 'true');
    if (mobileControls) mobileControls.classList.add('menu-open');
    document.body.style.overflow = 'hidden';
  }
}

// Function to close language menu
function closeLangMenu() {
  if (mobileLangBtn && mobileLangMenu) {
    mobileLangBtn.classList.remove('active');
    mobileLangMenu.classList.remove('active');
    mobileLangBtn.setAttribute('aria-expanded', 'false');
    if (mobileControls) mobileControls.classList.remove('menu-open');
    document.body.style.overflow = '';
  }
}

// Function to open language menu
function openLangMenu() {
  if (mobileLangBtn && mobileLangMenu) {
    // Close nav menu if open
    closeMenu();
    mobileLangBtn.classList.add('active');
    mobileLangMenu.classList.add('active');
    mobileLangBtn.setAttribute('aria-expanded', 'true');
    if (mobileControls) mobileControls.classList.add('menu-open');
    document.body.style.overflow = 'hidden';
  }
}

// Hamburger menu
if (hamburgerMenu && navMenu) {
  hamburgerMenu.addEventListener('click', () => {
    const isExpanded = navMenu.classList.contains('active');
    if (isExpanded) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Close menu when clicking on a nav link
  const navLinks = navMenu.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });
}

// Language menu
if (mobileLangBtn && mobileLangMenu) {
  mobileLangBtn.addEventListener('click', () => {
    const isExpanded = mobileLangMenu.classList.contains('active');
    if (isExpanded) {
      closeLangMenu();
    } else {
      openLangMenu();
    }
  });

  // Don't add click handlers to language links - let them navigate naturally
  // The page load initialization will reset the menu state
}

// Close both menus when clicking outside
document.addEventListener('click', (e) => {
  const mobileControls = document.querySelector('.mobile-controls');
  if (mobileControls && !mobileControls.contains(e.target) &&
      !navMenu.contains(e.target) && !mobileLangMenu.contains(e.target)) {
    closeMenu();
    closeLangMenu();
  }
});

// Close both menus on window resize to desktop size
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    closeMenu();
    closeLangMenu();
  }
});

// Ensure menus are closed on page load
if (mobileControls) {
  mobileControls.classList.remove('menu-open');
}
if (navMenu) {
  navMenu.classList.remove('active');
}
if (mobileLangMenu) {
  mobileLangMenu.classList.remove('active');
}
if (hamburgerMenu) {
  hamburgerMenu.classList.remove('active');
}
if (mobileLangBtn) {
  mobileLangBtn.classList.remove('active');
}

// ==========================================
// INITIALIZATION
// ==========================================

console.log('%c Color Screen with Timer ', 'background: linear-gradient(135deg, #06b6d4, #a855f7); color: white; font-size: 16px; padding: 8px 16px; border-radius: 8px;');
console.log('Keyboard shortcuts:');
console.log('  F - Toggle fullscreen');
console.log('  Space - Start/Pause timer');
console.log('  R - Reset timer');
