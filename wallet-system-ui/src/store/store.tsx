// store.ts
import { configureStore } from '@reduxjs/toolkit';
import adminReducer from './adminSlice';
import userReducer from './userSlice';

const store = configureStore({
  reducer: {
    admin: adminReducer,
    user: userReducer,
  },
});

// Define RootState and AppDispatch types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;