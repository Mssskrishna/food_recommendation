const axios = require("axios");
const PYTHON_EMBEDDING_SERVER = "http://127.0.0.1:8000/encode";

async function getEmbeddingFromPython(textArray) {
  try {
    console.log(textArray)
    const response = await axios.post(PYTHON_EMBEDDING_SERVER, {
      texts: [textArray],
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
module.exports = getEmbeddingFromPython;
