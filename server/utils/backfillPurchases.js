/*
 * Rebuilds Purchase records for orders paid before purchases were recorded.
 * Every StudyNotion order carries the buyer and course ids in its Razorpay notes,
 * so the paid orders in Razorpay are the source of truth.
 *
 * Safe to run on every start: an order that already has a Purchase is left alone.
 */
const instance = require('../config/Razorpay');
const Course = require('../models/Course');
const Purchase = require('../models/Purchase');

const PAGE = 100;
const MAX_ORDERS = 2000;

async function backfillPurchases() {
  let added = 0;
  let scanned = 0;
  try {
    for (let skip = 0; skip < MAX_ORDERS; skip += PAGE) {
      const page = await instance.orders.all({ count: PAGE, skip });
      const orders = page?.items || [];
      scanned += orders.length;

      for (const order of orders) {
        const notes = order.notes || {};
        const courseIds = Object.keys(notes).filter((k) => /^c\d+$/.test(k)).map((k) => String(notes[k]));
        if (order.status !== 'paid' || !notes.userId || courseIds.length === 0) continue;
        if (await Purchase.exists({ orderId: order.id })) continue;

        // The captured payment gives the payment id and the time it was paid
        const payments = await instance.orders.fetchPayments(order.id);
        const paid = (payments?.items || []).find((p) => p.status === 'captured') || (payments?.items || [])[0];
        if (!paid) continue;

        const found = await Course.find({ _id: { $in: courseIds } }).select('courseName price').lean();
        const byId = new Map(found.map((c) => [String(c._id), c]));
        const when = new Date((paid.created_at || order.created_at) * 1000);

        const result = await Purchase.updateOne(
          { orderId: order.id },
          {
            $setOnInsert: {
              user: notes.userId,
              courses: courseIds.map((id) => ({
                course: id,
                courseName: byId.get(id)?.courseName || 'Course',
                price: byId.get(id)?.price ?? null,
              })),
              amount: Math.round(Number(order.amount || 0)) / 100,
              currency: order.currency || 'INR',
              orderId: order.id,
              paymentId: paid.id,
              createdAt: when,
              updatedAt: when,
            },
          },
          { upsert: true, timestamps: false }
        );
        if (result.upsertedCount) added += 1;
      }

      if (orders.length < PAGE) break;
    }
    console.log(`Purchase backfill: checked ${scanned} Razorpay orders, added ${added} missing receipts`);
  } catch (error) {
    console.error('Purchase backfill failed:', error?.error?.description || error.message);
  }
  return { scanned, added };
}

module.exports = { backfillPurchases };
