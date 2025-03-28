// userSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define types
interface UserState {
  userData: any | null; // You can replace 'any' with a specific user data interface
}

const initialState: UserState = {
  userData: JSON.parse(localStorage.getItem('userData') || 'null'),
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    userLogin: (state, action: PayloadAction<any>) => { // Replace 'any' with your user data type
      state.userData = action.payload;
      localStorage.setItem('userData', JSON.stringify(action.payload));
    },
    userLogout: (state) => {
      state.userData = null;
      localStorage.removeItem('userAuth');
      localStorage.removeItem('userData');
    },
  },
});

export const { userLogin, userLogout } = userSlice.actions;
export default userSlice.reducer;

