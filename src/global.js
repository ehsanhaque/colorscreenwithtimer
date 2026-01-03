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
let overlayTextNode = null;

if (elements.screen) {
  overlay = document.createElement('div');
  overlay.className = 'timer-overlay';

  overlayDisplay = document.createElement('span');
  overlayDisplay.id = 'overlayDisplay';

  // Create text node and store reference
  overlayTextNode = document.createTextNode('00:00:00');
  overlayDisplay.appendChild(overlayTextNode);

  // Add corner elements
  const cornerTL = document.createElement('div');
  cornerTL.className = 'corner-tl';
  overlayDisplay.appendChild(cornerTL);

  const cornerTR = document.createElement('div');
  cornerTR.className = 'corner-tr';
  overlayDisplay.appendChild(cornerTR);

  const cornerBL = document.createElement('div');
  cornerBL.className = 'corner-bl';
  overlayDisplay.appendChild(cornerBL);

  const cornerBR = document.createElement('div');
  cornerBR.className = 'corner-br';
  overlayDisplay.appendChild(cornerBR);

  overlay.appendChild(overlayDisplay);
  elements.screen.appendChild(overlay);

  // Make timer overlay draggable and resizable by font size
  let isDragging = false;
  let isResizing = false;
  let currentX, currentY, initialX, initialY;
  let xOffset = 0;
  let yOffset = 0;
  let startFontSize, startMouseX, startMouseY;
  let resizeCorner = null;
  let clickTimeout = null;

  const corners = overlay.querySelectorAll('.corner-tl, .corner-tr, .corner-bl, .corner-br');

  // Click/tap on text to show corners and enable drag
  overlayDisplay.addEventListener('mousedown', handleTextMouseDown);
  overlayDisplay.addEventListener('touchstart', handleTextTouchStart, { passive: false });

  // Corner resize events
  corners.forEach(corner => {
    corner.addEventListener('mousedown', resizeStart);
    corner.addEventListener('touchstart', resizeStart, { passive: false });
  });

  document.addEventListener('mousemove', handleMove);
  document.addEventListener('touchmove', handleMove, { passive: false });
  document.addEventListener('mouseup', handleEnd);
  document.addEventListener('touchend', handleEnd);

  function handleTextMouseDown(e) {
    // Don't start drag if clicking on a corner
    if (e.target.classList.contains('corner-tl') ||
        e.target.classList.contains('corner-tr') ||
        e.target.classList.contains('corner-bl') ||
        e.target.classList.contains('corner-br')) {
      return;
    }

    e.preventDefault(); // Prevent text selection

    const clientX = e.clientX;
    const clientY = e.clientY;

    const rect = overlay.getBoundingClientRect();
    const parentRect = overlay.parentElement.getBoundingClientRect();

    // Calculate offset from mouse position to element position
    initialX = clientX - rect.left + parentRect.left;
    initialY = clientY - rect.top + parentRect.top;

    isDragging = true;
    overlay.classList.add('dragging');
    overlayDisplay.style.cursor = 'grabbing';
  }

  function handleTextTouchStart(e) {
    // Don't start drag if touching a corner
    if (e.target.classList.contains('corner-tl') ||
        e.target.classList.contains('corner-tr') ||
        e.target.classList.contains('corner-bl') ||
        e.target.classList.contains('corner-br')) {
      return;
    }

    e.preventDefault();

    // Show corners on touch
    overlayDisplay.classList.add('active');

    const clientX = e.touches[0].clientX;
    const clientY = e.touches[0].clientY;

    const rect = overlay.getBoundingClientRect();
    const parentRect = overlay.parentElement.getBoundingClientRect();

    // Calculate offset from touch position to element position
    initialX = clientX - rect.left + parentRect.left;
    initialY = clientY - rect.top + parentRect.top;

    isDragging = true;
    overlay.classList.add('dragging');
  }

  function resizeStart(e) {
    e.stopPropagation();
    e.preventDefault();

    if (clickTimeout) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
    }

    overlayDisplay.classList.add('active');
    isResizing = true;
    resizeCorner = e.target;

    // Get current computed font size
    const computedStyle = window.getComputedStyle(overlayDisplay);
    startFontSize = parseFloat(computedStyle.fontSize);
    startMouseX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    startMouseY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
  }

  function handleMove(e) {
    if (isResizing) {
      e.preventDefault();

      const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
      const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

      // Calculate movement deltas
      const deltaX = clientX - startMouseX;
      const deltaY = clientY - startMouseY;

      // Calculate which corner is being dragged to determine proper direction
      const corner = resizeCorner.className;
      let scaleFactor = 0;

      // For each corner, dragging away from center = positive, towards center = negative
      if (corner.includes('corner-br')) {
        scaleFactor = deltaX + deltaY; // bottom-right: drag right/down to increase
      } else if (corner.includes('corner-bl')) {
        scaleFactor = -deltaX + deltaY; // bottom-left: drag left/down to increase
      } else if (corner.includes('corner-tr')) {
        scaleFactor = deltaX - deltaY; // top-right: drag right/up to increase
      } else if (corner.includes('corner-tl')) {
        scaleFactor = -deltaX - deltaY; // top-left: drag left/up to increase
      }

      // Scale factor: 1px movement = 0.5px font size change
      const newFontSize = Math.max(16, Math.min(400, startFontSize + (scaleFactor * 0.5)));

      overlay.style.fontSize = newFontSize + 'px';

    } else if (isDragging) {
      e.preventDefault();

      const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
      const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

      // Get parent dimensions for boundary checking
      const parent = overlay.parentElement;
      const parentRect = parent.getBoundingClientRect();
      const overlayRect = overlay.getBoundingClientRect();

      // Calculate new position (mouse position - initial offset)
      let newX = clientX - initialX;
      let newY = clientY - initialY;

      // Calculate boundaries
      const maxX = parentRect.width - overlayRect.width;
      const maxY = parentRect.height - overlayRect.height;

      // Constrain to parent boundaries
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      overlay.style.left = newX + 'px';
      overlay.style.top = newY + 'px';
    }
  }

  function handleEnd(e) {
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
    }

    if (isDragging) {
      isDragging = false;
      overlay.classList.remove('dragging');
      overlayDisplay.style.cursor = 'grab';
    }

    if (isResizing) {
      isResizing = false;
    }

    // Hide corners after 2 seconds of inactivity
    setTimeout(() => {
      if (!isDragging && !isResizing) {
        overlayDisplay.classList.remove('active');
      }
    }, 2000);
  }

  // Handle window resize to adjust timer position
  window.addEventListener('resize', () => {
    if (overlay.style.left && overlay.style.top) {
      const parent = overlay.parentElement;
      const parentRect = parent.getBoundingClientRect();
      const overlayRect = overlay.getBoundingClientRect();

      const maxX = parentRect.width - overlayRect.width;
      const maxY = parentRect.height - overlayRect.height;

      const currentLeft = parseInt(overlay.style.left) || 0;
      const currentTop = parseInt(overlay.style.top) || 0;

      overlay.style.left = Math.max(0, Math.min(currentLeft, maxX)) + 'px';
      overlay.style.top = Math.max(0, Math.min(currentTop, maxY)) + 'px';
    }
  });
}

// ==========================================
// COLOR MANAGEMENT
// ==========================================

// Only run color/timer functionality if we're on a page with the screen element
if (elements.screen && elements.picker) {

  /**
   * Calculate relative luminance for a color
   * @param {string} hex - Hex color code
   * @returns {number} Relative luminance (0-1)
   */
  function getLuminance(hex) {
    // Convert hex to RGB
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    // Apply gamma correction
    const rs = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const gs = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const bs = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  /**
   * Sets the screen background color and updates the color picker
   * @param {string} color - Hex color code
   */
  function setColor(color) {
    elements.screenContainer.style.background = color;
    elements.screen.style.background = color;
    elements.picker.value = color;

    // Calculate contrast color for timer text
    if (overlayDisplay) {
      const luminance = getLuminance(color);
      // Use white text on dark backgrounds, black on light backgrounds
      const textColor = luminance > 0.5 ? '#000000' : '#ffffff';
      overlayDisplay.style.color = textColor;

      // Update corner border colors to match
      const corners = overlayDisplay.querySelectorAll('.corner-tl, .corner-tr, .corner-bl, .corner-br');
      corners.forEach(corner => {
        corner.style.borderColor = textColor;
      });
    }

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
  // Check if we're using iOS-style fullscreen (class-based)
  const isIOSFullscreen = elements.screenContainer.classList.contains('ios-fullscreen');

  // Try standard Fullscreen API first
  if (!document.fullscreenElement && !isIOSFullscreen) {
    // Try standard fullscreen API
    if (elements.screenContainer.requestFullscreen) {
      elements.screenContainer.requestFullscreen();
    } else if (elements.screenContainer.webkitRequestFullscreen) {
      elements.screenContainer.webkitRequestFullscreen();
    } else {
      // Fallback for iOS and browsers without Fullscreen API
      enterIOSFullscreen();
    }
  } else {
    // Exit fullscreen
    if (document.fullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    } else if (isIOSFullscreen) {
      exitIOSFullscreen();
    }
  }
}

// Store original parent for restoring later
let originalParent = null;
let originalNextSibling = null;

/**
 * Enter fullscreen mode for iOS/unsupported browsers
 */
function enterIOSFullscreen() {
  // Store original position
  originalParent = elements.screenContainer.parentNode;
  originalNextSibling = elements.screenContainer.nextSibling;

  // Move screen to body
  document.body.appendChild(elements.screenContainer);

  // Add fullscreen class
  elements.screenContainer.classList.add('ios-fullscreen');
  document.body.style.overflow = 'hidden';

  // Try to hide address bar on mobile
  window.scrollTo(0, 1);
  setTimeout(() => window.scrollTo(0, 0), 0);

  updateFullscreenButtonVisibility();

  // Update timer overlay visibility
  if (overlay) {
    updateOverlayVisibility();
  }

  // Show hint for exiting (briefly)
  showExitHint();
}

/**
 * Exit fullscreen mode for iOS/unsupported browsers
 */
function exitIOSFullscreen() {
  elements.screenContainer.classList.remove('ios-fullscreen');
  document.body.style.overflow = '';

  // Restore original position
  if (originalParent) {
    if (originalNextSibling) {
      originalParent.insertBefore(elements.screenContainer, originalNextSibling);
    } else {
      originalParent.appendChild(elements.screenContainer);
    }
  }

  updateFullscreenButtonVisibility();

  // Update timer overlay visibility
  if (overlay) {
    updateOverlayVisibility();
  }
}

/**
 * Show a hint about how to exit fullscreen
 */
function showExitHint() {
  const hint = document.createElement('div');
  hint.className = 'fullscreen-exit-hint';
  hint.style.cssText = `
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 10;
    pointer-events: none;
    opacity: 1;
    transition: opacity 0.3s ease;
  `;
  hint.textContent = 'Double-tap to exit fullscreen';

  // Append to screen container so it appears on top of the screen
  elements.screenContainer.appendChild(hint);

  setTimeout(() => {
    hint.style.opacity = '0';
    setTimeout(() => hint.remove(), 300);
  }, 3000);
}

/**
 * Updates fullscreen button visibility
 */
function updateFullscreenButtonVisibility() {
  const isFullscreen = !!document.fullscreenElement || elements.screenContainer.classList.contains('ios-fullscreen');
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

// Add double-tap to exit iOS fullscreen on mobile
let lastTap = 0;
if (elements.screenContainer) {
  elements.screenContainer.addEventListener('touchend', (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;

    if (tapLength < 300 && tapLength > 0) {
      // Double tap detected
      if (elements.screenContainer.classList.contains('ios-fullscreen')) {
        e.preventDefault();
        exitIOSFullscreen();
      }
    }
    lastTap = currentTime;
  });
}

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
  // Update only the text node, not the entire span content
  if (overlayTextNode) {
    overlayTextNode.nodeValue = formattedTime;
  }
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
  const isFullscreen = !!document.fullscreenElement || elements.screenContainer.classList.contains('ios-fullscreen');
  const isScreenFullscreen = elements.screenContainer.contains(document.fullscreenElement) || elements.screenContainer.classList.contains('ios-fullscreen');
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
