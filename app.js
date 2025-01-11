const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { prisma } = require("./prisma.js");
const path = require("path");

const app = express();
const dataFilePath = path.join(__dirname, "cars.json");

app.use(express.json());
app.use(cors());

// Utility functions to read and write the JSON file
const readJSONFile = () => {
  try {
    const data = fs.readFileSync(dataFilePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading JSON file:", error);
    return [];
  }
};

const writeJSONFile = (data) => {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing JSON file:", error);
  }
};

// Route: Get all cars data
app.get("/getCars", (req, res) => {
  const jsonData = readJSONFile();
  res.json({ message: "success", data: jsonData });
});

// Route: Get a specific car by ID
app.get("/getCars/:id", (req, res) => {
  const { id } = req.params;
  const jsonData = readJSONFile();

  let foundCar = null;

  // Search for the car across all brands
  for (const brand in jsonData) {
    foundCar = jsonData[brand].find((car) => car.id === parseInt(id, 10));
    if (foundCar) 
      carBrand = brand;
      break; // Stop searching once the car is found
  }

  if (foundCar) {
    res.json({ message: "success",brand: carBrand, data: foundCar });
  } else {
    res.status(404).json({ message: "Car not found" });
  }
});

// Route: Show all users from the database
app.get("/show", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json({ message: "success", users });
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error });
    console.error(error);
  }
});

// Route: Add a new registration
app.post("/registerApi", async (req, res) => {
  const { name, email, phone } = req.body;
  try {
    await prisma.user.create({
      data: { name, email, phone },
    });
    res.json({ message: "success" });
  } catch (error) {
    res.status(500).json({ message: "Error adding registration", error });
    console.error(error);
  }
});

// Route: Login user
app.post("/login", async (req, res) => {
  const { phone } = req.body;
  try {
    const user = await prisma.user.findMany({
      where: { phone },
    });

    if (user.length > 0) {
      res.json({ message: "success", user });
    } else {
      res.status(403).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error finding user", error });
    console.error(error);
  }
});

// Start the server
const PORT = 3999;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
