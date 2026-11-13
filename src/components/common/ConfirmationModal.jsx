import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

const TONE = {
  danger: { ring: "bg-danger/15 text-danger", d: "M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z", btn: "bg-danger text-white hover:brightness-110" },
  warning: { ring: "bg-accent/15 text-accent-text", d: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9", btn: "btn-grad" },
  info: { ring: "bg-accent/15 text-accent-text", d: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 8h.01M11 12h1v4h1", btn: "btn-grad" },
};

/**
 * Confirm dialog in the CodeHelp style: dimmed, blurred backdrop; a centred card with an icon,
 * title, message and two equal buttons.
 * modalData: { text1, text2, btn1Text, btn1Handler, btn2Text, btn2Handler, danger?, tone? }
 * Escape, the backdrop and the second button all cancel.
 */
const ConfirmationModal = ({ modalData }) => {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef(null);
  const boxRef = useRef(null);
  const lastFocus = useRef(null);

  useEffect(() => {
    lastFocus.current = document.activeElement;
    cancelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") modalData?.btn2Handler?.();
      if (e.key === "Tab") {
        const nodes = boxRef.current?.querySelectorAll("button");
        if (!nodes?.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      lastFocus.current?.focus?.();
    };
  }, [modalData]);

  if (!modalData) return null;
  const tone = TONE[modalData.danger ? "danger" : modalData.tone || "info"];

  return createPortal(
    <div className="sn-modal-backdrop fixed inset-0 z-[80] grid place-items-center bg-black/65 p-4 backdrop-blur-md" onMouseDown={(e) => e.target === e.currentTarget && modalData.btn2Handler?.()}>
      <div
        ref={boxRef}
        data-modal
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={modalData.text2 ? descId : undefined}
        className="sn-modal w-full max-w-[400px] rounded-[20px] border border-ink/10 bg-surface p-6 text-center shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)]"
      >
        <span className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${tone.ring}`} aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={tone.d} />
          </svg>
        </span>
        <h2 id={titleId} className="mt-4 text-xl font-bold tracking-tight text-ink">
          {modalData.text1}
        </h2>
        {modalData.text2 && (
          <p id={descId} className="mt-2 text-[15px] leading-relaxed text-muted">
            {modalData.text2}
          </p>
        )}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button ref={cancelRef} type="button" onClick={modalData.btn2Handler} className="min-h-[46px] rounded-xl border border-line bg-raised px-4 font-semibold text-ink transition-colors hover:bg-line">
            {modalData.btn2Text || "Cancel"}
          </button>
          <button type="button" onClick={modalData.btn1Handler} className={`min-h-[46px] rounded-xl px-4 font-semibold transition ${tone.btn}`}>
            {modalData.btn1Text}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmationModal;
