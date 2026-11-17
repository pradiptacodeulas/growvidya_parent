import { createSlice } from "@reduxjs/toolkit";
import { removeData } from "../../utils/asyncStorage";
import { setAuthToken } from "../../services/apiClient";
import {
  login,
  loginWithPasscode,
  checkParentAuth,
  switchStudent,
  updateProfile,
  updateProfilePicture,
} from "./authThunk";

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

    // Check Parent Auth (Cold Start Session Verification)
    builder.addCase(checkParentAuth.fulfilled, (state, action) => {
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
    builder.addCase(checkParentAuth.rejected, (state, action) => {
      const payload = action.payload as { forceLogout?: boolean; cachedUser?: any } | undefined;
      if (payload && payload.forceLogout === false && payload.cachedUser) {
        const token =
          payload.cachedUser?.token ||
          payload.cachedUser?.access_token ||
          payload.cachedUser?.data?.token ||
          null;
        state.user = payload.cachedUser;
        state.token = token;
        state.isAuthenticated = !!token;
      } else {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      }
      state.isInitialized = true;
    });

    // Switch Active Child (Re-issues JWT with child's studentId & branchId)
    builder.addCase(switchStudent.fulfilled, (state, action) => {
      if (action.payload?.token) {
        state.token = action.payload.token;
      }
      if (action.payload?.user) {
        state.user = action.payload.user;
      } else if (state.user && action.payload?.activeChild) {
        state.user = {
          ...state.user,
          activeChild: action.payload.activeChild,
          ...(action.payload.token ? { token: action.payload.token } : {}),
        };
      }
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
