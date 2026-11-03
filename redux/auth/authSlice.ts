import { createSlice } from "@reduxjs/toolkit";
import { removeData } from "../../utils/asyncStorage";
import { setAuthToken } from "../../services/apiClient";
import { login, loginWithPasscode, updateProfile, updateProfilePicture } from "./authThunk";

interface AuthState {
  user: any | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  isInitialized: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  isInitialized: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      setAuthToken(null);
      removeData("userData");
      removeData("parent_profile");
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.token = action.payload?.token || action.payload?.access_token || null;
      state.isAuthenticated = !!action.payload && !!(action.payload?.token || action.payload?.access_token);
      state.isInitialized = true;
    },
    syncProfile: (state, action) => {
      if (action.payload) {
        state.user = state.user ? { ...state.user, ...action.payload } : action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(login.pending, (state) => {
      state.loading = true;
      state.isAuthenticated = false;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.loading = false;
      const token = action.payload?.token || action.payload?.access_token || null;
      if (action.payload && token) {
        state.user = action.payload;
        state.token = token;
        state.isAuthenticated = true;
      } else {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      }
      state.isInitialized = true;
    });
    builder.addCase(login.rejected, (state) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.isInitialized = true;
    });

    // Passcode Login
    builder.addCase(loginWithPasscode.pending, (state) => {
      state.loading = true;
      state.isAuthenticated = false;
    });
    builder.addCase(loginWithPasscode.fulfilled, (state, action) => {
      state.loading = false;
      const token = action.payload?.token || action.payload?.access_token || null;
      if (action.payload && token) {
        state.user = action.payload;
        state.token = token;
        state.isAuthenticated = true;
      } else {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      }
      state.isInitialized = true;
    });
    builder.addCase(loginWithPasscode.rejected, (state) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.isInitialized = true;
    });

    // Update Profile
    builder.addCase(updateProfile.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateProfile.fulfilled, (state, action) => {
      state.loading = false;
      state.user = { ...state.user, ...action.payload };
    });
    builder.addCase(updateProfile.rejected, (state) => {
      state.loading = false;
    });

    // Update Profile Picture
    builder.addCase(updateProfilePicture.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateProfilePicture.fulfilled, (state, action) => {
      state.loading = false;
      state.user = { ...state.user, picture: action.payload };
    });
    builder.addCase(updateProfilePicture.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const { logout, setUser, syncProfile } = authSlice.actions;
export default authSlice.reducer;
