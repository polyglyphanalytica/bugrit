/**
 * Bugrit Trust Badge - Embeddable Script
 *
 * This script is loaded on customer websites to display a dynamic
 * trust badge showing their Vibe Score.
 *
 * VERIFICATION REQUIREMENTS:
 * To display the score, the site must:
 * 1. Have a legitimate scan run on Bugrit
 * 2. Have a valid subscription
 *
 * If verification fails, shows "A Vibe Coder's Best Friend - Bugrit"
 * and links to the Bugrit homepage.
 *
 * Usage:
 * <script src="https://bugrit.com/badge/embed.js"
 *   data-site-id="site_xxx"
 *   data-size="medium"
 *   data-theme="auto"
 *   async></script>
 */

(function() {
  'use strict';

  // Get script element
  var scriptEl = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf('embed.js') !== -1) {
        return scripts[i];
      }
    }
    return null;
  })();

  // Configuration — detect base URL from the script src, fallback to production
  var BUGRIT_BASE_URL = (function() {
    if (scriptEl && scriptEl.src) {
      try {
        var u = new URL(scriptEl.src);
        return u.origin;
      } catch (e) { /* fallback */ }
    }
    return 'https://bugrit.com';
  })();
  var API_ENDPOINT = BUGRIT_BASE_URL + '/api/trust-badge';

  if (!scriptEl) {
    console.error('[Bugrit] Could not find embed script element');
    return;
  }

  var config = {
    siteId: scriptEl.dataset.siteId || '',
    size: scriptEl.dataset.size || 'medium',
    theme: scriptEl.dataset.theme || 'auto',
    position: scriptEl.dataset.position || 'inline'
  };

  // Get current domain
  var currentDomain = window.location.hostname;

  // Sizes - must match configurator and types.ts
  var SIZES = {
    small: { width: 120, height: 40, fontSize: 9, scoreFontSize: 14, taglineFontSize: 9 },
    medium: { width: 160, height: 52, fontSize: 10, scoreFontSize: 18, taglineFontSize: 10 },
    large: { width: 200, height: 64, fontSize: 12, scoreFontSize: 22, taglineFontSize: 12 }
  };

  var sizeConfig = SIZES[config.size] || SIZES.medium;

  // Fetch badge data from API
  function fetchBadgeData(callback) {
    var url = API_ENDPOINT + '/verify?siteId=' + encodeURIComponent(config.siteId) + '&domain=' + encodeURIComponent(currentDomain);

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        try {
          var data = JSON.parse(xhr.responseText);
          callback(null, data);
        } catch (e) {
          // On any error, show advertising badge
          callback(null, { valid: false, mode: 'advertising' });
        }
      }
    };
    xhr.onerror = function() {
      callback(null, { valid: false, mode: 'advertising' });
    };
    xhr.send();
  }

  // Detect theme preference
  function getTheme() {
    if (config.theme === 'auto') {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    }
    return config.theme;
  }

  // Get grade color
  function getGradeColor(grade) {
    if (!grade) return '#a855f7'; // Purple for advertising
    if (grade.startsWith('A')) return '#4ade80';
    if (grade.startsWith('B')) return '#a3e635';
    if (grade.startsWith('C')) return '#facc15';
    if (grade === 'D') return '#fb923c';
    return '#f87171';
  }

  // Create VERIFIED badge (shows score)
  function createVerifiedBadge(data) {
    var theme = getTheme();
    var isDark = theme === 'dark';
    var gradeColor = getGradeColor(data.grade);

    var container = document.createElement('div');
    container.id = 'bugrit-trust-badge';
    container.style.cssText = [
      'display: inline-flex',
      'align-items: center',
      'gap: 8px',
      'padding: 8px 12px',
      'border-radius: 8px',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'cursor: pointer',
      'transition: transform 0.2s, box-shadow 0.2s',
      'text-decoration: none',
      'background: ' + (isDark ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)'),
      'border: 1px solid ' + (isDark ? '#334155' : '#e2e8f0'),
      'box-shadow: 0 2px 8px ' + (isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'),
      'width: ' + sizeConfig.width + 'px',
      'height: ' + sizeConfig.height + 'px',
      'box-sizing: border-box'
    ].join(';');

    // Shield icon with checkmark
    var shield = document.createElement('div');
    shield.innerHTML = '<svg width="' + (sizeConfig.height * 0.5) + '" height="' + (sizeConfig.height * 0.5) + '" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L3 7V12C3 17.5 7.5 21.5 12 23C16.5 21.5 21 17.5 21 12V7L12 2Z" fill="' + gradeColor + '" stroke="' + gradeColor + '" stroke-width="2"/><path d="M9 12L11 14L15 10" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    // Text content
    var textContainer = document.createElement('div');
    textContainer.style.cssText = 'display: flex; flex-direction: column; line-height: 1.2;';

    var label = document.createElement('span');
    label.textContent = 'Checked for Safety';
    label.style.cssText = [
      'font-size: ' + sizeConfig.fontSize + 'px',
      'color: ' + (isDark ? '#94a3b8' : '#64748b'),
      'font-weight: 500'
    ].join(';');

    var scoreRow = document.createElement('div');
    scoreRow.style.cssText = 'display: flex; align-items: center; gap: 4px;';

    var score = document.createElement('span');
    score.textContent = data.score;
    score.style.cssText = [
      'font-size: ' + sizeConfig.scoreFontSize + 'px',
      'font-weight: 700',
      'color: ' + gradeColor
    ].join(';');

    var byBugrit = document.createElement('span');
    byBugrit.textContent = 'by Bugrit';
    byBugrit.style.cssText = [
      'font-size: ' + (sizeConfig.fontSize - 1) + 'px',
      'color: ' + (isDark ? '#64748b' : '#94a3b8')
    ].join(';');

    scoreRow.appendChild(score);
    scoreRow.appendChild(byBugrit);
    textContainer.appendChild(label);
    textContainer.appendChild(scoreRow);

    container.appendChild(shield);
    container.appendChild(textContainer);

    // Hover effects
    addHoverEffects(container, isDark);

    // Click handler - goes to verification page
    container.onclick = function() {
      window.open(BUGRIT_BASE_URL + '/verified/' + data.siteId, '_blank', 'noopener');
    };

    return container;
  }

  // Create ADVERTISING badge (no score, just promotion)
  function createAdvertisingBadge() {
    var theme = getTheme();
    var isDark = theme === 'dark';
    var brandColor = '#a855f7'; // Bugrit purple

    var container = document.createElement('div');
    container.id = 'bugrit-trust-badge';
    container.style.cssText = [
      'display: inline-flex',
      'align-items: center',
      'gap: 8px',
      'padding: 8px 12px',
      'border-radius: 8px',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'cursor: pointer',
      'transition: transform 0.2s, box-shadow 0.2s',
      'text-decoration: none',
      'background: ' + (isDark ? 'linear-gradient(135deg, #1e1b2e 0%, #0f0d1a 100%)' : 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)'),
      'border: 1px solid ' + (isDark ? '#3b2d5c' : '#e9d5ff'),
      'box-shadow: 0 2px 8px ' + (isDark ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.15)'),
      'width: ' + sizeConfig.width + 'px',
      'height: ' + sizeConfig.height + 'px',
      'box-sizing: border-box'
    ].join(';');

    // Bugrit logo/icon
    var icon = document.createElement('div');
    icon.innerHTML = '<svg width="' + (sizeConfig.height * 0.45) + '" height="' + (sizeConfig.height * 0.45) + '" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L3 7V12C3 17.5 7.5 21.5 12 23C16.5 21.5 21 17.5 21 12V7L12 2Z" fill="' + brandColor + '" stroke="' + brandColor + '" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="white"/></svg>';

    // Text content
    var textContainer = document.createElement('div');
    textContainer.style.cssText = 'display: flex; flex-direction: column; line-height: 1.25;';

    var tagline = document.createElement('span');
    tagline.textContent = "A Vibe Coder's";
    tagline.style.cssText = [
      'font-size: ' + sizeConfig.taglineFontSize + 'px',
      'color: ' + (isDark ? '#c4b5fd' : '#7c3aed'),
      'font-weight: 500'
    ].join(';');

    var tagline2 = document.createElement('span');
    tagline2.textContent = 'Best Friend';
    tagline2.style.cssText = [
      'font-size: ' + sizeConfig.taglineFontSize + 'px',
      'color: ' + (isDark ? '#c4b5fd' : '#7c3aed'),
      'font-weight: 500'
    ].join(';');

    var brandName = document.createElement('span');
    brandName.textContent = 'Bugrit';
    brandName.style.cssText = [
      'font-size: ' + (sizeConfig.scoreFontSize * 0.85) + 'px',
      'font-weight: 700',
      'color: ' + brandColor,
      'margin-top: 2px'
    ].join(';');

    textContainer.appendChild(tagline);
    textContainer.appendChild(tagline2);
    textContainer.appendChild(brandName);

    container.appendChild(icon);
    container.appendChild(textContainer);

    // Hover effects
    addHoverEffects(container, isDark);

    // Click handler - goes to homepage
    container.onclick = function() {
      window.open(BUGRIT_BASE_URL, '_blank', 'noopener');
    };

    return container;
  }

  // Add hover effects to badge
  function addHoverEffects(container, isDark) {
    container.onmouseenter = function() {
      container.style.transform = 'translateY(-2px)';
      container.style.boxShadow = '0 4px 12px ' + (isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)');
    };
    container.onmouseleave = function() {
      container.style.transform = 'translateY(0)';
      container.style.boxShadow = '0 2px 8px ' + (isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)');
    };
  }

  // Create loading state
  function createLoadingBadge() {
    var theme = getTheme();
    var isDark = theme === 'dark';

    var container = document.createElement('div');
    container.id = 'bugrit-trust-badge';
    container.style.cssText = [
      'display: inline-flex',
      'align-items: center',
      'justify-content: center',
      'padding: 8px 12px',
      'border-radius: 8px',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'font-size: 11px',
      'color: #94a3b8',
      'background: ' + (isDark ? '#1e293b' : '#f1f5f9'),
      'border: 1px solid ' + (isDark ? '#334155' : '#e2e8f0'),
      'width: ' + sizeConfig.width + 'px',
      'height: ' + sizeConfig.height + 'px',
      'box-sizing: border-box'
    ].join(';');

    // Animated loading dots
    container.innerHTML = '<span style="animation: bugrit-pulse 1.5s infinite">Loading</span>';

    // Add animation styles
    var style = document.createElement('style');
    style.textContent = '@keyframes bugrit-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }';
    document.head.appendChild(style);

    return container;
  }

  // Mount badge to DOM
  function mount(element) {
    var target;

    // Check for explicit container
    target = document.getElementById('bugrit-badge');

    // Check for inline position with script location
    if (!target && config.position === 'inline') {
      target = document.createElement('div');
      if (scriptEl.parentNode) {
        scriptEl.parentNode.insertBefore(target, scriptEl.nextSibling);
      }
    }

    // Fixed position
    if (!target && config.position.startsWith('fixed-')) {
      target = document.createElement('div');
      target.style.cssText = [
        'position: fixed',
        'z-index: 9999',
        'bottom: 20px',
        config.position === 'fixed-bottom-left' ? 'left: 20px' : 'right: 20px'
      ].join(';');
      document.body.appendChild(target);
    }

    if (target) {
      target.appendChild(element);
    }
  }

  // Remove existing badge
  function removeBadge() {
    var existing = document.getElementById('bugrit-trust-badge');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
  }

  // Initialize badge
  function init() {
    // Show loading state
    mount(createLoadingBadge());

    // Fetch verification data
    fetchBadgeData(function(err, data) {
      removeBadge();

      // Check if verification passed
      if (data && data.valid && data.mode === 'verified') {
        // All checks passed - show verified badge with score
        mount(createVerifiedBadge(data));
      } else {
        // Verification failed - show advertising badge
        // Reasons: no scan, no subscription, domain mismatch, etc.
        mount(createAdvertisingBadge());
      }
    });
  }

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Listen for theme changes
  if (config.theme === 'auto' && window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
      removeBadge();
      init();
    });
  }
})();
