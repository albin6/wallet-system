import mongoose from "mongoose";

const userBalanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  availableBalance: { type: Number, default: 0 },
  holdBalance: { type: Number, default: 0 },
});

export const UserBalance = mongoose.model('UserBalance', userBalanceSchema);
