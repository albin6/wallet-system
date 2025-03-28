// adminSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define types
interface AdminState {
  adminData: any | null; // You can replace 'any' with a specific admin data interface
}

const initialState: AdminState = {
  adminData: JSON.parse(localStorage.getItem('adminData') || 'null'),
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    adminLogin: (state, action: PayloadAction<any>) => { // Replace 'any' with your admin data type
      state.adminData = action.payload;
      localStorage.setItem('adminAuth', 'true');
      localStorage.setItem('adminData', JSON.stringify(action.payload));
    },
    adminLogout: (state) => {
      state.adminData = null;
      localStorage.removeItem('adminAuth');
      localStorage.removeItem('adminData');
    },
  },
});

export const { adminLogin, adminLogout } = adminSlice.actions;
export default adminSlice.reducer;

