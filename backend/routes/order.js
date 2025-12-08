const app = require("express").Router();
const axios = require("axios");

const PYTHON_EMBEDDING_SERVER = "http://127.0.0.1:8000/encode";

const OrderModel = require("../models/Order");
const OrderEmbeddingModel = require("../models/OrderEmbedding");

async function getEmbeddingFromPython(textArray) {
  try {
    console.log(textArray)
    const response = await axios.post(PYTHON_EMBEDDING_SERVER, {
      texts: textArray,
    });

    return response.data.embeddings;
  } catch (error) {
    console.error(
      "Error fetching embedding from Python server:",
      error.message
    );
    throw new Error("Embedding service failed.");
  }
}

function calculateMeanVector(vectors) {
  if (vectors.length === 0) return new Array(768).fill(0);
  const numVectors = vectors.length;
  const meanVector = new Array(768).fill(0);

  // Sum and Divide logic...
  for (const vector of vectors) {
    for (let i = 0; i < 768; i++) {
      meanVector[i] += vector[i];
    }
  }
  for (let i = 0; i < 768; i++) {
    meanVector[i] /= numVectors;
  }
  return meanVector;
}

async function createOrderMeanEmbedding(orderDoc) {
  if (!orderDoc.items || orderDoc.items.length === 0) {
    console.warn(
      `Order ${orderDoc._id} has no items. Skipping embedding creation.`
    );
    return;
  }

  // A. Extract Textual Descriptions from Order Items
  const itemDescriptions = orderDoc.items.map((item) => item.description); 

  const itemEmbeddings = await getEmbeddingFromPython(itemDescriptions);
  console.log(itemEmbeddings);
  const meanEmbeddingVector = calculateMeanVector(itemEmbeddings);

  const newOrderEmbedding = {
    orderId: orderDoc._id,
    userId: orderDoc.userId || null,
    orderembedding: meanEmbeddingVector,
    embeddingText: itemDescriptions.join("; "), 
  };

  await OrderEmbeddingModel.create(newOrderEmbedding);
  console.log(
    `✅ Mean Embedding saved for Order ${orderDoc._id}. System trained.`
  );
}
app.post("/place", async (req, res) => {
  const { userId, items,description, totalAmount, deliveryAddress } = req.body;

  try {
    const orderData = { userId, items, totalAmount, deliveryAddress,description };
    const newOrder = await OrderModel.create(orderData);

    console.log(`✅ Order ${newOrder._id} saved successfully.`);

    // 2. --- Asynchronous Vector Training Trigger ---
    // Run the training process in the background. It should not block the user response.
    // We use an immediately invoked async function (IIAF) for background processing.
    (async () => {
      await createOrderMeanEmbedding(newOrder);
    })().catch((err) => {
      console.error(
        `❌ Background vector training failed for Order ${newOrder._id}:`,
        err
      );
      // NOTE: The main user request succeeded, but we log the failure.
    });

    // Send successful response immediately to the user
    return res.status(201).json({
      message: "Order placed and training initiated.",
      orderId: newOrder._id,
    });
  } catch (error) {
    console.error("❌ Order placement failed:", error);
    return res.status(500).json({ message: "Failed to place order." });
  }
});
module.exports = app;
