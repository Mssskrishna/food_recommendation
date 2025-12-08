// order.model.js
const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    // Link to the user who placed the order (if authentication is implemented)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },

    // Items included in the order
    items: [
      {
        itemId: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        priceAtPurchase: {
          type: Number,
          required: true,
        },
      },
    ],

    totalAmount: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Processing", "Delivered", "Cancelled"],
      default: "Pending",
    },

    deliveryAddress: {
      street: String,
      city: String,
      zip: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Order", OrderSchema);
