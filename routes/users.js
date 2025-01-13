const express = require("express");
const { prisma } = require("../prisma.js");

const router = express.Router();

router.get("/show", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json({ message: "success", users });
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error });
    console.error(error);
  }
});

router.post("/registerApi", async (req, res) => {
  const { name, email, phone } = req.body;

  try {
    await prisma.user.create({ data: { name, email, phone } });
    res.json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error registering user", error });
    console.error(error);
  }
});

module.exports = router;
