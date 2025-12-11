const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const mongoose = require("mongoose");
const path = require('path');

const authRoutes = require("./src/routes/auth");
const healthRoutes = require("./src/routes/healthRoutes"); 
const menuRoutes = require('./src/routes/menuRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const cartRoutes = require("./src/routes/cartRoutes");
const accountRoutes = require("./src/routes/accountRoutes");
const recommendationRoutes = require("./src/routes/recommendationRoutes");

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Serve frontend pages (make sure the path matches your actual folder names)
app.use(express.static(path.join(__dirname, '../Front-end')));
app.use(express.static(path.join(__dirname, '../Front-end/Pages')));

//  API routes
app.use('/api/menu', menuRoutes);
app.use('/api/payment', paymentRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/recommendations", recommendationRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Cafe Ordering System API!' });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected Successfully!"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

//  Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
