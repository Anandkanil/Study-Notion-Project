const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/** 3500 -> "₹3,500"; 0 -> "Free" */
export const formatINR = (amount) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
  return n === 0 ? "Free" : inr.format(n);
};
