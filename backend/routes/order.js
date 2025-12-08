const axios = require("axios");

const FoodItemModel = require("../models/FoodItem.js");

const PYTHON_EMBEDDING_SERVER = "http://127.0.0.1:8000/encode";
const MAX_RECOMMENDATIONS = 5;
const VECTOR_INDEX_NAME = "item_index";

const express = require("express");
const app = express.Router();

async function getEmbeddingFromPython(text) {
  try {
    const response = await axios.post(PYTHON_EMBEDDING_SERVER, {
      texts: [text],
    });

    return response.data.embeddings[0];
  } catch (error) {
    console.error(
      "Error fetching embedding from Python server:",
      error.message
    );
    throw new Error("Embedding service failed.");
  }
}





app.post("/recommend", async (req, res) => {
  const { userQuery } = req.body;

  if (!userQuery) {
    return res
      .status(400)
      .send({ message: "Missing userQuery in request body." });
  }

  try {
    const queryVector = await getEmbeddingFromPython(userQuery);
    const recommendations = await FoodItemModel.aggregate([
      {
        $vectorSearch: {
          index: VECTOR_INDEX_NAME,
          path: "itemEmbedding",
          queryVector: queryVector,
          numCandidates: 20, // Number of vectors to scan for better accuracy
          limit: MAX_RECOMMENDATIONS,
        },
      },
      {
        $project: {
          _id: 0,
          itemId: 1,
          name: 1,
          description: 1,
          price: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ]);
    res.json({
      query: userQuery,
      recommendations: recommendations,
    });
  } catch (error) {
    res
      .status(500)
      .send({
        message: "Failed to generate recommendations.",
        error: error.message,
      });
  }
});
module.exports = app;
