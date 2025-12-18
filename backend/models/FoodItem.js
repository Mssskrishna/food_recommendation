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
      ], // Example categories (!create category model)
      required: true,
    },

    tags: [
      {
        type: String,
      },
    ],
    itemEmbedding: {
      type: [Number], 
      validate: {
        validator: function (v) {
          return v && v.length === 768;
        },
        message:
          "Embedding must be an array of exactly 768 dimensions for HNSW.",
      },
      required: false, 
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("FoodItem", FoodItemSchema);
