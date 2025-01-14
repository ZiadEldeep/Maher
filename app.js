const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { prisma } = require("./prisma.js");
const path = require("path");
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const app = express();
const twilio = require("twilio");
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
app.post("/registerApi", async (req, res) => {
  const { name, email, phone} = req.body;
  
  // Generate a random 4-digit numeric verification code
  const verificationCode = Math.floor(1000 + Math.random() * 9000); // This will generate a 4-digit number

  try {
    // Step 1: Create the user in the database
    await prisma.user.create({
      data: { name, email, phone, verificationCode:`${verificationCode}`},
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
            <p style="font-size: 14px; color: #777;">Kind Regards,<br>MAHER Team</p>
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
      res.status(201).json({ message: "success", user });
    } else {
      res.status(403).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error finding user", error });
    console.error(error);
  }
});
// Twilio credentials from the environment variables
// const accountSid = process.env.TWILIO_ACCOUNT_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;
// const client = twilio(accountSid, authToken);
// API Endpoint to send verification code via WhatsApp
// app.post("/verifiedwhtsp", async (req, res) => {
//   const { phone } = req.body;

//   // Generate a random 4-digit numeric verification code
//   const verificationCode = Math.floor(1000 + Math.random() * 9000);

//   try {
//     // Send the verification code via WhatsApp using Twilio
//     const message = await client.messages.create({
//       from: process.env.TWILIO_WHATSAPP_NUMBER, // Your Twilio WhatsApp number
//       to: `whatsapp:${phone}`, // The recipient's phone number
//       body: `Your verification code is: ${verificationCode}`,
//     });

//     // Respond with success message
//     res.json({ message: "success", verificationCode, whatsappMessageSid: message.sid });
//   } catch (error) {
//     res.status(500).json({ message: "Error sending WhatsApp message", error: error.message });
//     console.error(error);
//   }
// });
app.post('/addCar', async (req, res) => {
  const { brand, model, color, fuelType, discNumber, licensePlate, madeYear, kilometers } = req.body;

  try {
    console.log(prisma);  // Log prisma to check if it's available
    const newCar = await prisma.car.create({
      data: {
        brand,
        model,
        color,
        fuelType,
        discNumber,
        licensePlate,
        madeYear,
        kilometers,
      },
    });

    res.json({ message: 'Car added successfully', car: newCar });
  } catch (error) {
    console.error('Error creating car:', error);
    res.status(500).json({ message: 'Error saving car data', error: error.message });
  }
});
app.post("/getVcode", async (req, res) => {
  const { email, verificationCode } = req.body;

  try {
    // Validate the inputs
    if (!email || !verificationCode) {
      return res.status(400).json({ message: "Email and verification code are required" });
    }

    // Update the user's verification code in the database
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { verificationCode },
    });

    // If the user is not found, return 404
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Respond with success
    res.status(200).json({ message: "Verification code stored successfully", user: updatedUser });
  } catch (error) {
    console.error("Error storing verification code:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// Start the server
const PORT = 3999;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
