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
app.get("/getCars", (req, res) => {
  const jsonData = readJSONFile();
  res.json({ message: "success", data: jsonData });
});
app.get("/getCars/:id", (req, res) => {
  const { id } = req.params;
  const jsonData = readJSONFile();

  let foundCar = null;

  // Search for the car across all brands
  for (const brand in jsonData) {
    foundCar = jsonData[brand]["models"].find((car) => car.id === parseInt(id, 10));
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
app.get("/carBM", (req, res) => {
  const { brand, model } = req.query;  // Get brand and model from query parameters
  const jsonData = readJSONFile();

  let foundCar = null;

  // Search for the car in the specified brand and model
  if (brand && model && jsonData[brand]) {
    foundCar = jsonData[brand]["models"].find((car) => car.Model.toLowerCase() === model.toLowerCase());
  }

  // Return the found car or an error message
  if (foundCar) {
    res.json({ message: "success", brand: brand, data: foundCar });
  } else {
    res.status(404).json({ message: "Car not found" });
  }
});
app.get("/show", async (req, res) => {
  try {
    // Fetch all users from the database
    const users = await prisma.user.findMany();

    // Check if users array is empty
    if (users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    // Return success response with users
    res.json({ message: "success", users });
  } catch (error) {
    // Log and return error response
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Error fetching users", error });
  }
});
app.post("/registerApi", async (req, res) => {
  const { name, email, phone} = req.body;
  
  // Generate a random 4-digit numeric verification code
  const verificationCode = Math.floor(1000 + Math.random() * 9000); // This will generate a 4-digit number

  try {
    // Step 1: Create the user in the database
   let user= await prisma.user.create({
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
    res.status(201).json({ message: "success", user });

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
app.post("/login", async (req, res) => {
  const { phone } = req.body;

  // Generate a random 4-digit verification code
  const verificationCode = Math.floor(1000 + Math.random() * 9000);

  try {
    // Step 1: Find the user by phone number
    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (user) {
      // Step 2: Update the user's verification code in the database
      await prisma.user.update({
        where: { phone },
        data: { verificationCode: `${verificationCode}` },
      });

      // Step 3: Set up Nodemailer transporter
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASSWORD,
        },
      });

      // Step 4: Compose the email with the verification code
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: user.email, // Send email to the user's registered email
        subject: 'Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; background-color: #f4f4f9; padding: 20px; text-align: center; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #007bff;">Verification Code</h2>
              <p style="font-size: 16px; color: #555;">Hello ${user.name},</p>
              <p style="font-size: 16px; color: #555;">Your verification code is:</p>
              <h3 style="font-size: 24px; color: #333; background-color: #f8f9fa; padding: 10px 20px; border-radius: 6px; display: inline-block;">${verificationCode}</h3>
              <p style="font-size: 16px; color: #555; margin-top: 20px;">Please use this code to verify your login. If you didn't request this, please contact our support team immediately.</p>
              <hr style="margin-top: 30px; border: 0; border-top: 1px solid #eee;">
              <p style="font-size: 14px; color: #777;">Kind Regards,<br>MAHER Team</p>
            </div>
          </div>
        `,
      };

      // Step 5: Send the email
      await transporter.sendMail(mailOptions);
      // Step 6: Respond with success
      res.status(201).json({ message: "Verification code sent successfully" ,user:{...user,verificationCode}});
    } else {
      // Step 7: Handle case where user is not found
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    // Step 8: Handle errors
    res.status(500).json({ message: "Error during login", error });
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
  const { userId, brand, model, color, fuelType, discNumber, licensePlate, madeYear, kilometers, estmara, fixDescription } = req.body;

  try {
    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create a new car and associate it with the user
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
        estmara,
        userId,
      },
    });

    // Create a fix record for the new car
    const newFix = await prisma.fix.create({
      data: {
        description: fixDescription,  // Description of the fix
        date: new Date(),  // Date of the fix
        carId: newCar.id,  // Linking fix to the car by carId
      },
    });

    // Return the updated user data with the associated cars (including the new car)
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        cars: true, // Include related cars data
      },
    });

    res.status(201).json({
      message: 'Car and fix added successfully',
      car: newCar,
      fix: newFix,
      user: updatedUser, // Include the updated user with car IDs
    });
  } catch (error) {
    console.error('Error adding car and fix:', error);
    res.status(500).json({ message: 'Error adding car and fix', error: error.message });
  }
});
app.post("/fix", async (req, res) => {
  const { kilometers, lastFixDate, fix, rememberMe, morfaqat, carId } = req.body;

  try {
    // Basic validation for required fields
    if (!kilometers || !lastFixDate || !fix || !morfaqat || !carId) {
      return res.status(400).json({ message: "All fields except 'rememberMe' are required" });
    }

    // Check if the car exists
    const car = await prisma.car.findUnique({
      where: { id: carId },
    });

    if (!car) {
      return res.status(404).json({ message: "Car not found" });
    }

    // Save fix data to the database
    const fixEntry = await prisma.fix.create({
      data: {
        kilometers,
        lastFixDate: new Date(lastFixDate),
        fix,
        rememberMe, // Optional field
        morfaqat,
        carId, // Associate the fix with the car
      },
    });

    // Respond with success
    res.status(201).json({ message: "Fix entry saved successfully", fixEntry });
  } catch (error) {
    // Handle database and other errors
    console.error("Error saving fix entry:", error);

    // Customize error response based on the error type
    if (error.code === "P2002") {
      res.status(400).json({ message: "Duplicate entry detected", error });
    } else {
      res.status(500).json({ message: "Error saving fix entry", error });
    }
  }
});
app.delete('/deleteCar/:id', async (req, res) => {
  const { id } = req.params;

  // Basic Validation: Check if the id is provided and is a number
 
  try {
    // Check if the car exists before trying to delete
    const car = await prisma.car.findUnique({
      where: { id: id },
    });

    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    // Delete the car
    await prisma.car.delete({
      where: { id: id },
    });

    // Respond with success
    res.status(200).json({ message: 'Car deleted successfully' });

  } catch (error) {
    console.error('Error deleting car:', error);
    res.status(500).json({ message: 'Error deleting car', error: error.message });
  }
});
app.get('/getCar/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch car by ID
    const car = await prisma.car.findUnique({
      where: { id },
    });

    // If the car is not found
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    // Respond with the car data
    res.status(200).json({ message: 'Car retrieved successfully', car });
  } catch (error) {
    console.error('Error fetching car by ID:', error);

    // Handle invalid ObjectId format
    if (error.code === 'P2025') {
      res.status(404).json({ message: 'Car not found' });
    } else {
      res.status(500).json({ message: 'Error retrieving car data', error: error.message });
    }
  }
});
app.get("/user/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch the user by ID, including their cars and the fixes for each car
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        cars: {
          include: {
            fixes: {
              select: {
                fix: true, // Only select the 'fix' name
              },
            },
          },
        },
      },
    });

    // Check if user exists
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prepare response with user data, including cars and fixes
    const userData = {
      ...user,
      cars: user.cars.map((car) => ({
        ...car,
        fixes: car.fixes.map((fix) => ({
          fixName: fix.fix,  // Just the fix name
        })),
      })),
    };

    res.status(200).json(userData);
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Error fetching user data", error: error.message });
  }
});

const PORT = 3999;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});