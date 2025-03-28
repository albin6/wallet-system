import mongoose from "mongoose";

const walletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  availableBalance: { type: Number, default: 0 },
  heldBalance: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

walletSchema.index({ userId: 1 });

export const Wallet = mongoose.model('Wallet', walletSchema);