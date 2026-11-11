import axios from "axios";

// Long enough for the free backend to wake from sleep (~1 minute), short enough to fail eventually
export const axiosInstance = axios.create({ timeout: 90000 });

// ---- Slow-request tracking (powers the "Waking up the server…" notice) ----
const SLOW_AFTER_MS = 4000;
let pending = 0;
let slowTimer = null;
let isSlow = false;
const listeners = new Set();

const setSlow = (value) => {
  if (isSlow === value) return;
  isSlow = value;
  listeners.forEach((fn) => fn(value));
};

/** Subscribe to "requests are taking a while" changes. Returns an unsubscribe function. */
export const onSlowRequests = (fn) => {
  listeners.add(fn);
  fn(isSlow);
  return () => listeners.delete(fn);
};

const started = () => {
  pending += 1;
  if (pending === 1) slowTimer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
};
const finished = () => {
  pending = Math.max(0, pending - 1);
  if (pending === 0) {
    clearTimeout(slowTimer);
    setSlow(false);
  }
};

axiosInstance.interceptors.request.use((config) => {
  started();
  return config;
});
axiosInstance.interceptors.response.use(
  (response) => {
    finished();
    return response;
  },
  (error) => {
    finished();
    return Promise.reject(error);
  }
);

export const apiConnector = (method, url, bodyData, headers, params) =>
  axiosInstance({
    method,
    url: `${url}`,
    data: bodyData ? bodyData : null,
    headers: headers ? headers : null,
    params: params ? params : null,
  });
