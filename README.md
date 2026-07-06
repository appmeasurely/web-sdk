# AppMeasurely Web SDK

Lightweight JavaScript analytics and attribution tracking for websites. Under 5KB, no dependencies.

## Installation

### Option 1 — Script tag (recommended)

Add before `</head>` on every page:

```html
<script>window.AM_SITE_ID = 'YOUR_SITE_ID';</script>
<script src="https://cdn.jsdelivr.net/gh/appmeasurely/web-sdk@v1.0.0/sdk.js" async></script>
```

### Option 2 — npm (coming soon)

```bash
npm install @appmeasurely/web-sdk
```

---

## What's Tracked Automatically

| Event | Description |
|-------|-------------|
| `page_view` | On every page load and SPA navigation |
| `session_end` | When user leaves the page (includes duration) |

**Automatically collected data:**
- Page URL, path, title
- Referrer
- UTM parameters (utm_source, utm_medium, utm_campaign, utm_term, utm_content)
- Device type (mobile/tablet/desktop)
- Browser and OS
- Screen dimensions
- Language

---

## Track Custom Events

```javascript
// Simple event
window.am('track', 'signup_complete')

// Event with properties
window.am('track', 'purchase', {
  plan: 'pro',
  amount: 49.99,
  currency: 'USD'
})

// Button click
document.getElementById('cta-btn').addEventListener('click', function() {
  window.am('track', 'cta_clicked', { location: 'hero' })
})
```

---

## Debug Mode

Enable debug logging in the console:

```html
<script>
  window.AM_SITE_ID = 'YOUR_SITE_ID';
  window.AM_DEBUG = true;
</script>
```

---

## SPA Support

The SDK automatically detects URL changes in Single Page Applications (React, Vue, Angular) and tracks page views on navigation — no additional setup needed.

---

## Get Your Site ID

1. Log in to your [AppMeasurely dashboard](https://app.appmeasurely.com)
2. Go to **SDK Docs** in the left sidebar
3. Select your website from the dropdown
4. Copy your Site ID

---

## Support

- Documentation: [appmeasurely.com/docs](https://appmeasurely.com/docs)
- Email: support@appmeasurely.com
