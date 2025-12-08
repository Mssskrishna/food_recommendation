// order.routes.js or recommendation.routes.js

const app = require("express").Router();
const mongoose = require("mongoose");
const axios = require("axios");

const FoodItemModel = require("../models/FoodItem");
const OrderEmbeddingModel = require("../models/OrderEmbedding");

// --- Configuration (Adapt as needed) ---
const MAX_RELEVANCE_CANDIDATES = 10;
const MAX_CONTEXT_CANDIDATES = 20;
const MAX_FINAL_RECOMMENDATIONS = 10;
const VECTOR_INDEX_FOOD = "item_index";
const VECTOR_INDEX_ORDER = "order_index";
const PYTHON_EMBEDDING_SERVER = "http://127.0.0.1:8000/encode"; // Replace with actual path

// Assume getEmbeddingFromPython and calculateMeanVector are defined here or imported

// --- Utility: Get Embedding (Modified to return single vector for simplicity) ---
async function getEmbeddingFromPython(text) {
  try {
    const response = await axios.post(PYTHON_EMBEDDING_SERVER, {
      texts: [text],
    });
    return response.data.embeddings[0]; // Returns a single 768-dim vector
  } catch (error) {
    console.error(
      "Error fetching embedding from Python server:",
      error.message
    );
    throw new Error("Embedding service failed.");
  }
}

// 🚀 MAIN RECOMMENDATION ENDPOINT 🚀
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
    // 1. Generate the Query Vector (Context of the item just added)
    const queryVector = await getEmbeddingFromPython(currentItemDescription);
    console.log(`✅ Generated query vector for: ${currentItemDescription}`);

    // 2. Perform Dual Vector Search

    // --- SEARCH A: Relevance (Direct Item Match) ---
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

    // --- SEARCH B: Context (Historical Combo Match) ---
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

    // Execute both searches in parallel for speed
    const [relevanceResults, contextResults] = await Promise.all([
      relevanceSearch,
      contextSearch,
    ]);

    // 3. Process and Merge Results
    const finalRecommendations = processAndMergeRecommendations(
      relevanceResults,
      contextResults,
      itemsInCart,
      currentItemId
    );

    // 4. Return Final List
    res.json({
      query: currentItemDescription,
      recommendationType: "Hybrid Combo Match",
      recommendations: finalRecommendations.slice(0, MAX_FINAL_RECOMMENDATIONS),
    });
  } catch (error) {
    console.error("❌ Recommendation failure:", error);
    res
      .status(500)
      .send({
        message: "Failed to generate recommendations.",
        error: error.message,
      });
  }
});

module.exports = app;

// --- Helper Function: Merging Logic ---

/**
 * Combines relevance and context search results, applies filtering, and ranks items.
 */
function processAndMergeRecommendations(
  relevanceResults,
  contextResults,
  itemsInCart,
  currentItemId
) {
  const itemScores = new Map(); // Map to store final weighted score: itemId -> {score, name, price}

  // A. Initialize Scores from Relevance Search (Baseline)
  relevanceResults.forEach((item) => {
    if (item.itemId !== currentItemId && !itemsInCart.includes(item.itemId)) {
      // Use score as baseline, scaled up slightly
      itemScores.set(item.itemId, {
        score: item.score * 1000,
        name: item.name,
        price: item.price,
        source: "Relevance",
      });
    }
  });

  // B. Boost Scores based on Context Search (Combo History)
  contextResults.forEach((combo) => {
    // Boost factor based on how relevant the combo order was
    const comboBoost = combo.contextScore * 1000;

    combo.comboItems.forEach((item) => {
      const id = item.itemId;

      // Only consider items that are not currently in the cart
      if (id !== currentItemId && !itemsInCart.includes(id)) {
        if (itemScores.has(id)) {
          // Item found in both relevance and history: BOOST the score
          const current = itemScores.get(id);
          current.score += comboBoost;
          current.source = "Hybrid";
        } else {
          // Item found ONLY in history: Give it a high score
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

  // C. Convert Map to Array and Rank
  const rankedRecommendations = Array.from(itemScores.values()).sort(
    (a, b) => b.score - a.score
  );

  return rankedRecommendations;
}

module.exports = app;
