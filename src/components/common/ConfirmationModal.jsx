import React from "react";
import IconBtn from "./IconBtn"; // Assuming this component exists for custom button styles

const ConfirmationModal = ( modalData ) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      {/* Modal Content */}
      <div className="bg-richblack-800 text-white rounded-lg p-8 w-[90%] sm:w-[400px] shadow-lg">
        {/* Modal Header */}
        <div className="mb-6 text-center">
          <p className="text-xl font-semibold">{modalData.text1}</p>
          <p className="text-sm text-gray-400 mt-2">{modalData.text2}</p>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-between gap-4">
          {/* Primary action button */}
          <IconBtn
            onclick={modalData?.btn1Handler}
            text={modalData?.btn1Text}
          />

          {/* Secondary action button */}
          <button
            onClick={modalData?.btn2Handler}
            className="bg-transparent hover:bg-gray-600 text-gray-300 py-2 px-4 rounded-lg border border-gray-600 transition duration-300"
          >
            {modalData?.btn2Text}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
