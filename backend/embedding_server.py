import os
from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List
from sentence_transformers import SentenceTransformer
import uvicorn
import logging

# --- Configuration ---
MODEL_NAME = "jinaai/jina-embeddings-v2-base-en"
PORT = 8000
HOST = "127.0.0.1"  # Set to local host

logging.basicConfig(level=logging.INFO)

# --- FastAPI and Model Setup ---
app = FastAPI(title="Python Embeddings Server")

# Load the model
try:
    model = SentenceTransformer(MODEL_NAME, trust_remote_code=True)
    logging.info(f"Successfully loaded model: {MODEL_NAME}")
except Exception as e:
    logging.error(f"Error loading model {MODEL_NAME}: {e}")
    model = None

# --- API Data Models ---
class EmbedRequest(BaseModel):
    texts: List[str] = Field(..., example=["menu item name"])
    
class EmbedResponse(BaseModel):
    embeddings: List[List[float]]
    model: str = MODEL_NAME

# --- API Endpoint ---
@app.post("/encode", response_model=EmbedResponse)
def create_embeddings(request: EmbedRequest):
    if model is None:
        return {"error": "Model failed to load."}, 500
    
    embeddings = model.encode(request.texts, normalize_embeddings=True)
    
    return EmbedResponse(embeddings=embeddings.tolist())

# --- Server Startup ---
print(f"Starting server on http://{HOST}:{PORT}")
# The server will run on the specified local address
uvicorn.run(app, host=HOST, port=PORT)