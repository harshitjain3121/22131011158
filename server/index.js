const express = require('express');
const crypto = require('crypto');
const app = express();
const PORT = 3000;

app.use(express.json());

const urlStore = {};
const DEFAULT_VALIDITY = 30;

function generateShortcode(length = 6) {
  let shortcode = crypto.randomBytes(length).toString('base64url').slice(0, length);
  while (urlStore[shortcode]) {
    shortcode = crypto.randomBytes(length).toString('base64url').slice(0, length);
  }
  return shortcode;
}


app.post('/shorturls', (req, res) => {
  const { url, shortcode, validity } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Please provide a valid URL.' });
  }
  let code = shortcode;
  if (code && urlStore[code]) {
    code = generateShortcode();
  } else if (!code) {
    code = generateShortcode();
  }
  const minutes = Number.isFinite(validity) && validity > 0 ? validity : DEFAULT_VALIDITY;
  const now = Date.now();
  const expiresAt = now + minutes * 60 * 1000;
  urlStore[code] = {
    url,
    createdAt: new Date(now).toISOString(),
    expiresAt,
    clicks: []
  };
  res.status(201).json({ shortUrl: `${req.protocol}://${req.get('host')}/${code}`, expiresAt: new Date(expiresAt).toISOString()});
});


app.get('/:shortcode', (req, res) => {
  const { shortcode } = req.params;
  const entry = urlStore[shortcode];
  if (!entry) {
    return res.status(404).send('Short URL not found.');
  }
  if (Date.now() > entry.expiresAt) {
    delete urlStore[shortcode];
    return res.status(410).send('Short URL expired.');
  }
  const click = {
    timestamp: new Date().toISOString(),
    referrer: req.get('referer') || null,
    location: req.headers['x-forwarded-for'] || req.connection.remoteAddress || null
  };
  entry.clicks.push(click);
  res.redirect(entry.url);
});


app.get('/shorturls/:shortcode', (req, res) => {
  const { shortcode } = req.params;
  const entry = urlStore[shortcode];
  if (!entry) {
    return res.status(404).json({ error: 'Short URL not found.' });
  }
  res.json({
    shortcode,
    originalUrl: entry.url,
    createdAt: entry.createdAt,
    expiresAt: new Date(entry.expiresAt).toISOString(),
    totalClicks: entry.clicks.length,
    clicks: entry.clicks
  });
});

app.get('/', (req, res) => {
  res.send('URL Shortener Service is running!');
});

app.listen(PORT, () => {
  console.log(`URL Shortener running on port ${PORT}`);
});
