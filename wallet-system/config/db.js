import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 500,
    });
    console.log("MongoDB connected");
  } catch (error) {
    console.error("DB connection error:", error);
    process.exit(1);
  }
};
