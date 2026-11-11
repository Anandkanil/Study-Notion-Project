import React from "react";
import { buttonClass } from "../ui";

/** Legacy button API kept for older screens; renders the Night Shift button. */
// `type` is deliberately left unset by default: inside a form the browser treats
// it as "submit", which the course wizard relies on (Next, Save, Create section).
const IconBtn = ({ text, onclick, children, disabled, outline = false, customClasses = "", type, style = "" }) => (
  <button
    className={buttonClass(outline ? "secondary" : "primary", "md", `${customClasses} ${style}`)}
    disabled={disabled}
    onClick={onclick}
    type={type}
  >
    {children ? (
      <>
        <span>{text}</span>
        {children}
      </>
    ) : (
      text
    )}
  </button>
);

export default IconBtn;
