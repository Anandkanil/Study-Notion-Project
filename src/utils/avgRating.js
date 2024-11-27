// export default function GetAvgRating(ratingArr) {
//     if (ratingArr?.length === 0) return 0
//     const totalReviewCount = ratingArr?.reduce((acc, curr) => {
//       acc += curr.rating
//       return acc
//     }, 0)
  
//     const multiplier = Math.pow(10, 1)
//     const avgReviewCount =
//       Math.round((totalReviewCount / ratingArr?.length) * multiplier) / multiplier
  
//     return avgReviewCount
//   }

export default function GetAvgRating(ratingArr) {
    // Return 0 if ratingArr is undefined, null, or empty
    if (!ratingArr || ratingArr.length === 0) return 0;

    // Calculate the total rating
    const totalRating = ratingArr.reduce((acc, curr) => acc + curr.rating, 0);

    // Define precision for rounding
    const precision = 1; // Number of decimal places
    const multiplier = Math.pow(10, precision);

    // Calculate and round average rating
    const avgRating = Math.round((totalRating / ratingArr.length) * multiplier) / multiplier;

    return avgRating;
}