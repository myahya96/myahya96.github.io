const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Allow Google OAuth popups while protecting against opener-hijacking phishing attacks
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

// Anti-phishing & open redirect defense middleware
app.use((req, res, next) => {
  const redirectKeys = ['redirect', 'returnUrl', 'return_url', 'next', 'continue', 'dest', 'target', 'callback'];
  for (const key of redirectKeys) {
    if (req.query && req.query[key]) {
      const val = String(req.query[key]).trim();
      // Block external protocols (http:, https:), protocol-relative slashes (//), backslash smuggling (/\, \\), and dangerous schemes
      const isSuspicious = /^(https?:|\/\/|\\\\|\/\\|javascript:|data:|vbscript:)/i.test(val) || /[<>"'\r\n]/.test(val);
      if (isSuspicious) {
        console.warn(`[Security Alert] Neutralized suspicious open-redirect attempt in query parameter "${key}":`, val);
        delete req.query[key];
      }
    }
  }
  next();
});

app.use(express.static(path.join(__dirname)));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
