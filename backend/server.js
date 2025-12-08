require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const itemRoutes = require("./routes/search.js");
const populateRoutes = require("./routes/populate.js");
const orderRoutes = require("./routes/order.js");
const recommendRoutes = require("./routes/recommend.js");

app.use(express.json());

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("✅ MongoDB Atlas connected successfully.");
    app.listen(PORT, () => {
      console.log(`\n🌍 Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

app.get("/", (req, res) => {
  res.send(
    "Hello from the Express Backend! The database connection is active."
  );
});
app.use("/api/items", itemRoutes);
app.use("/populate", populateRoutes);
app.use("/api/order", orderRoutes);
app.use("/api", recommendRoutes);
// IMPORTANT: You will need to add your API endpoints here:
// app.get('/api/food/search', ...);
// app.post('/api/order/place', ...);
// app.post('/api/food/recommend', ...);
