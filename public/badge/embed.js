/**
 * Bugrit Trust Badge - Embeddable Script
 *
 * This script is loaded on customer websites to display a dynamic
 * trust badge showing their Vibe Score.
 *
 * Usage:
 * <script src="https://bugrit.dev/badge/embed.js"
 *   data-site-id="site_xxx"
 *   data-size="medium"
 *   data-theme="auto"
 *   async></script>
 */

(function() {
  'use strict';

  // Configuration
  var BUGRIT_BASE_URL = 'https://bugrit.dev';
  var API_ENDPOINT = BUGRIT_BASE_URL + '/api/trust-badge';

  // Get script element and config
  var scriptEl = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf('embed.js') !== -1) {
        return scripts[i];
      }
    }
    return null;
  })();

  if (!scriptEl) {
    console.error('[Bugrit] Could not find embed script element');
    return;
  }

  var config = {
    siteId: scriptEl.dataset.siteId,
    size: scriptEl.dataset.size || 'medium',
    theme: scriptEl.dataset.theme || 'auto',
    position: scriptEl.dataset.position || 'inline'
  };

  if (!config.siteId) {
    console.error('[Bugrit] Missing data-site-id attribute');
    return;
  }

  // Get current domain
  var currentDomain = window.location.hostname;

  // Sizes
  var SIZES = {
    small: { width: 120, height: 40, fontSize: 10, scoreFontSize: 14 },
    medium: { width: 160, height: 52, fontSize: 11, scoreFontSize: 18 },
    large: { width: 200, height: 64, fontSize: 13, scoreFontSize: 22 }
  };

  var sizeConfig = SIZES[config.size] || SIZES.medium;

  // Fetch badge data from API
  function fetchBadgeData(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', API_ENDPOINT + '/verify?siteId=' + encodeURIComponent(config.siteId) + '&domain=' + encodeURIComponent(currentDomain), true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            var data = JSON.parse(xhr.responseText);
            callback(null, data);
          } catch (e) {
            callback(new Error('Invalid response'));
          }
        } else {
          callback(new Error('Failed to fetch badge data'));
        }
      }
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
    if (grade.startsWith('A')) return '#4ade80';
    if (grade.startsWith('B')) return '#a3e635';
    if (grade.startsWith('C')) return '#facc15';
    if (grade === 'D') return '#fb923c';
    return '#f87171';
  }

  // Create badge element
  function createBadge(data) {
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

    // Shield icon
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
    container.onmouseenter = function() {
      container.style.transform = 'translateY(-2px)';
      container.style.boxShadow = '0 4px 12px ' + (isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)');
    };
    container.onmouseleave = function() {
      container.style.transform = 'translateY(0)';
      container.style.boxShadow = '0 2px 8px ' + (isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)');
    };

    // Click handler
    container.onclick = function() {
      window.open(BUGRIT_BASE_URL + '/verified/' + data.siteId, '_blank', 'noopener');
    };

    return container;
  }

  // Create error/loading state
  function createPlaceholder(message, isError) {
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
      'color: ' + (isError ? '#f87171' : '#94a3b8'),
      'background: #1e293b',
      'border: 1px solid ' + (isError ? '#7f1d1d' : '#334155'),
      'width: ' + sizeConfig.width + 'px',
      'height: ' + sizeConfig.height + 'px',
      'box-sizing: border-box'
    ].join(';');
    container.textContent = message;
    return container;
  }

  // Mount badge
  function mount(element) {
    var target;

    // Check for explicit container
    target = document.getElementById('bugrit-badge');

    // Check for inline position with script location
    if (!target && config.position === 'inline') {
      // Create container after script tag
      target = document.createElement('div');
      scriptEl.parentNode.insertBefore(target, scriptEl.nextSibling);
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

  // Initialize
  function init() {
    // Show loading state
    mount(createPlaceholder('Loading...', false));

    // Fetch data
    fetchBadgeData(function(err, data) {
      // Remove loading state
      var existing = document.getElementById('bugrit-trust-badge');
      if (existing) {
        existing.parentNode.removeChild(existing);
      }

      if (err || !data.valid) {
        mount(createPlaceholder(data && data.error ? data.error : 'Badge unavailable', true));
        return;
      }

      mount(createBadge(data));
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
      var existing = document.getElementById('bugrit-trust-badge');
      if (existing) {
        existing.parentNode.removeChild(existing);
      }
      init();
    });
  }
})();
