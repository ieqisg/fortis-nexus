import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(cors());
app.use(express.json());

app.listen(5000, () => {
  console.log(`Server is running on Port ${PORT}`);
});
