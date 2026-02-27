require("dotenv").config();

const express = require("express");
const cors = require("cors");
const authRouter = require("./router/authRouter.js");
const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(cors());
app.use(express.json());

app.listen(5000, () => {
  console.log(`Server is running on Port ${PORT}`);
});

app.use("/register", authRouter);
