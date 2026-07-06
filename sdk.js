(function(window, document) {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────────
  var ENDPOINT = 'https://uqvknwgcpptxnbmsubkc.supabase.co/functions/v1/track-event';
  var SDK_VERSION = '1.0.0';
  var SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  var QUEUE_KEY = 'am_queue';
  var VISITOR_KEY = 'am_visitor_id';
  var SESSION_KEY = 'am_session';

  // ── State ─────────────────────────────────────────────────────────────────
  var siteId = window.AM_SITE_ID;
  var debugMode = window.AM_DEBUG || false;
  var queue = [];
  var sending = false;
  var sessionId = null;
  var sessionStart = null;

  // ── Utility functions ─────────────────────────────────────────────────────

  function log(msg) {
    if (debugMode) console.log('[AppMeasurely]', msg);
  }

  function generateId() {
    return 'am_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  }

  function getVisitorId() {
    try {
      var stored = localStorage.getItem(VISITOR_KEY);
      if (stored) return stored;
      var id = generateId();
      localStorage.setItem(VISITOR_KEY, id);
      return id;
    } catch(e) {
      return generateId();
    }
  }

  function getOrCreateSession() {
    try {
      var stored = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
      if (stored && (Date.now() - stored.last_active) < SESSION_TIMEOUT) {
        stored.last_active = Date.now();
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(stored));
        return stored.id;
      }
      var newSession = { id: generateId(), last_active: Date.now() };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
      return newSession.id;
    } catch(e) {
      if (!sessionId) sessionId = generateId();
      return sessionId;
    }
  }

  function getDeviceType() {
    var ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
    if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  function getBrowser() {
    var ua = navigator.userAgent;
    if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) return 'Chrome';
    if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) return 'Safari';
    if (ua.indexOf('Firefox') > -1) return 'Firefox';
    if (ua.indexOf('Edg') > -1) return 'Edge';
    if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident') > -1) return 'IE';
    return 'Other';
  }

  function getOS() {
    var ua = navigator.userAgent;
    if (/windows/i.test(ua)) return 'Windows';
    if (/macintosh|mac os x/i.test(ua)) return 'macOS';
    if (/linux/i.test(ua)) return 'Linux';
    if (/android/i.test(ua)) return 'Android';
    if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
    return 'Other';
  }

  function getUTMParams() {
    var params = {};
    var search = window.location.search;
    var utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    utmKeys.forEach(function(key) {
      var match = search.match(new RegExp('[?&]' + key + '=([^&]*)'));
      if (match) params[key] = decodeURIComponent(match[1]);
    });
    return params;
  }

  function buildBasePayload(eventName) {
    var utmParams = getUTMParams();
    var payload = {
      site_id: siteId,
      visitor_id: getVisitorId(),
      session_id: getOrCreateSession(),
      event: eventName,
      url: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer || null,
      title: document.title,
      device_type: getDeviceType(),
      browser: getBrowser(),
      os: getOS(),
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      language: navigator.language || 'en',
      timestamp: new Date().toISOString(),
      sdk_version: SDK_VERSION
    };

    // Add UTM params
    if (utmParams.utm_source) payload.utm_source = utmParams.utm_source;
    if (utmParams.utm_medium) payload.utm_medium = utmParams.utm_medium;
    if (utmParams.utm_campaign) payload.utm_campaign = utmParams.utm_campaign;
    if (utmParams.utm_term) payload.utm_term = utmParams.utm_term;
    if (utmParams.utm_content) payload.utm_content = utmParams.utm_content;

    return payload;
  }

  // ── Queue & Sending ───────────────────────────────────────────────────────

  function enqueue(payload) {
    queue.push(payload);
    log('Queued: ' + payload.event);
    flush();
  }

  function flush() {
    if (sending || queue.length === 0) return;
    sending = true;
    var payload = queue[0];

    send(payload, function(success) {
      sending = false;
      if (success) {
        queue.shift();
        if (queue.length > 0) flush();
      } else {
        // Retry after 3 seconds
        setTimeout(flush, 3000);
      }
    });
  }

  function send(payload, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', ENDPOINT, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 10000;

    xhr.onload = function() {
      log('Sent: ' + payload.event + ' → ' + xhr.status);
      callback(xhr.status >= 200 && xhr.status < 300);
    };

    xhr.onerror = function() {
      log('Send error: ' + payload.event);
      callback(false);
    };

    xhr.ontimeout = function() {
      log('Timeout: ' + payload.event);
      callback(false);
    };

    try {
      xhr.send(JSON.stringify(payload));
    } catch(e) {
      log('Send exception: ' + e.message);
      callback(false);
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  var am = function(action, eventName, properties) {
    if (!siteId) {
      log('AM_SITE_ID not set. Add window.AM_SITE_ID = "your_site_id" before the script tag.');
      return;
    }

    if (action === 'track') {
      var payload = buildBasePayload(eventName || 'custom_event');
      if (properties && typeof properties === 'object') {
        payload.properties = properties;
      }
      enqueue(payload);
    } else if (action === 'pageview') {
      enqueue(buildBasePayload('page_view'));
    }
  };

  // ── Auto Tracking ─────────────────────────────────────────────────────────

  function init() {
    if (!siteId) {
      log('AM_SITE_ID not set. Tracking disabled.');
      return;
    }

    log('Initialized. Site ID: ' + siteId);

    // Track initial page view
    enqueue(buildBasePayload('page_view'));

    // Track page visibility changes (SPA support)
    var lastPath = window.location.pathname;
    setInterval(function() {
      if (window.location.pathname !== lastPath) {
        lastPath = window.location.pathname;
        enqueue(buildBasePayload('page_view'));
        log('SPA navigation detected: ' + lastPath);
      }
    }, 500);

    // Track session end on page unload
    window.addEventListener('beforeunload', function() {
      var session = null;
      try { session = JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch(e) {}
      if (session) {
        var duration = Math.round((Date.now() - session.last_active) / 1000);
        var payload = buildBasePayload('session_end');
        payload.session_duration = duration;
        // Use sendBeacon for reliable unload tracking
        if (navigator.sendBeacon) {
          navigator.sendBeacon(ENDPOINT, JSON.stringify(payload));
        }
      }
    });
  }

  // Expose public API
  window.am = am;

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window, document);
