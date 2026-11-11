import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import rootReducer from "./reducer";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { toast } from "react-hot-toast";
import { axiosInstance } from "./services/apiconnector";
import { setToken } from "./slices/authSlice";
import { setUser } from "./slices/profileSlice";

const store = configureStore({
  reducer: rootReducer,
});

// Expired or invalid session: sign out cleanly instead of failing every request.
// Role errors (403 "authorization required") and wrong-password logins are left alone.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message = String(error?.response?.data?.message || "");
    const url = String(error?.config?.url || "");
    const isAuthCall = /\/auth\/(login|signup|sendotp|reset-password)/.test(url);
    const sessionInvalid =
      status === 401 || (status === 403 && /invalid or expired token/i.test(message));

    if (sessionInvalid && !isAuthCall && store.getState().auth.token) {
      store.dispatch(setToken(null));
      store.dispatch(setUser(null));
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      toast.error("Your session has expired. Please log in again.", { id: "session-expired" });
    }
    return Promise.reject(error);
  }
);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Provider store={store}>
  <BrowserRouter>
    <App />
  </BrowserRouter>
  </Provider>

);
