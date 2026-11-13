import React, { useEffect } from "react";

import Playground from "../components/common/Playground/Playground";
import Footer from "../components/common/Footer";

/** Public code playground: try JavaScript, Python or a small web page without installing anything. */
export default function PlaygroundPage() {
  useEffect(() => {
    document.title = "Code playground · StudyNotion";
  }, []);
  return (
    <div className="flex flex-col">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <div>
          <h1 className="text-[clamp(1.9rem,4vw,2.6rem)] font-bold tracking-[-0.02em] text-ink">Code playground</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Write and run JavaScript or Python, or build a small web page with live preview. Everything runs in your browser, so nothing is installed and nothing is sent to our servers.
          </p>
        </div>
        <Playground storageKey="main" />
      </main>
      <Footer />
    </div>
  );
}
