import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";

import { apiConnector } from "../../../services/apiconnector";
import { profileEndpoints } from "../../../services/apis";
import { addToCart } from "../../../slices/cartSlice";
import { setWishlistIds, toggleWishlist } from "../../../slices/wishlistSlice";
import { formatINR } from "../../../utils/formatINR";
import { Button, EmptyState, buttonClass } from "../../ui";

export default function Wishlist() {
  const dispatch = useDispatch();
  const { token } = useSelector((s) => s.auth);
  const ids = useSelector((s) => s.wishlist.ids);
  const cart = useSelector((s) => s.cart.cart);
  const [state, setState] = useState({ status: "loading", list: [] });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: "loading" }));
    try {
      const res = await apiConnector("GET", profileEndpoints.WISHLIST_API, null, { Authorization: `Bearer ${token}` });
      const list = res.data?.data || [];
      dispatch(setWishlistIds(list.map((c) => c._id)));
      setState({ status: "ready", list });
    } catch (error) {
      console.error("Wishlist:", error);
      setState({ status: "failed", list: [] });
    }
  }, [token, dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  // Courses removed with the heart elsewhere drop off this list too
  const list = state.list.filter((c) => ids.includes(String(c._id)));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">Wishlist</h1>
        <p className="mt-1 text-muted">Courses you saved for later. Bought courses leave this list on their own.</p>
      </div>

      {state.status === "failed" ? (
        <EmptyState title="Your wishlist couldn't load" action={<Button variant="secondary" onClick={load}>Try again</Button>}>
          The server may still be waking up. This usually takes under a minute.
        </EmptyState>
      ) : state.status === "loading" && state.list.length === 0 ? (
        <div role="status" aria-label="Loading your wishlist" className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState title="Nothing saved yet" action={<Link to="/search" className={buttonClass("primary")}>Find courses</Link>}>
          Tap the heart on any course to save it here.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((c) => {
            const inCart = cart?.some((x) => x._id === c._id);
            const teacher = [c.instructor?.firstName, c.instructor?.lastName].filter(Boolean).join(" ");
            return (
              <li key={c._id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4">
                <Link to={`/courses/${c._id}`} className="flex min-w-0 flex-1 items-center gap-4">
                  <img src={c.thumbnail} alt="" className="aspect-video w-28 shrink-0 rounded-lg object-cover sm:w-36" />
                  <span className="min-w-0">
                    <span className="block font-bold text-ink hover:underline">{c.courseName}</span>
                    {teacher && <span className="block text-sm text-muted">{teacher}</span>}
                    <span className="mt-1 block font-bold text-accent-text">{formatINR(c.price)}</span>
                  </span>
                </Link>
                <div className="flex flex-wrap gap-2">
                  {inCart ? (
                    <Link to="/dashboard/cart" className={buttonClass("secondary", "sm")}>
                      In cart
                    </Link>
                  ) : (
                    <Button size="sm" onClick={() => dispatch(addToCart(c))}>
                      Add to cart
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => dispatch(toggleWishlist(c._id, token))}>
                    Remove
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
