import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { buildPage, runJavaScript, runPython } from "./runners";

const STARTERS = {
  javascript: `// Press Run (or Ctrl+Enter) to see the output
const students = ["Asha", "Ravi", "Meera"];

students.forEach((name, i) => {
  console.log(\`\${i + 1}. Hello, \${name}!\`);
});

const total = [3, 5, 8].reduce((sum, n) => sum + n, 0);
console.log("Total:", total);
`,
  python: `# Press Run (or Ctrl+Enter) to see the output
students = ["Asha", "Ravi", "Meera"]

for i, name in enumerate(students, start=1):
    print(f"{i}. Hello, {name}!")

print("Total:", sum([3, 5, 8]))
`,
  html: `<main class="card">
  <h1>Hello, StudyNotion</h1>
  <p>Edit the HTML, CSS and JS tabs. The preview updates as you type.</p>
  <button id="btn">Click me</button>
</main>
`,
  css: `body {
  font-family: system-ui, sans-serif;
  display: grid;
  place-items: center;
  min-height: 100vh;
  margin: 0;
  background: #f4f2fb;
}
.card {
  padding: 24px 28px;
  border-radius: 14px;
  background: white;
  box-shadow: 0 10px 30px -12px rgb(0 0 0 / 0.25);
}
button {
  padding: 10px 16px;
  border: 0;
  border-radius: 10px;
  background: #7c5ce0;
  color: white;
  font-weight: 600;
}
`,
  js: `const btn = document.getElementById("btn");
let clicks = 0;
btn.addEventListener("click", () => {
  clicks += 1;
  btn.textContent = \`Clicked \${clicks} time\${clicks === 1 ? "" : "s"}\`;
  console.log("clicks:", clicks);
});
`,
};

const LANGS = [
  ["javascript", "JavaScript"],
  ["python", "Python"],
  ["web", "HTML/CSS"],
];

const STORE = "sn-playground";
const load = (key) => {
  try {
    return JSON.parse(localStorage.getItem(`${STORE}:${key}`) || "null");
  } catch {
    return null;
  }
};
const save = (key, value) => {
  try {
    localStorage.setItem(`${STORE}:${key}`, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the code just isn't remembered */
  }
};

/** Textarea code editor with line numbers. Tab indents; Esc then Tab leaves the editor. */
function CodeEditor({ value, onChange, onRun, label, minRows = 14 }) {
  const ref = useRef(null);
  const gutter = useRef(null);
  const escaped = useRef(false);
  const lines = value.split("\n").length;

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      escaped.current = true;
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onRun?.();
      return;
    }
    if (e.key === "Tab" && !escaped.current) {
      e.preventDefault();
      const el = e.currentTarget;
      const { selectionStart: s, selectionEnd: end } = el;
      const next = `${value.slice(0, s)}  ${value.slice(end)}`;
      onChange(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = s + 2;
      });
      return;
    }
    escaped.current = false;
  };

  return (
    <div className="relative flex overflow-hidden rounded-xl border border-line bg-bg font-mono text-[13.5px] leading-[1.6]">
      <div ref={gutter} aria-hidden="true" className="select-none overflow-hidden border-r border-line px-3 py-3 text-right text-muted/70">
        {Array.from({ length: Math.max(lines, minRows) }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onScroll={(e) => {
          if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop;
        }}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        aria-label={label}
        aria-describedby="editor-help"
        rows={minRows}
        className="min-h-0 flex-1 resize-y whitespace-pre bg-transparent px-3 py-3 text-ink caret-accent outline-none [tab-size:2]"
      />
    </div>
  );
}

function Output({ lines, status, emptyText }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines]);
  const color = { error: "text-danger", warn: "text-[rgb(234_179_8)]", result: "text-accent-text", log: "text-ink" };
  return (
    <div ref={ref} role="log" aria-live="polite" aria-label="Output" className="min-h-[120px] flex-1 overflow-auto rounded-xl border border-line bg-bg p-3 font-mono text-[13px] leading-relaxed">
      {status && <p className="text-muted">{status}</p>}
      {!status && lines.length === 0 && <p className="text-muted">{emptyText}</p>}
      {lines.map((l, i) => (
        <pre key={i} className={`m-0 whitespace-pre-wrap break-words ${color[l.kind] || "text-ink"}`}>
          {l.kind === "result" ? `← ${l.text}` : l.text}
        </pre>
      ))}
    </div>
  );
}

/**
 * The code playground: JavaScript and Python run in the browser, HTML/CSS shows a live page.
 * storageKey keeps separate code per place (e.g. per lesson); compact suits the lesson tab.
 */
export default function Playground({ storageKey = "main", compact = false, defaultLang = "javascript" }) {
  const saved = useMemo(() => load(storageKey) || {}, [storageKey]);
  const [lang, setLang] = useState(saved.lang || defaultLang);
  const [code, setCode] = useState({
    javascript: saved.javascript ?? STARTERS.javascript,
    python: saved.python ?? STARTERS.python,
    html: saved.html ?? STARTERS.html,
    css: saved.css ?? STARTERS.css,
    js: saved.js ?? STARTERS.js,
  });
  const [webTab, setWebTab] = useState("html");
  const [lines, setLines] = useState([]);
  const [status, setStatus] = useState(null);
  const [running, setRunning] = useState(false);
  const [meta, setMeta] = useState("");
  const [page, setPage] = useState("");
  const channel = useId();
  const groupId = useId();

  // Remember code per place (debounced)
  useEffect(() => {
    const t = setTimeout(() => save(storageKey, { lang, ...code }), 400);
    return () => clearTimeout(t);
  }, [storageKey, lang, code]);

  // Live preview for HTML/CSS/JS
  useEffect(() => {
    if (lang !== "web") return undefined;
    const t = setTimeout(() => {
      setLines([]);
      setPage(buildPage({ html: code.html, css: code.css, js: code.js }, channel));
    }, 350);
    return () => clearTimeout(t);
  }, [lang, code.html, code.css, code.js, channel]);

  useEffect(() => {
    const onMsg = (e) => {
      if (e.data?.channel !== channel) return;
      setLines((l) => (l.length > 300 ? l : [...l, { kind: e.data.kind, text: String(e.data.text) }]));
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [channel]);

  const run = useCallback(async () => {
    if (running) return;
    if (lang === "web") {
      setLines([]);
      setPage(buildPage({ html: code.html, css: code.css, js: code.js }, channel) + `<!-- ${Date.now()} -->`);
      return;
    }
    setRunning(true);
    setLines([]);
    setMeta("");
    const push = (l) => setLines((prev) => [...prev, l]);
    const r = lang === "python" ? await runPython(code.python, push, setStatus) : await runJavaScript(code.javascript, push);
    setStatus(null);
    setRunning(false);
    if (r.status === "ok") setMeta(`Finished in ${r.ms} ms${r.loadMs > 500 ? ` (Python loaded in ${(r.loadMs / 1000).toFixed(1)} s)` : ""}`);
  }, [running, lang, code, channel]);

  const reset = () => {
    if (lang === "web") setCode((c) => ({ ...c, html: STARTERS.html, css: STARTERS.css, js: STARTERS.js }));
    else setCode((c) => ({ ...c, [lang]: STARTERS[lang] }));
    setLines([]);
    setMeta("");
  };

  const editorKey = lang === "web" ? webTab : lang;
  const editorLabel = lang === "web" ? `${webTab.toUpperCase()} code` : `${lang === "python" ? "Python" : "JavaScript"} code`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="Language" className="inline-flex gap-1 rounded-xl border border-line bg-surface p-1">
          {LANGS.map(([k, label]) => (
            <label key={k} className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${lang === k ? "bg-raised text-ink" : "text-muted hover:text-ink"}`}>
              <input type="radio" name={groupId} value={k} checked={lang === k} onChange={() => setLang(k)} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={reset} className="min-h-[40px] rounded-xl px-3 text-sm font-semibold text-muted hover:bg-raised hover:text-ink">
            Reset
          </button>
          {lang !== "web" && (
            <button type="button" onClick={run} disabled={running} aria-keyshortcuts="Control+Enter" className="btn-grad inline-flex min-h-[40px] items-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-70">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 4v16l13-8z" fill="currentColor" />
              </svg>
              {running ? "Running…" : "Run"}
            </button>
          )}
        </div>
      </div>

      {lang === "web" && (
        <div role="tablist" aria-label="File" className="flex gap-1">
          {[
            ["html", "HTML"],
            ["css", "CSS"],
            ["js", "JavaScript"],
          ].map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={webTab === k} onClick={() => setWebTab(k)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${webTab === k ? "bg-raised text-ink" : "text-muted hover:text-ink"}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      <div className={`grid gap-3 ${compact ? "" : "lg:grid-cols-2"}`}>
        <CodeEditor
          key={editorKey}
          value={code[editorKey]}
          onChange={(v) => setCode((c) => ({ ...c, [editorKey]: v }))}
          onRun={run}
          label={editorLabel}
          minRows={compact ? 10 : 18}
        />
        <div className="flex min-h-[220px] flex-col gap-2">
          {lang === "web" ? (
            <>
              <iframe
                title="Preview"
                sandbox="allow-scripts allow-modals"
                srcDoc={page}
                className="min-h-[260px] w-full flex-1 rounded-xl border border-line bg-white"
              />
              {lines.length > 0 && <Output lines={lines} emptyText="" />}
            </>
          ) : (
            <Output lines={lines} status={status} emptyText="Press Run to see your output here." />
          )}
          {meta && <p className="text-xs text-muted">{meta}</p>}
        </div>
      </div>
      <p id="editor-help" className="text-xs text-muted">
        Ctrl+Enter runs your code. Tab indents; press Esc then Tab to leave the editor. Your code is saved on this device.
        {lang === "python" && " Python runs in your browser with Pyodide; input() isn't supported."}
      </p>
    </div>
  );
}
