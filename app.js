const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { prisma } = require("./prisma.js");
const path = require("path");
const nodemailer = require('nodemailer');
const crypto = require('crypto');
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

// Route: Get a specific car by brand and model
app.get("/carBM", (req, res) => {
  const { brand, model } = req.query;  // Get brand and model from query parameters
  const jsonData = readJSONFile();

  let foundCar = null;

  // Search for the car in the specified brand and model
  if (brand && model && jsonData[brand]) {
    foundCar = jsonData[brand].find((car) => car.Model.toLowerCase() === model.toLowerCase());
  }

  // Return the found car or an error message
  if (foundCar) {
    res.json({ message: "success", brand: brand, data: foundCar });
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
// Route: Add a new registration
app.post("/registerApi", async (req, res) => {
  const { name, email, phone } = req.body;
  
  // Generate a random 4-digit numeric verification code
  const verificationCode = Math.floor(1000 + Math.random() * 9000); // This will generate a 4-digit number

  try {
    // Step 1: Create the user in the database
    await prisma.user.create({
      data: { name, email, phone },
    });

    // Step 2: Set up Nodemailer transporter using environment variables
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
      },
    });

    // Step 3: Compose the email with styling
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Registration Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f4f9; padding: 20px; text-align: center; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #007bff;">Welcome to Maher for Cars Services</h2>
            <p style="font-size: 16px; color: #555;">Thank you for registering. To complete your registration, please use the verification code below:</p>
            <h3 style="font-size: 24px; color: #333; background-color: #f8f9fa; padding: 10px 20px; border-radius: 6px; display: inline-block;">${verificationCode}</h3>
            <p style="font-size: 16px; color: #555; margin-top: 20px;">If you didn't request this, please ignore this email.</p>
            <hr style="margin-top: 30px; border: 0; border-top: 1px solid #eee;">
            <p style="font-size: 14px; color: #777;">Kind Regards,<br>Our Team</p>
          </div>
        </div>
      `,
    };

    // Step 4: Send the email
    await transporter.sendMail(mailOptions);

    // Step 5: Respond with success message
    res.json({ message: "success", verificationCode });

  } catch (error) {
    if (error.code === 'EAUTH') {
      res.status(500).json({ message: "SMTP authentication failed", error });
    } else if (error.message.includes("unique constraint")) {
      res.status(400).json({ message: "User with this email already exists", error });
    } else {
      res.status(500).json({ message: "Error adding registration", error });
    }
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
