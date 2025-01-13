const express = require("express");
const { prisma } = require("../prisma.js");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const dataFilePath = path.join(__dirname, "../cars.json");

// Utility functions
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

// Routes
router.get("/getCars", (req, res) => {
  const jsonData = readJSONFile();
  res.json({ message: "success", data: jsonData });
});

router.post("/addCar", async (req, res) => {
  const { brand, model, color, fuelType, discNumber, licensePlate, madeYear, kilometers } = req.body;

  try {
    const newCar = await prisma.car.create({
      data: { brand, model, color, fuelType, discNumber, licensePlate, madeYear, kilometers },
    });
    res.json({ message: "Car added successfully", car: newCar });
  } catch (error) {
    console.error("Error creating car:", error);
    res.status(500).json({ message: "Error saving car data", error: error.message });
  }
});

module.exports = router;
