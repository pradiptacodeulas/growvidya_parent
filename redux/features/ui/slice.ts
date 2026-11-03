import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface UIState {
  theme: "light" | "dark" | "automatic";
}

const initialState: UIState = {
  theme: "light",
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<"light" | "dark" | "automatic">) => {
      state.theme = action.payload;
    },
  },
});

export const { setTheme } = uiSlice.actions;
export default uiSlice.reducer;
