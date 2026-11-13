// Google / GitHub sign-in: tokens are checked, verified emails link to existing accounts, roles are safe.
const Module = require('module'); const path = require('path'); const assert = require('assert');
const SRV = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const realLoad = Module._load; const fakes = {};
Module._load = function (req, parent) {
  if (req === 'jsonwebtoken') return { sign: () => 'JWT' };
  if (req === 'bcrypt') return { hash: async () => 'HASH' };
  const abs = parent && req.startsWith('.') ? path.resolve(path.dirname(parent.filename), req) : null;
  if (abs && abs.startsWith(SRV)) { const rel = path.relative(SRV, abs).replace(/\.js$/, ''); if (fakes[rel]) return fakes[rel]; }
  return realLoad.apply(this, arguments);
};
let passed = 0; const test = async (n, fn) => { try { await fn(); passed++; console.log('PASS', n); } catch (e) { console.log('FAIL', n, e.message); process.exitCode = 1; } };
const res = () => { const r = { code: 200 }; r.status = (c) => (r.code = c, r); r.json = (b) => (r.body = b, r); r.cookie = () => r; return r; };
const pop = (v) => ({ populate: async () => v });
(async () => {
  process.env.GOOGLE_CLIENT_ID = 'my-client'; process.env.JWT_SECRET = 's';
  process.env.GITHUB_CLIENT_ID = 'gh-id'; process.env.GITHUB_CLIENT_SECRET = 'gh-secret';
  let existing = null; let created = null;
  fakes['models/Profile'] = { create: async () => ({ _id: 'p1' }) };
  fakes['models/User'] = {
    findOne: () => pop(existing),
    create: async (doc) => { created = doc; return { _id: 'new', ...doc }; },
    findById: () => pop(null),
  };
  const S = require(SRV + '/controllers/SocialAuth');
  const future = String(Math.floor(Date.now() / 1000) + 600);
  const google = (info) => { S._fetch = async () => ({ ok: true, json: async () => info }); };
  const good = { aud: 'my-client', iss: 'accounts.google.com', exp: future, email: 'New@Gmail.com', email_verified: 'true', given_name: 'Asha', family_name: 'K', sub: 'g1', picture: 'pic' };

  await test('providers lists only what is configured', async () => {
    const r = res(); S.providers({}, r); assert.strictEqual(r.body.data.google.clientId, 'my-client'); assert.ok(r.body.data.github);
  });
  await test('a token for another app is refused', async () => {
    google({ ...good, aud: 'someone-else' }); const r = res(); await S.google({ body: { credential: 'x' } }, r); assert.strictEqual(r.code, 401);
  });
  await test('an unverified Google email is refused', async () => {
    google({ ...good, email_verified: 'false' }); const r = res(); await S.google({ body: { credential: 'x' } }, r); assert.strictEqual(r.code, 401);
  });
  await test('an expired token is refused', async () => {
    google({ ...good, exp: '1000' }); const r = res(); await S.google({ body: { credential: 'x' } }, r); assert.strictEqual(r.code, 401);
  });
  await test('a new person gets a Student account, never Admin', async () => {
    existing = null; created = null; google(good);
    const r = res(); await S.google({ body: { credential: 'x', accountType: 'Admin' } }, r);
    assert.strictEqual(r.code, 200); assert.strictEqual(created.accountType, 'Student'); assert.strictEqual(created.email, 'new@gmail.com'); assert.strictEqual(created.googleId, 'g1'); assert.strictEqual(r.body.created, true);
  });
  await test('Instructor can be chosen on sign-up', async () => {
    created = null; google(good); const r = res(); await S.google({ body: { credential: 'x', accountType: 'Instructor' } }, r); assert.strictEqual(created.accountType, 'Instructor');
  });
  await test('same email signs into the existing account and links Google', async () => {
    let saved = false; created = null;
    existing = { _id: 'u1', email: 'new@gmail.com', accountType: 'Instructor', save: async () => { saved = true; }, toObject() { return { email: this.email, password: 'secret' }; } };
    google(good); const r = res(); await S.google({ body: { credential: 'x' } }, r);
    assert.strictEqual(r.code, 200); assert.strictEqual(created, null); assert.strictEqual(existing.googleId, 'g1'); assert.ok(saved); assert.strictEqual(r.body.data.password, undefined);
  });
  await test('a suspended account cannot sign in', async () => {
    existing = { suspended: true }; google(good); const r = res(); await S.google({ body: { credential: 'x' } }, r); assert.strictEqual(r.code, 403);
  });
  await test('custom button: an access token for another app is refused', async () => {
    existing = null;
    S._fetch = async (url) => ({ ok: true, json: async () => (url.includes('tokeninfo') ? { aud: 'other-app', azp: 'other-app', expires_in: '3500', sub: 'g9' } : { sub: 'g9', email: 'a@b.c', email_verified: true }) });
    const r = res(); await S.google({ body: { accessToken: 'ya29.x' } }, r); assert.strictEqual(r.code, 401);
  });
  await test('custom button: a valid access token signs in with the verified profile', async () => {
    existing = null; created = null;
    S._fetch = async (url) => ({ ok: true, json: async () => (url.includes('tokeninfo') ? { azp: 'my-client', aud: 'my-client', expires_in: '3500', sub: 'g9' } : { sub: 'g9', email: 'Neha@Gmail.com', email_verified: true, given_name: 'Neha', family_name: 'S', picture: 'p' }) });
    const r = res(); await S.google({ body: { accessToken: 'ya29.x' } }, r);
    assert.strictEqual(r.code, 200); assert.strictEqual(created.email, 'neha@gmail.com'); assert.strictEqual(created.googleId, 'g9');
  });
  await test('custom button: profile must belong to the same Google account as the token', async () => {
    S._fetch = async (url) => ({ ok: true, json: async () => (url.includes('tokeninfo') ? { azp: 'my-client', expires_in: '3500', sub: 'g9' } : { sub: 'someone-else', email: 'x@y.z', email_verified: true }) });
    const r = res(); await S.google({ body: { accessToken: 'ya29.x' } }, r); assert.strictEqual(r.code, 401);
  });
  await test('GitHub needs a verified email', async () => {
    existing = null;
    S._fetch = async (url) => ({ ok: true, json: async () => (url.includes('access_token') ? { access_token: 't' } : url.endsWith('/emails') ? [{ email: 'a@b.c', primary: true, verified: false }] : { id: 5, login: 'dev' }) });
    const r = res(); await S.github({ body: { code: 'abcdefgh12' } }, r); assert.strictEqual(r.code, 400);
  });
  await test('GitHub with a verified primary email signs in', async () => {
    created = null;
    S._fetch = async (url) => ({ ok: true, json: async () => (url.includes('access_token') ? { access_token: 't' } : url.endsWith('/emails') ? [{ email: 'dev@x.io', primary: true, verified: true }] : { id: 5, login: 'dev', name: 'Dev Patel' }) });
    const r = res(); await S.github({ body: { code: 'abcdefgh12' } }, r);
    assert.strictEqual(r.code, 200); assert.strictEqual(created.githubId, '5'); assert.strictEqual(created.firstName, 'Dev'); assert.strictEqual(created.lastName, 'Patel');
  });
  await test('a bad GitHub code is refused before calling GitHub', async () => {
    let called = false; S._fetch = async () => { called = true; return {}; };
    const r = res(); await S.github({ body: { code: 'x;drop' } }, r); assert.strictEqual(r.code, 400); assert.strictEqual(called, false);
  });
  console.log(`\n${passed} passed`);
})();
