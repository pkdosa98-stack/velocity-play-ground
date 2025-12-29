const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const Velocity = require('velocityjs');

const app = express();
const PORT = process.env.PORT || 3000;
const TEMPLATE_SIZE_LIMIT = Number(process.env.TEMPLATE_SIZE_LIMIT || 50_000);
const jsonLimit = process.env.PAYLOAD_LIMIT || '100kb';
const RATE_LIMIT = Number(process.env.RATE_LIMIT || 60);

app.use(express.json({ limit: jsonLimit }));
app.use(express.urlencoded({ extended: false, limit: jsonLimit }));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://unpkg.com', 'https://cdnjs.cloudflare.com'],
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://unpkg.com', 'https://cdnjs.cloudflare.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
        imgSrc: ["'self'", 'data:'],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  }),
);

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

const staticPath = path.join(__dirname, '..', 'public');
app.use(express.static(staticPath));

const safeHelpers = {
  date: {
    now: () => new Date().toISOString(),
    format: (iso, locale) => new Date(iso || Date.now()).toLocaleString(locale || 'en-US'),
    addDays: (iso, days) => {
      const base = iso ? new Date(iso) : new Date();
      if (Number.isNaN(base.getTime())) {
        throw new Error('Invalid date input for addDays');
      }
      const result = new Date(base.getTime() + Number(days || 0) * 86400000);
      return result.toISOString();
    },
  },
  math: {
    sum: (...nums) =>
      nums
        .map(Number)
        .filter((n) => Number.isFinite(n))
        .reduce((acc, curr) => acc + curr, 0),
    average: (...nums) => {
      const finite = nums.map(Number).filter((n) => Number.isFinite(n));
      return finite.length ? finite.reduce((acc, curr) => acc + curr, 0) / finite.length : 0;
    },
    max: (...nums) => {
      const finite = nums.map(Number).filter((n) => Number.isFinite(n));
      return finite.length ? Math.max(...finite) : null;
    },
  },
  strings: {
    escapeHtml: (str) =>
      String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;'),
    unescapeHtml: (str) =>
      String(str)
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, '&'),
  },
};

const sanitizePayload = (payload) => {
  if (payload === null || payload === undefined) return null;
  if (Array.isArray(payload)) return payload.map((entry) => sanitizePayload(entry));
  if (typeof payload === 'object') {
    return Object.entries(payload).reduce((clean, [key, value]) => {
      if (typeof value === 'function' || typeof value === 'symbol') {
        return clean;
      }
      clean[key] = sanitizePayload(value);
      return clean;
    }, {});
  }
  if (typeof payload === 'string' || typeof payload === 'number' || typeof payload === 'boolean') return payload;
  return undefined;
};

app.post('/api/render', (req, res) => {
  const { template, context, options } = req.body || {};
  if (typeof template !== 'string' || !template.trim()) {
    return res.status(400).json({ error: 'Template is required.' });
  }
  if (template.length > TEMPLATE_SIZE_LIMIT) {
    return res.status(413).json({ error: `Template exceeds ${TEMPLATE_SIZE_LIMIT} characters.` });
  }

  const sanitizedContext = sanitizePayload(context) || {};

  const mergedContext = {
    helpers: safeHelpers,
    ...sanitizedContext,
  };

  try {
    const compiled = Velocity.parse(template);
    const safeOptions = typeof options === 'object' && !Array.isArray(options) ? options : {};
    const rendered = new Velocity.Compile(compiled).render(mergedContext, safeOptions);
    res.json({ result: rendered });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to render template.' });
  }
});

app.get('/api/helpers', (_req, res) => {
  res.json({
    helpers: {
      date: Object.keys(safeHelpers.date),
      math: Object.keys(safeHelpers.math),
      strings: Object.keys(safeHelpers.strings),
    },
    sampleData: {
      user: { name: 'Ada Lovelace', role: 'Engineer' },
      numbers: [1, 2, 3, 5],
      now: safeHelpers.date.now(),
    },
  });
});

app.get('/api/config', (_req, res) => {
  res.json({
    templateSizeLimit: TEMPLATE_SIZE_LIMIT,
    rateLimitPerMinute: RATE_LIMIT,
    payloadLimit: jsonLimit,
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line no-console
app.listen(PORT, () => console.log(`Velocity playground listening on http://localhost:${PORT}`));
