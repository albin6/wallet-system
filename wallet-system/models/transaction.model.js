import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default : null },
  walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['processing', 'success', 'failed'], default: 'processing' },
  type: { type: String, enum: ['payout', 'deposit'], default: 'payout' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

transactionSchema.index({ walletId: 1 }); 
transactionSchema.index({ status: 1, type: 1 });

export const Transaction = mongoose.model('Transaction', transactionSchema);