// foodItem.model.js
const mongoose = require("mongoose");

const FoodItemSchema = new mongoose.Schema(
  {
    itemId: {
      type: String,
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },

    category: {
      type: String,
      enum: [
        "Burger",
        "Pizza",
        "Salad",
        "Drink",
        "Dessert",
        "Pasta",
        "Seafood",
        "Sandwich",
        "Appetizer",
        "Soup",
        "Curry",
        "Wrap",
        "Breakfast",
      ], // Example categories
      required: true,
    },

    // Metadata for search/ranking
    tags: [
      {
        type: String,
      },
    ],

    // Optional: Embedding for the item's name/description (for item-to-item recommendation)
    // foodEmbedding: {
    //     type: [Number], // Array of 768 floating point numbers
    //     required: false // Only required if item-based recs are done instantly
    // }
    itemEmbedding: {
      type: [Number], // Stored as an array of floating-point numbers
      validate: {
        validator: function (v) {
          // Validator ensures the array is not null/empty and has the correct dimension
          return v && v.length === 768;
        },
        message:
          "Embedding must be an array of exactly 768 dimensions for HNSW.",
      },
      required: false, // Set to true if every item must have an embedding
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

module.exports = mongoose.model("FoodItem", FoodItemSchema);
