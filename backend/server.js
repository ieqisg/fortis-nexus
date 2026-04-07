import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./models/mongo.js"
import dns from "dns"

dns.setServers(["1.1.1.1", "8.8.8.8"])

const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(cors());
app.use(express.json());





async function startServer() {
  try {
    await connectDB(); // 🔥 connect ONCE before server starts

    app.listen(PORT, () => {
  console.log(`Server is running on Port ${PORT}`);
});

  } catch (err) {
    console.error("❌ Failed to start server:", err);
  }
}

startServer();
