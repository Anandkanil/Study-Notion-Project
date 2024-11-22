import React from 'react'

const IconBtn = ({
    text,
    onclick,
    children,
    disabled,
    outline=false,
    customClasses,
    type,
    style=`bg-yellow-100 font-semibold hover:bg-yellow-600 text-black py-2 px-4 rounded-lg transition duration-300 flex items-center gap-2`
}) => {
  return (
    <button 
    className={style}
    disabled={disabled}
    onClick={onclick}
    type={type}>
        {
            children ? (
                <>
                    <span>
                        {text}
                    </span>
                    {children}
                </>
            ) : (text)
        }
    </button>
  )
}

export default IconBtn
