/*
 * Remembers, on this device, the last lesson a learner opened and how far into
 * each video they got, so "Resume" can take them straight back.
 * Stored per user in localStorage; every access is guarded because storage can be
 * full, disabled or unavailable (private mode, embedded views).
 */
const key = (userId, name) => `sn:${userId || "guest"}:${name}`;

const read = (k, fallback) => {
  try {
    const raw = window.localStorage.getItem(k);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const write = (k, value) => {
  try {
    window.localStorage.setItem(k, JSON.stringify(value));
  } catch {
    /* storage unavailable: resume simply falls back to the next unfinished lesson */
  }
};

/** { courseId, sectionId, subSectionId, lessonTitle, courseName, thumbnail, at } */
export const getLastLesson = (userId) => read(key(userId, "last-lesson"), null);

export const setLastLesson = (userId, lesson) => write(key(userId, "last-lesson"), { ...lesson, at: Date.now() });

const MAX_POSITIONS = 200;

export const getPosition = (userId, subSectionId) => {
  const all = read(key(userId, "positions"), {});
  return all[subSectionId]?.t || 0;
};

export const setPosition = (userId, subSectionId, seconds) => {
  const all = read(key(userId, "positions"), {});
  if (seconds > 0) all[subSectionId] = { t: Math.floor(seconds), at: Date.now() };
  else delete all[subSectionId];
  // Keep the newest entries only, so storage never grows without limit
  const entries = Object.entries(all);
  if (entries.length > MAX_POSITIONS) {
    entries.sort((a, b) => b[1].at - a[1].at);
    write(key(userId, "positions"), Object.fromEntries(entries.slice(0, MAX_POSITIONS)));
    return;
  }
  write(key(userId, "positions"), all);
};

/** 754 -> "12:34", 3725 -> "1:02:05" */
export const formatClock = (seconds) => {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

/** Date a learner first opened their certificate for a course; fixed after that. */
export const getCertificateDate = (userId, courseId) => {
  const k = key(userId, `certificate:${courseId}`);
  const saved = read(k, null);
  if (saved) return new Date(saved);
  const now = Date.now();
  write(k, now);
  return new Date(now);
};
