import dotenv from "dotenv";
dotenv.config();

import cluster from "cluster";
import os from "os";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import userRoutes from "./routes/user.route.js";
import adminRoutes from "./routes/admin.route.js";
import { deposit } from "./controllers/user.controller.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ALLOWED_ORIGIN,
  })
);

app.use(express.json());

connectDB();

app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);

app.post("/deposit", deposit);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port 3030"));
