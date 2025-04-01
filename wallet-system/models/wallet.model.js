import mongoose from 'mongoose';

const adminWalletSchema = new mongoose.Schema({
  balance: { type: Number, default: 0 }, // The total available balance controlled by admin
  updatedAt: { type: Date, default: Date.now },
});

export const AdminWallet = mongoose.model('AdminWallet', adminWalletSchema);