const mongoose = require('mongoose');

// One record per paid Razorpay order: what was bought, for how much, and when.
// Created when a payment is verified; powers the Purchases page and receipts.
const purchaseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courses: [{
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    courseName: String, // kept as bought, even if the course is renamed or removed later
    price: Number,
  }],
  amount: { type: Number, required: true }, // rupees
  currency: { type: String, default: 'INR' },
  orderId: { type: String, required: true, unique: true },
  paymentId: { type: String, required: true },
  coupon: { code: String, percentOff: Number, course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' } }, // discount used, if any
}, { timestamps: true });

module.exports = mongoose.model('Purchase', purchaseSchema);
