const app = require("express").Router();
const mongoose = require("mongoose");
const axios = require("axios");

const FoodItemModel = require("../models/FoodItem");
const OrderEmbeddingModel = require("../models/OrderEmbedding");

const MAX_RELEVANCE_CANDIDATES = 10;
const MAX_CONTEXT_CANDIDATES = 20;
const MAX_FINAL_RECOMMENDATIONS = 10;
const VECTOR_INDEX_FOOD = "item_index";
const VECTOR_INDEX_ORDER = "order_index";
const PYTHON_EMBEDDING_SERVER = "http://127.0.0.1:8000/encode"; 

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

// RECOMMENDATION ENDPOINT 
app.post("/recommend", async (req, res) => {
  const { userId, currentItemId, currentItemDescription, itemsInCart } =
    req.body;

  if (!currentItemDescription) {
    return res
      .status(400)
      .send({ message: "Missing item description for query." });
  }

  // itemsInCart should be an array of item IDs already in the cart: ['DRK-009', 'BRG-003']

  try {
    const queryVector = await getEmbeddingFromPython(currentItemDescription);
    console.log(` Generated query vector for: ${currentItemDescription}`);
    // Finds items semantically closest to the item just added.
    const relevanceSearch = FoodItemModel.aggregate([
      {
        $vectorSearch: {
          index: VECTOR_INDEX_FOOD,
          path: "itemEmbedding",
          queryVector: queryVector,
          numCandidates: 50,
          limit: MAX_RELEVANCE_CANDIDATES,
        },
      },
      {
        $project: {
          _id: 0,
          itemId: 1,
          name: 1,
          price: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ]);

    // Finds historical orders semantically closest to the item just added, then unpacks the items.
    const contextSearch = OrderEmbeddingModel.aggregate([
      {
        $vectorSearch: {
          index: VECTOR_INDEX_ORDER,
          path: "orderembedding",
          queryVector: queryVector,
          numCandidates: 50,
          limit: MAX_CONTEXT_CANDIDATES,
        },
      },
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "_id",
          as: "pastOrderDetails",
        },
      },
      { $unwind: "$pastOrderDetails" },
      {
        $project: {
          comboItems: "$pastOrderDetails.items",
          contextScore: { $meta: "vectorSearchScore" },
        },
      },
    ]);

    const [relevanceResults, contextResults] = await Promise.all([
      relevanceSearch,
      contextSearch,
    ]);

    const finalRecommendations = processAndMergeRecommendations(
      relevanceResults,
      contextResults,
      itemsInCart,
      currentItemId
    );

    res.json({
      query: currentItemDescription,
      recommendationType: "Hybrid Combo Match",
      recommendations: finalRecommendations.slice(0, MAX_FINAL_RECOMMENDATIONS),
    });
  } catch (error) {
    console.error("Recommendation failure:", error);
    res
      .status(500)
      .send({
        message: "Failed to generate recommendations.",
        error: error.message,
      });
  }
});

module.exports = app;


/**
 * Combines relevance and context search results, applies filtering, and ranks items.
 */
function processAndMergeRecommendations(
  relevanceResults,
  contextResults,
  itemsInCart,
  currentItemId
) {
  const itemScores = new Map(); 
  relevanceResults.forEach((item) => {
    if (item.itemId !== currentItemId && !itemsInCart.includes(item.itemId)) {
      itemScores.set(item.itemId, {
        score: item.score * 1000,
        name: item.name,
        price: item.price,
        source: "Relevance",
      });
    }
  });

  contextResults.forEach((combo) => {
    const comboBoost = combo.contextScore * 1000;

    combo.comboItems.forEach((item) => {
      const id = item.itemId;

      if (id !== currentItemId && !itemsInCart.includes(id)) {
        if (itemScores.has(id)) {
          const current = itemScores.get(id);
          current.score += comboBoost;
          current.source = "Hybrid";
        } else {
          itemScores.set(id, {
            score: comboBoost,
            name: item.name,
            price: item.price,
            source: "Context Only",
          });
        }
      }
    });
  });

  const rankedRecommendations = Array.from(itemScores.values()).sort(
    (a, b) => b.score - a.score
  );

  return rankedRecommendations;
}

module.exports = app;
