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
    res.status(500).json({ message: "Erroor fetching users", error });
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
app.post("/login",async(req,res)=>{
  const {phone}=req.body;
  try{
    let user= await prisma.user.findMany({
      where: {
        phone:phone 
      }
      
    }) 
    if (user) {
      
      res.json({message: "success"})
    }
    else{
      res.json({message: "user not found"}).status(403)
    }
  }
  catch (error) {
    res.status(500).json({ message: "Error find user ", error });
    console.error(error);
  }
})

// Route: Add a new product
// app.post("/addProduct", async (req, res) => {
//   const { name, description, price } = req.body;
//   const priceValue = parseFloat(price);
//   if (isNaN(priceValue)) {
//     return res.status(400).json({ message: "Invalid price value" });
//   }
//   try {
//     await prisma.product.create({
//       data: { name, description, price: priceValue },
//     });
//     res.json({ message: "success" });
//   } catch (error) {
//     res.status(500).json({ message: "Error adding product", error });
//     console.error(error);
//   }
// });

//  Route: Delete a product
// app.delete("/delete", async (req, res) => {
//   const { id } = req.body;
//   try {
//     await prisma.product.delete({
//       where: { id: String(id) }, // Cast ID to string for MongoDB
//     });
//     res.json({ message: "success" });
//   } catch (error) {
//     res.status(500).json({ message: "Error deleting product", error });
//     console.error(error);
//   }
// });

// Start server
app.listen(3999, () => {
  console.log("Server running on port 3999");
});
