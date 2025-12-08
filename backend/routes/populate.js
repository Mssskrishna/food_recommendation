const axios = require("axios");
const FoodItemModel = require("../models/FoodItem"); // Ensure this is imported
const express = require("express");
const app = express.Router();
// --- Configuration ---
const PYTHON_EMBEDDING_SERVER = "http://127.0.0.1:8000/encode"; // Your Python server endpoint

// Sample descriptions ready to be encoded
const descriptionsToSend = [
  "Hearty beef chili topped with shredded cheddar cheese, sour cream, and fresh green onions.",
  "Flaky, buttered croissant filled with sliced ham and Swiss cheese, served warm.",
  "Spicy mango sticky rice, a sweet Thai dessert with coconut milk and chili flakes.",
  "Rich and savory French onion soup with a caramelized onion base and a melted Gruyère cheese crouton.",
  "Glazed salmon fillet served over a bed of roasted asparagus and lemon butter sauce.",
  "A simple, classic Caesar wrap with romaine lettuce, Parmesan, croutons, and creamy Caesar dressing.",
  "Spicy buffalo chicken wings, baked crispy and tossed in a tangy hot sauce.",
  "Cold gazpacho soup, a Spanish blend of raw vegetables, tomato, and olive oil.",
  "Decadent red velvet cupcake topped with cream cheese frosting and sprinkles.",
  "A robust vegetable curry with potatoes, carrots, peas, and a hint of coconut, served with rice.",
];

async function getTenEmbeddings() {
  console.log(
    `\nSending ${descriptionsToSend.length} texts to Python server for batch encoding...`
  );
  try {
    const response = await axios.post(PYTHON_EMBEDDING_SERVER, {
      texts: descriptionsToSend, // The Python server expects this array structure
    });

    const embeddings = response.data.embeddings;

    if (!embeddings || embeddings.length !== 10) {
      throw new Error(
        `Expected 10 embeddings, but received ${
          embeddings ? embeddings.length : 0
        }.`
      );
    }

    console.log(`✅ Successfully received ${embeddings.length} vectors.`);
    console.log(`Vector dimension check: ${embeddings[0].length} floats.`);

    return embeddings;
  } catch (error) {
    console.error(
      "❌ FATAL ERROR: Could not fetch embeddings from Python server."
    );
    console.error(
      `Check if embedding_server.py is running at ${PYTHON_EMBEDDING_SERVER}`
    );

    // Throw an error to stop the process if the core component is down
    throw new Error(`Embedding Service Failed: ${error.message}`);
  }
}
// Example usage:
// This function would be part of your data seeding logic.

async function seedFoodItems() {
  try {
    const newEmbeddings = await getTenEmbeddings();

    const itemsToInsert = [
      {
        itemId: "SOU-021",
        name: "Hearty Beef Chili",
        description:
          "Hearty beef chili topped with shredded cheddar cheese, sour cream, and fresh green onions.",
        price: 13.0,
        category: "Soup",
        tags: ["spicy", "comfort", "beef", "cheddar"],
        itemEmbedding: newEmbeddings[0], // Vector for Item 21
      },
      {
        itemId: "BRK-022",
        name: "Ham & Cheese Croissant",
        description:
          "Flaky, buttered croissant filled with sliced ham and Swiss cheese, served warm.",
        price: 7.5,
        category: "Breakfast",
        tags: ["breakfast", "savory", "ham", "pastry"],
        itemEmbedding: newEmbeddings[1], // Vector for Item 22
      },
      {
        itemId: "DST-023",
        name: "Spicy Mango Sticky Rice",
        description:
          "Spicy mango sticky rice, a sweet Thai dessert with coconut milk and chili flakes.",
        price: 8.99,
        category: "Dessert",
        tags: ["sweet", "spicy", "Thai", "mango", "coconut"],
        itemEmbedding: newEmbeddings[2], // Vector for Item 23
      },
      {
        itemId: "SOU-024",
        name: "French Onion Soup",
        description:
          "Rich and savory French onion soup with a caramelized onion base and a melted Gruyère cheese crouton.",
        price: 9.5,
        category: "Soup",
        tags: ["French", "soup", "cheese", "savory"],
        itemEmbedding: newEmbeddings[3], // Vector for Item 24
      },
      {
        itemId: "SEA-025",
        name: "Glazed Salmon",
        description:
          "Glazed salmon fillet served over a bed of roasted asparagus and lemon butter sauce.",
        price: 22.0,
        category: "Seafood",
        tags: ["healthy", "fish", "asparagus", "gourmet"],
        itemEmbedding: newEmbeddings[4], // Vector for Item 25
      },
      {
        itemId: "SLD-026",
        name: "Classic Caesar Wrap",
        description:
          "A simple, classic Caesar wrap with romaine lettuce, Parmesan, croutons, and creamy Caesar dressing.",
        price: 11.0,
        category: "Wrap",
        tags: ["chicken option", "classic", "lettuce", "parmesan"],
        itemEmbedding: newEmbeddings[5], // Vector for Item 26
      },
      {
        itemId: "APP-027",
        name: "Buffalo Chicken Wings",
        description:
          "Spicy buffalo chicken wings, baked crispy and tossed in a tangy hot sauce.",
        price: 14.0,
        category: "Appetizer",
        tags: ["spicy", "chicken", "appetizer", "fried option"],
        itemEmbedding: newEmbeddings[6], // Vector for Item 27
      },
      {
        itemId: "SOU-028",
        name: "Cold Gazpacho Soup",
        description:
          "Cold gazpacho soup, a Spanish blend of raw vegetables, tomato, and olive oil.",
        price: 8.0,
        category: "Soup",
        tags: ["cold", "vegan", "Spanish", "tomato"],
        itemEmbedding: newEmbeddings[7], // Vector for Item 28
      },
      {
        itemId: "DST-029",
        name: "Red Velvet Cupcake",
        description:
          "Decadent red velvet cupcake topped with cream cheese frosting and sprinkles.",
        price: 5.5,
        category: "Dessert",
        tags: ["sweet", "cake", "cream cheese", "classic"],
        itemEmbedding: newEmbeddings[8], // Vector for Item 29
      },
      {
        itemId: "CUR-030",
        name: "Robust Vegetable Curry",
        description:
          "A robust vegetable curry with potatoes, carrots, peas, and a hint of coconut, served with rice.",
        price: 16.5,
        category: "Curry",
        tags: ["vegetarian", "spicy option", "coconut", "Indian"],
        itemEmbedding: newEmbeddings[9], // Vector for Item 30
      },
    ];
    // 3. Insert the fully structured documents into MongoDB Atlas
    await FoodItemModel.insertMany(itemsToInsert);
    console.log("✅ All 10 Food Items seeded successfully with embeddings.");
  } catch (error) {
    console.error("Seeding failed:", error.message);
  }
}

// Call seedFoodItems() when your server starts up, after the Mongoose connection is established.
app.post("/", async (req, res) => {
  seedFoodItems();
});
module.exports = app;
