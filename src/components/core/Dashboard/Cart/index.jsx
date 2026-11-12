import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

import toast from "react-hot-toast";
import DiscountCode from "../../../common/DiscountCode";

import { addToCart, removeFromCart } from "../../../../slices/cartSlice";
import { buyCourse } from "../../../../services/operations/studentFeaturesAPI";
import GetAvgRating from "../../../../utils/avgRating";
import { formatINR } from "../../../../utils/formatINR";
import { Button, EmptyState, buttonClass } from "../../../ui";

export default function Cart() {
  const { cart, total, totalItems } = useSelector((state) => state.cart);
  const [applied, setDiscount] = useState(null);
  // Drop the discount if its course leaves the cart
  const discount = applied && cart.some((c) => String(c._id) === String(applied.courseId)) ? applied : null;
  const { token } = useSelector((state) => state.auth);
  const { user } = useSelector((state) => state.profile);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [buying, setBuying] = useState(false);

  const checkout = async () => {
    setBuying(true);
    try {
      await buyCourse(token, cart.map((c) => c._id), user, navigate, dispatch, discount?.code);
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">Cart</h1>
        <p className="mt-1 text-muted">
          {totalItems} {totalItems === 1 ? "course" : "courses"}
        </p>
      </div>

      {cart.length === 0 ? (
        <EmptyState title="Your cart is empty" action={<Link to="/" className={buttonClass("primary")}>Browse courses</Link>}>
          Add courses from their pages, then buy them all together in one payment.
        </EmptyState>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
          <ul className="flex flex-col gap-4">
            {cart.map((course) => {
              const rating = GetAvgRating(course.ratingAndReviews);
              const count = course.ratingAndReviews?.length || 0;
              return (
                <li key={course._id} className="flex flex-wrap gap-4 rounded-2xl border border-line bg-surface p-4 sm:flex-nowrap">
                  <Link to={`/courses/${course._id}`} className="shrink-0" tabIndex={-1} aria-hidden="true">
                    <img src={course.thumbnail} alt="" className="aspect-video w-full rounded-xl object-cover sm:w-48" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link to={`/courses/${course._id}`} className="text-lg font-bold text-ink hover:underline">
                      {course.courseName}
                    </Link>
                    {course.category?.name && <p className="text-sm text-muted">{course.category.name}</p>}
                    <p className="text-sm text-muted">{count > 0 ? `★ ${rating.toFixed(1)} (${count} ${count === 1 ? "rating" : "ratings"})` : "No ratings yet"}</p>
                  </div>
                  <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end">
                    <p className="text-lg font-bold text-ink">{formatINR(course.price)}</p>
                    <button
                      type="button"
                      onClick={() => {
                        dispatch(removeFromCart(course._id));
                        toast.success(
                          (t) => (
                            <span className="flex items-center gap-3">
                              Removed from cart
                              <button
                                type="button"
                                onClick={() => {
                                  toast.dismiss(t.id);
                                  dispatch(addToCart(course));
                                }}
                                className="rounded-lg px-2 py-1 font-bold text-accent-text underline-offset-4 hover:underline"
                              >
                                Undo
                              </button>
                            </span>
                          ),
                          { id: `removed-${course._id}`, duration: 6000 }
                        );
                      }}
                      aria-label={`Remove ${course.courseName} from cart`}
                      className="rounded-lg px-3 py-2 text-sm font-semibold text-danger hover:bg-danger/10"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <aside aria-labelledby="cart-summary" className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-24">
            <h2 id="cart-summary" className="font-semibold text-ink">
              Order summary
            </h2>
            <dl className="mt-4 flex flex-col gap-2 text-muted">
              <div className="flex justify-between">
                <dt>
                  {totalItems} {totalItems === 1 ? "course" : "courses"}
                </dt>
                <dd>{formatINR(total)}</dd>
              </div>
              {discount && (
                <div className="flex justify-between text-success">
                  <dt>Discount ({discount.code})</dt>
                  <dd>−{formatINR(discount.saving)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-line pt-3 text-lg font-bold text-ink">
                <dt>Total</dt>
                <dd>{formatINR(total - (discount?.saving || 0))}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-col">
              <DiscountCode courseIds={cart.map((c) => c._id)} applied={discount} onApply={setDiscount} />
            </div>
            <Button size="lg" className="mt-5 w-full" onClick={checkout} loading={buying} loadingText="Opening checkout…">
              Checkout
            </Button>
            <p className="mt-3 text-center text-sm text-muted">Pay with UPI, card or net banking. One-time payment.</p>
          </aside>
        </div>
      )}
    </div>
  );
}
