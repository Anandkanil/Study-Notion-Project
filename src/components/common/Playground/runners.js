/*
 * Runs learners' code in the browser, never on our server.
 * - JavaScript: a throwaway Web Worker (no page access); stopped after a time limit.
 * - Python: Pyodide (CPython compiled to WebAssembly) in a reusable worker, loaded on first use.
 * - HTML/CSS/JS pages: rendered by the Playground in a sandboxed iframe (see Playground.jsx).
 */

export const JS_TIMEOUT_MS = 5000;
export const PY_TIMEOUT_MS = 15000;
const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";

const MAX_LINES = 500;
const fmt = `
  const fmt = (v) => {
    if (typeof v === "string") return v;
    if (v instanceof Error) return v.name + ": " + v.message;
    if (typeof v === "function") return "[Function " + (v.name || "anonymous") + "]";
    if (typeof v === "undefined") return "undefined";
    try { return JSON.stringify(v, (k, x) => (typeof x === "bigint" ? x + "n" : x), 2) ?? String(v); } catch { return String(v); }
  };`;

const JS_WORKER = `
  ${fmt}
  let lines = 0;
  const send = (kind, args) => {
    if (++lines > ${MAX_LINES}) { if (lines === ${MAX_LINES + 1}) postMessage({ kind: "warn", text: "Output stopped after ${MAX_LINES} lines." }); return; }
    postMessage({ kind, text: args.map(fmt).join(" ") });
  };
  console.log = (...a) => send("log", a);
  console.info = (...a) => send("log", a);
  console.warn = (...a) => send("warn", a);
  console.error = (...a) => send("error", a);
  console.table = (...a) => send("log", a);
  self.fetch = undefined; self.XMLHttpRequest = undefined; self.importScripts = undefined; self.WebSocket = undefined;
  onmessage = async (e) => {
    try {
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const result = await new AsyncFunction(e.data)();
      if (result !== undefined) send("result", [result]);
    } catch (err) {
      postMessage({ kind: "error", text: (err && err.name ? err.name + ": " : "") + (err && err.message ? err.message : String(err)) });
    }
    postMessage({ kind: "done" });
  };`;

const blobWorker = (src) => {
  const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
  const w = new Worker(url);
  URL.revokeObjectURL(url);
  return w;
};

/** Runs JavaScript. onLine({kind, text}) for each output line. Resolves when finished. */
export function runJavaScript(code, onLine) {
  return new Promise((resolve) => {
    const started = performance.now();
    const w = blobWorker(JS_WORKER);
    const finish = (status) => {
      clearTimeout(timer);
      w.terminate();
      resolve({ status, ms: Math.round(performance.now() - started) });
    };
    const timer = setTimeout(() => {
      onLine({ kind: "error", text: `Stopped after ${JS_TIMEOUT_MS / 1000} seconds. Is there an endless loop?` });
      finish("timeout");
    }, JS_TIMEOUT_MS);
    w.onmessage = (e) => (e.data.kind === "done" ? finish("ok") : onLine(e.data));
    w.onerror = (e) => {
      e.preventDefault();
      onLine({ kind: "error", text: e.message || "Your code has a syntax error." });
      finish("error");
    };
    w.postMessage(code);
  });
}

const PY_WORKER = `
  importScripts("${PYODIDE_URL}pyodide.js");
  let py = null;
  const ready = loadPyodide({ indexURL: "${PYODIDE_URL}" }).then((p) => { py = p; postMessage({ kind: "ready" }); });
  ready.catch((e) => postMessage({ kind: "load-error", text: String(e && e.message || e) }));
  let lines = 0;
  const out = (kind) => (text) => {
    if (++lines > ${MAX_LINES}) { if (lines === ${MAX_LINES + 1}) postMessage({ kind: "warn", text: "Output stopped after ${MAX_LINES} lines." }); return; }
    postMessage({ kind, text });
  };
  onmessage = async (e) => {
    await ready;
    lines = 0;
    py.setStdout({ batched: out("log") });
    py.setStderr({ batched: out("error") });
    py.setStdin({ stdin: () => { throw new Error("input() isn't supported here. Put the value in your code instead."); } });
    try {
      // Fresh variables for every run
      const ns = py.globals.get("dict")();
      await py.loadPackagesFromImports(e.data);
      const result = await py.runPythonAsync(e.data, { globals: ns });
      if (result !== undefined && result !== null) postMessage({ kind: "result", text: String(result) });
      ns.destroy();
    } catch (err) {
      const msg = String(err && err.message || err).trim().split("\\n");
      // Keep the useful part of the traceback (from the user's code down)
      const i = msg.findIndex((l) => l.includes('File "<exec>"'));
      postMessage({ kind: "error", text: (i >= 0 ? msg.slice(i) : msg.slice(-3)).join("\\n") });
    }
    postMessage({ kind: "done" });
  };`;

let pyWorker = null;
let pyReady = null;

const startPython = (onStatus) => {
  if (pyWorker) return pyReady;
  pyWorker = blobWorker(PY_WORKER);
  pyReady = new Promise((resolve, reject) => {
    const onMsg = (e) => {
      if (e.data.kind === "ready") {
        pyWorker.removeEventListener("message", onMsg);
        resolve();
      } else if (e.data.kind === "load-error") {
        pyWorker.removeEventListener("message", onMsg);
        stopPython();
        reject(new Error("Python couldn't load. Check your internet connection and try again."));
      }
    };
    pyWorker.addEventListener("message", onMsg);
  });
  onStatus?.("Loading Python (about 10 MB, only the first time)…");
  return pyReady;
};

const stopPython = () => {
  pyWorker?.terminate();
  pyWorker = null;
  pyReady = null;
};

/** Runs Python with Pyodide. onStatus(text) reports loading. */
export async function runPython(code, onLine, onStatus) {
  const started = performance.now();
  try {
    await startPython(onStatus);
  } catch (e) {
    onLine({ kind: "error", text: e.message });
    return { status: "error", ms: 0 };
  }
  onStatus?.(null);
  const runStart = performance.now();
  return new Promise((resolve) => {
    const w = pyWorker;
    const finish = (status) => {
      clearTimeout(timer);
      w.removeEventListener("message", onMsg);
      resolve({ status, ms: Math.round(performance.now() - runStart), loadMs: Math.round(runStart - started) });
    };
    const timer = setTimeout(() => {
      onLine({ kind: "error", text: `Stopped after ${PY_TIMEOUT_MS / 1000} seconds. Is there an endless loop?` });
      stopPython(); // the next run starts a fresh Python
      finish("timeout");
    }, PY_TIMEOUT_MS);
    const onMsg = (e) => (e.data.kind === "done" ? finish("ok") : onLine(e.data));
    w.addEventListener("message", onMsg);
    w.postMessage(code);
  });
}

/** Builds the document for the HTML preview iframe, with console output sent to the parent. */
export function buildPage({ html, css, js }, channel) {
  const bridge = `<script>(function(){${fmt}
    var send=function(kind,a){parent.postMessage({channel:${JSON.stringify(channel)},kind:kind,text:Array.prototype.map.call(a,fmt).join(" ")},"*")};
    ["log","info","warn","error"].forEach(function(k){var o=console[k];console[k]=function(){send(k==="info"?"log":k,arguments);o&&o.apply(console,arguments)}});
    window.onerror=function(m,s,l){send("error",[m+(l?" (line "+l+")":"")])};
  })();<\/script>`;
  const safeJs = String(js || "").replace(/<\/script/gi, "<\\/script");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${bridge}<style>${css || ""}</style></head><body>${html || ""}<script>${safeJs}<\/script></body></html>`;
}
