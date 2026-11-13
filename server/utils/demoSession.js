/*
 * One-click demo sessions ("Try as student / instructor / admin").
 *
 * A demo session is an ordinary JWT with `demo: true`. Demo sessions are read-only:
 * any request that would change data is refused (a few harmless reads that use POST
 * are allowed). For demo sessions, every response is also passed through `maskPersonal`,
 * so the demo admin can browse the dashboard without seeing real people's email
 * addresses, phone numbers, surnames or photos.
 */
const DEMO_DOMAIN = 'demo.studynotion.test';
const isDemoEmail = (email) => typeof email === 'string' && email.toLowerCase().endsWith(`@${DEMO_DOMAIN}`);

// POST routes that only read data
const READ_ONLY_POSTS = new Set([
  '/api/v1/course/getCourseDetails',
  '/api/v1/course/getFullCourseDetails',
  '/api/v1/course/getCategoryPageDetails',
]);
// Harmless writes to the demo account itself ("pick up where you left off")
const ALLOWED_WRITES = new Set(['PUT /api/v1/profile/last-lesson']);

const READ_ONLY_MESSAGE = "This is a read-only demo, so changes aren't saved. Create a free account to do this.";

// Downloads that bypass res.json (and so the masking below) are off for demo sessions
const BLOCKED_READS = [/^\/api\/v1\/admin\/export\//];

function isAllowed(req) {
  const method = req.method.toUpperCase();
  const path = (req.originalUrl || req.url || '').split('?')[0].replace(/\/+$/, '');
  if (BLOCKED_READS.some((re) => re.test(path))) return false;
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true;
  if (method === 'POST' && READ_ONLY_POSTS.has(path)) return true;
  return ALLOWED_WRITES.has(`${method} ${path}`);
}

const maskEmail = (email) => {
  const [name, domain] = String(email).split('@');
  return `${(name || '?').slice(0, 1)}•••@${domain || 'hidden'}`;
};
const avatar = (seed) => `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}&bold=true`;

/** Returns a copy of a JSON-able value with real people's personal details hidden. */
function maskPersonal(value) {
  if (Array.isArray(value)) return value.map(maskPersonal);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (k === 'contactNumber' || k === 'ip' || k === 'userAgent') continue;
    out[k] = maskPersonal(v);
  }
  if (typeof out.email === 'string' && !isDemoEmail(out.email)) {
    out.email = maskEmail(out.email);
    if (typeof out.lastName === 'string' && out.lastName) out.lastName = `${out.lastName[0]}.`;
    if (typeof out.image === 'string') out.image = avatar(`${out.firstName || ''} ${out.lastName || ''}`.trim() || 'User');
  }
  return out;
}

/** Called by the auth middleware once the token is verified. Returns true if it already responded. */
function applyDemoRules(req, res) {
  if (!req.user?.demo) return false;
  if (!isAllowed(req)) {
    res.status(403).json({ success: false, demo: true, message: READ_ONLY_MESSAGE });
    return true;
  }
  const json = res.json.bind(res);
  res.json = (body) => json(maskPersonal(JSON.parse(JSON.stringify(body ?? null))));
  return false;
}

module.exports = { DEMO_DOMAIN, isDemoEmail, isAllowed, maskPersonal, applyDemoRules, READ_ONLY_MESSAGE };
