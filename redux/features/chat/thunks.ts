import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiFetch } from "@/services/apiClient";

export const fetchUnreadCount = createAsyncThunk(
  "chat/fetchUnreadCount",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiFetch("/messages/unread-count", {
        method: "GET",
      });

      if (!response.success) {
        throw new Error(response.message || "Failed to fetch unread count");
      }

      const resData = response.data;
      const count = Number(
        resData?.unreadCount !== undefined
          ? resData.unreadCount
          : resData?.data?.unreadCount !== undefined
          ? resData.data.unreadCount
          : 0
      );

      return count;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch unread message count");
    }
  }
);
