/*
 * Discount codes: one code per course, a percentage off, optional expiry and use limit.
 * Prices are always worked out on the server; the browser only sends the code.
 */
const Coupon = require('../models/Coupon');

const normalize = (code) => String(code || '').trim().toUpperCase();

/** Discounted price in whole rupees (never below 0). */
const discounted = (price, percentOff) => Math.max(0, Math.round(Number(price || 0) * (100 - percentOff) / 100));

/**
 * Finds a usable coupon for one of `courseIds`. Returns { coupon } or { error } with a plain message.
 */
async function findCoupon(code, courseIds, now = new Date()) {
  const clean = normalize(code);
  if (!/^[A-Z0-9_-]{3,20}$/.test(clean)) return { error: "That code doesn't look right. Check it and try again." };
  const coupons = await Coupon.find({ code: clean, course: { $in: courseIds } }).lean();
  if (coupons.length === 0) return { error: `${clean} isn't a valid code for ${courseIds.length > 1 ? 'these courses' : 'this course'}.` };
  const live = coupons.find((c) => c.active && (!c.expiresAt || new Date(c.expiresAt) > now) && (c.maxUses == null || c.uses < c.maxUses));
  if (!live) {
    const c = coupons[0];
    if (!c.active) return { error: `${clean} has been switched off by the instructor.` };
    if (c.expiresAt && new Date(c.expiresAt) <= now) return { error: `${clean} has expired.` };
    return { error: `${clean} has been used the maximum number of times.` };
  }
  return { coupon: live };
}

module.exports = { normalize, discounted, findCoupon };
