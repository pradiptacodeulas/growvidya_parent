import { createAsyncThunk } from "@reduxjs/toolkit";
import { storeData } from "../../utils/asyncStorage";
import { apiFetch, setAuthToken } from "@/services/apiClient";
import { RootState } from "../store";

const login = createAsyncThunk(
  "auth/login",
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiFetch("/parent/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!response.success || !response.data) {
        throw new Error(response.message || "Invalid email or password");
      }

      const resData = response.data;
      const extractedToken =
        resData?.token ||
        resData?.access_token ||
        response?.data?.token;

      if (!extractedToken) {
        throw new Error("Authentication token not received from server");
      }

      setAuthToken(extractedToken);

      const parentInfo = resData?.parent || resData?.user || resData;
      const userData = {
        ...parentInfo,
        token: extractedToken,
      };

      await storeData("userData", userData);
      return userData;
    } catch (error: any) {
      return rejectWithValue(error.message || "An unexpected error occurred during login");
    }
  }
);

export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (profileData: any, { getState, rejectWithValue }) => {
    try {
      const response = await apiFetch("/parent/auth/profile", {
        method: "PUT",
        body: JSON.stringify(profileData),
      });

      if (!response.success) {
        throw new Error(response.message || "Failed to update profile");
      }

      const state = getState() as RootState;
      const updatedParent = response.data?.parent || response.data;
      const mergedUser = {
        ...state.auth.user,
        ...updatedParent,
        token: state.auth.token,
      };

      await storeData("userData", mergedUser);
      return updatedParent;
    } catch (error: any) {
      return rejectWithValue(error.message || "An unexpected error occurred while updating profile");
    }
  }
);

export const updateProfilePicture = createAsyncThunk(
  "auth/updateProfilePicture",
  async (image: any, { getState, rejectWithValue }) => {
    try {
      const filename =
        image.fileName || image.uri?.split("/").pop() || "parent_profile.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const mimeType =
        image.mimeType || (match ? `image/${match[1]}` : "image/jpeg");

      const formData = new FormData();
      formData.append("file", {
        uri: image.uri,
        name: filename,
        type: mimeType,
      } as any);

      // 1. Upload to modern upload endpoint
      const uploadRes = await apiFetch("/upload/single", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.success || !uploadRes.data) {
        throw new Error(uploadRes.message || "Failed to upload image to server");
      }

      const uploadedPath =
        uploadRes.data.file_path ||
        uploadRes.data.filePath ||
        uploadRes.data.url ||
        uploadRes.data.filename;

      // 2. Persist new picture to parent profile in database
      const profileUpdateRes = await apiFetch("/parent/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ picture: uploadedPath }),
      });

      if (!profileUpdateRes.success) {
        throw new Error(profileUpdateRes.message || "Failed to save profile picture");
      }

      const state = getState() as RootState;
      const updatedUser = {
        ...state.auth.user,
        picture: uploadedPath,
      };

      await storeData("userData", updatedUser);
      return uploadedPath;
    } catch (error: any) {
      return rejectWithValue(error.message || "An unexpected error occurred during image upload");
    }
  }
);

export const loginWithPasscode = createAsyncThunk(
  "auth/loginWithPasscode",
  async (
    { identifier, passcode }: { identifier: string; passcode: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiFetch("/parent/auth/verify-passcode", {
        method: "POST",
        body: JSON.stringify({
          identifier: identifier.trim(),
          passcode: passcode.trim(),
        }),
      });

      if (!response.success || !response.data) {
        throw new Error(response.message || "Invalid or expired passcode");
      }

      const resData = response.data;
      const extractedToken =
        resData?.token ||
        resData?.access_token ||
        response?.data?.token;

      if (!extractedToken) {
        throw new Error("Authentication token not received from server");
      }

      setAuthToken(extractedToken);

      const parentInfo = resData?.parent || resData?.user || resData;
      const userData = {
        ...parentInfo,
        token: extractedToken,
      };

      await storeData("userData", userData);
      return userData;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "An unexpected error occurred during passcode verification"
      );
    }
  }
);

export { login };
