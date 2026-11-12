// Profile photo upload: rejects missing, wrong-type and oversized files before calling Cloudinary.
const Module = require('module'); const path = require('path'); const assert = require('assert');
const SRV = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const realLoad = Module._load; const fakes = {}; let uploaded = 0;
Module._load = function (req, parent) {
  if (req === 'mongoose') return { Types: { ObjectId: { isValid: () => true } } };
  if (req === 'dotenv') return { config() {} };
  const abs = parent && req.startsWith('.') ? path.resolve(path.dirname(parent.filename), req) : null;
  if (abs && abs.startsWith(SRV)) { const rel = path.relative(SRV, abs).replace(/\.js$/, ''); if (fakes[rel]) return fakes[rel]; if (rel.startsWith('models/') || rel.startsWith('utils/') || rel.startsWith('mail/')) return fakes[rel] = new Proxy({}, { get: (t, k) => t[k] ?? (() => '') }); }
  return realLoad.apply(this, arguments);
};
fakes['utils/imageUploader'] = { uploadImageToCloudinary: async () => { uploaded++; return { url: 'https://img/x.png' }; } };
const chain = (v) => { const p = Promise.resolve(v); p.populate = () => p; p.select = () => p; return p; };
fakes['models/User'] = { findByIdAndUpdate: () => chain({ _id: 'u1', image: 'https://img/x.png' }) };
const { updateDisplayPicture } = require(SRV + '/controllers/Profile');
const res = () => { const r = { code: 200 }; r.status = (c) => (r.code = c, r); r.json = (b) => (r.body = b, r); return r; };
const call = async (files) => { const r = res(); await updateDisplayPicture({ files, user: { userId: 'u1' } }, r); return r; };
let passed = 0; const test = async (n, fn) => { try { await fn(); passed++; console.log('PASS', n); } catch (e) { console.log('FAIL', n, e.message); process.exitCode = 1; } };
(async () => {
  await test('no file → 400', async () => { const r = await call(undefined); assert.strictEqual(r.code, 400); });
  await test('PDF → 400', async () => { const r = await call({ displayPicture: { mimetype: 'application/pdf', size: 10 } }); assert.strictEqual(r.code, 400); });
  await test('6 MB image → 400', async () => { const r = await call({ displayPicture: { mimetype: 'image/png', size: 6 * 1024 * 1024 } }); assert.strictEqual(r.code, 400); });
  await test('nothing reached Cloudinary for rejected files', async () => assert.strictEqual(uploaded, 0));
  await test('valid JPG uploads and saves the https URL', async () => { const r = await call({ displayPicture: { mimetype: 'image/jpeg', size: 200000, tempFilePath: '/tmp/x' } }); assert.strictEqual(r.code, 200); assert.strictEqual(r.body.data.image, 'https://img/x.png'); assert.strictEqual(r.body.message, 'Profile photo updated'); });
  console.log(`\n${passed} passed`);
})();
