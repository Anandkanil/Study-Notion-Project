/** "January 5, 2001", or null when there is no valid date (avoids showing 1970). */
export const formattedDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};
