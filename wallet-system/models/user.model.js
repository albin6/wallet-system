import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  balance: { type: mongoose.Schema.Types.ObjectId, ref: "UserBalance" },
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model('User', userSchema);