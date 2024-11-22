import React from 'react';
import { useSelector } from 'react-redux';
import RenderCartCourses from './RenderCartCourses';
import RenderTotalAmount from './RenderTotalAmount';

const Cart = () => {
  const { total, totalItems } = useSelector((state) => state.cart);

  return (
    <div className="cart-container">
      {/* Cart Title */}
      <h1>Your Cart</h1>

      {/* Cart Item Count */}
      <p>{totalItems} Course{totalItems !== 1 ? 's' : ''} in Cart</p>

      {/* Conditional Rendering: Cart Contents or Empty Message */}
      {total > 0 ? (
        <div>
          {/* Render Courses */}
          <RenderCartCourses />

          {/* Render Total Amount */}
          <RenderTotalAmount />
        </div>
      ) : (
        <p>Your cart is empty.</p>
      )}
    </div>
  );
};

export default Cart;
