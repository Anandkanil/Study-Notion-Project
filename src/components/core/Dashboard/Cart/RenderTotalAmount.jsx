import React from "react";
import { useSelector } from "react-redux";
import IconBtn from "../../../common/IconBtn";

const RenderTotalAmount = () => {
  // Access total amount and cart items from Redux state
  const { total, cart } = useSelector((state) => state.cart);

  // Handle the "Buy Now" button click
  const handleBuyCourse = () => {
   
      // Ensure there are courses in the cart before proceeding
      if (!cart || cart.length === 0) {
        console.error("Cart is empty. Cannot proceed to purchase.");
        return;
      }
      // TODO: Integrate payment gateway or backend API
  };

  return (
    <div className="total-amount-container p-4 bg-gray-800 text-white rounded-md shadow-md">
      {/* Total Amount Display */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-lg font-medium">Total:</p>
        <p className="text-xl font-bold">₹{total.toLocaleString("en-IN")}</p>
      </div>

      {/* "Buy Now" Button */}
      <IconBtn
        text="Buy Now"
        onClick={handleBuyCourse}
        customClasses={"w-full justify-center bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md"}
      />
    </div>
  );
};

export default RenderTotalAmount;
