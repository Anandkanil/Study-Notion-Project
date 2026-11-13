/*
 * Keeps the Render API awake during the day.
 *
 * Render's free plan puts the server to sleep after 15 idle minutes, so the next
 * visitor waits 30-60 seconds. GitHub's scheduled workflows turned out to run only
 * every hour or two, which isn't often enough; Netlify scheduled functions run on time.
 *
 * Every 10 minutes from 8 am to midnight India time (02:30-18:30 UTC). Off overnight
 * on purpose: Render's 750 free hours a month are shared by all free services.
 */
const HEALTH_URL = process.env.KEEP_AWAKE_URL || "https://study-notion-project-1-px3q.onrender.com/api/v1/health";

export default async () => {
  const minutesUtc = new Date().getUTCHours() * 60 + new Date().getUTCMinutes();
  if (minutesUtc < 2 * 60 + 30 || minutesUtc > 18 * 60 + 30) return new Response("Off hours", { status: 200 });
  try {
    // A sleeping server can take longer than this function may run; the request alone wakes it
    const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(25000) });
    console.log(`keep-awake: ${res.status}`);
  } catch (error) {
    console.log(`keep-awake: ${error.name === "TimeoutError" ? "waking up (timed out)" : error.message}`);
  }
  return new Response("ok", { status: 200 });
};

export const config = { schedule: "*/10 * * * *" };
