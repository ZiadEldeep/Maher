const express = require("express");
const cors = require("cors");
const { prisma } = require("./prisma.js");
const app = express();
app.use(express.json());
app.use(cors());

// Route: Get all products
app.get("/show", async (req, res) => {
  try {
    const user = await prisma.user.findMany();
    res.json({ message: "success", user });
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error });
    console.error(error);
  }
});

// Route: Add a new registration
app.post("/registerApi", async (req, res) => {
  const { name, email, phone } = req.body;
  try {
    await prisma.User.create({
      data: { name, email, phone },
    });
    res.json({ message: "success" });
  } catch (error) {
    res.status(500).json({ message: "Error adding registration", error });
    console.error(error);
  }
});
app.post("/login", async (req, res) => {
  const { phone } = req.body;
  try {
    let user = await prisma.user.findMany({
      where: {
        phone: phone,
      },
    });
    console.log(user, "1212");
    if (user[0]) {
      res.json({ message: "success", user: user });
    } else {
      res.json({ message: "user not found" }).status(403);
    }
  } catch (error) {
    res.status(500).json({ message: "Error find user ", error });
    console.error(error);
  }
});

// Start server
app.listen(3999, () => {
  console.log("Server running on port 3999");
});
