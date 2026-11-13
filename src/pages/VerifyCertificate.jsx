import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import Footer from "../components/common/Footer";
import { LogoMark } from "../components/common/Logo";
import { Button, buttonClass } from "../components/ui";
import { apiConnector } from "../services/apiconnector";
import { certificateEndpoints } from "../services/apis";

const formatDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

/** Public page that confirms a StudyNotion certificate is genuine, by its code. */
export default function VerifyCertificate() {
  const { code: codeParam } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: codeParam ? "loading" : "idle" });
  const [input, setInput] = useState(codeParam || "");

  const load = useCallback(async (code) => {
    setState({ status: "loading" });
    try {
      const res = await apiConnector("GET", `${certificateEndpoints.VERIFY_API}/${encodeURIComponent(code)}`);
      setState({ status: "valid", cert: res.data?.data });
    } catch (e) {
      setState({ status: e.response?.status === 404 ? "invalid" : "failed" });
    }
  }, []);

  useEffect(() => {
    document.title = "Verify a certificate · StudyNotion";
    if (codeParam) {
      setInput(codeParam);
      load(codeParam);
    }
  }, [codeParam, load]);

  const onSubmit = (e) => {
    e.preventDefault();
    const code = input.trim().toUpperCase();
    if (code) navigate(`/verify/${encodeURIComponent(code)}`);
  };

  const { cert } = state;

  return (
    <>
      <div className="mx-auto flex w-11/12 max-w-2xl flex-col gap-8 py-14">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-bold text-ink">Verify a certificate</h1>
          <p className="text-muted">Enter the certificate ID printed at the bottom of a StudyNotion certificate.</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-wrap gap-3">
          <label htmlFor="cert-code" className="sr-only">Certificate ID</label>
          <input
            id="cert-code"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="SN-XXXX-XXXX"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 py-3 font-semibold uppercase tracking-wide text-ink placeholder:normal-case placeholder:tracking-normal placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <Button type="submit">Check</Button>
        </form>

        <div aria-live="polite">
          {state.status === "loading" && <div role="status" aria-label="Checking certificate" className="skeleton h-48 w-full rounded-2xl" />}

          {state.status === "valid" && cert && (
            <section className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgb(var(--success)/0.15)] text-[rgb(var(--success))]" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
                </span>
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">This certificate is genuine</h2>
                  <p className="text-sm text-muted">Issued by StudyNotion · ID {cert.code}</p>
                </div>
              </div>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div><dt className="text-sm text-muted">Awarded to</dt><dd className="text-lg font-semibold text-ink">{cert.learnerName}</dd></div>
                <div><dt className="text-sm text-muted">Issued on</dt><dd className="text-lg font-semibold text-ink">{formatDate(cert.issuedAt)}</dd></div>
                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted">Course</dt>
                  <dd className="text-lg font-semibold text-ink">
                    <Link to={`/courses/${cert.courseId}`} className="underline-offset-4 hover:underline">{cert.courseName}</Link>
                  </dd>
                  <dd className="text-sm text-muted">
                    {[cert.lessons ? `${cert.lessons} lessons` : "", cert.totalDuration ? `${cert.totalDuration} of video` : "", cert.instructorName ? `taught by ${cert.instructorName}` : ""].filter(Boolean).join(" · ")}
                  </dd>
                </div>
              </dl>
            </section>
          )}

          {state.status === "invalid" && (
            <section className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-6">
              <h2 className="font-display text-xl font-semibold text-ink">No certificate has this ID</h2>
              <p className="text-muted">Check the ID for typos. It looks like SN-7K4Q-2M9X. Certificates issued by StudyNotion can always be checked here.</p>
            </section>
          )}

          {state.status === "failed" && (
            <section className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-surface p-6">
              <h2 className="font-display text-xl font-semibold text-ink">Couldn't check right now</h2>
              <p className="text-muted">The server may still be waking up. This usually takes under a minute.</p>
              <Button variant="secondary" onClick={() => load(input.trim().toUpperCase())}>Try again</Button>
            </section>
          )}
        </div>

        <p className="flex items-center gap-2 text-sm text-muted">
          <LogoMark size={18} /> Earn your own certificate:{" "}
          <Link to="/catalog/web-development" className={buttonClass("ghost", "sm")}>Browse courses</Link>
        </p>
      </div>
      <Footer />
    </>
  );
}
