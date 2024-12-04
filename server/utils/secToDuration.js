// Helper function to convert total seconds to the duration format
function convertSecondsToDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  let result = "";

  if (hours > 0) {
      result += `${hours}h `;
  }
  if (minutes > 0) {
      result += `${minutes}m `;
  }
  if (seconds > 0 || result === "") {
      result += `${seconds}s`;
  }

  return result.trim(); // Trim any extra spaces at the end
}

module.exports = {
  convertSecondsToDuration,
};
