import React, { useEffect, useId, useRef } from "react";
import { buttonClass } from "../ui";

/**
 * Confirm dialog. modalData: { text1, text2, btn1Text, btn1Handler, btn2Text, btn2Handler, danger? }
 * Escape, the backdrop and the second button all cancel.
 */
const ConfirmationModal = ({ modalData }) => {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef(null);
  const lastFocus = useRef(null);

  useEffect(() => {
    lastFocus.current = document.activeElement;
    cancelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") modalData?.btn2Handler?.();
      // Keep focus inside the dialog
      if (e.key === "Tab") {
        const nodes = document.querySelectorAll("[data-modal] button");
        if (!nodes.length) return;
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

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[rgb(8_10_24/0.6)] p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && modalData.btn2Handler?.()}>
      <div
        data-modal
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={modalData.text2 ? descId : undefined}
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-pop)]"
      >
        <h2 id={titleId} className="font-display text-xl font-semibold text-ink">
          {modalData.text1}
        </h2>
        {modalData.text2 && (
          <p id={descId} className="mt-2 text-muted">
            {modalData.text2}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button ref={cancelRef} type="button" onClick={modalData.btn2Handler} className={buttonClass("secondary")}>
            {modalData.btn2Text || "Cancel"}
          </button>
          <button type="button" onClick={modalData.btn1Handler} className={buttonClass(modalData.danger ? "danger" : "primary")}>
            {modalData.btn1Text}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
