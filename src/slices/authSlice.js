import { createSlice } from "@reduxjs/toolkit";

/** Saved login, or null if missing, unreadable or already expired (checked from the token's own expiry). */
function savedToken() {
    try {
        const token = JSON.parse(localStorage.getItem("token") || "null");
        if (!token) return null;
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        if (payload.exp && payload.exp * 1000 <= Date.now()) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            return null;
        }
        return token;
    } catch {
        return null;
    }
}

const initialState = {
    signupData: null,
    loading: false,
    token: savedToken()
}
const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setSignupData: (state, value) => {
            state.signupData = value.payload
        },
        setLoading: (state, value) => {
            state.loading = value.payload
        },
        setToken: (state, value) => {
            state.token = value.payload;
        }
    }
});
export const { setToken, setSignupData, setLoading } = authSlice.actions;
export default authSlice.reducer;