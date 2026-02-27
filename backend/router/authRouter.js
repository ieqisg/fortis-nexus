const express = require("express");
const { menteeRegister } = require("../controller/authController");
const router = express.Router();

router.post("/mentee-register", async (req, res) => {
  const { email, password } = req.body;
  const result = await menteeRegister(email, password);

  if (result.error) {
    console.log("error");
  }
  res.status(201).json({ user: result.user });
});

module.exports = router;
