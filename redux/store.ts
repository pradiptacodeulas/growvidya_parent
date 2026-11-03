import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./auth/authSlice";
import homeReducer from "./home/homeSlice";
import uiReducer from "./features/ui/slice";
import chatReducer from "./features/chat/slice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    home: homeReducer,
    ui: uiReducer,
    chat: chatReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;