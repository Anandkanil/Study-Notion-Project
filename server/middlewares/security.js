/*
 * Baseline protection for every request, without extra packages:
 * - standard security headers (the useful subset of helmet for a JSON API)
 * - removes MongoDB operators ($gt, $ne …) and prototype keys from request input,
 *   so a body like { "email": { "$ne": null } } can't change a database query
 */
function securityHeaders(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Strict-Transport-Security': 'max-age=15552000; includeSubDomains',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'X-DNS-Prefetch-Control': 'off',
    'X-Permitted-Cross-Domain-Policies': 'none',
  });
  res.removeHeader('X-Powered-By');
  next();
}

const BLOCKED = /^\$|^(__proto__|constructor|prototype)$/;

function clean(value, depth = 0) {
  if (depth > 20 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => clean(v, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (BLOCKED.test(k) || k.includes('.')) continue;
    out[k] = clean(v, depth + 1);
  }
  return out;
}

function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') req.body = clean(req.body);
  if (req.params && typeof req.params === 'object') req.params = clean(req.params);
  // Express 4: req.query is a plain getter-backed object; clean it in place
  if (req.query && typeof req.query === 'object') {
    const cleaned = clean(req.query);
    for (const k of Object.keys(req.query)) if (!(k in cleaned)) delete req.query[k];
    Object.assign(req.query, cleaned);
  }
  next();
}

module.exports = { securityHeaders, sanitizeInput, clean };
