import React from "react";
import { buttonClass } from "../ui";

/** Legacy button API kept for older screens; renders the Night Shift button. */
const IconBtn = ({ text, onclick, children, disabled, outline = false, customClasses = "", type = "button", style = "" }) => (
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
