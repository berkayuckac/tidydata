from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from ..embeddings.model import EmbeddingModel
from ..storage.qdrant_client import QdrantClient
import numpy as np
import uuid
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="TidyData ML Service")

# Initialize services
model = EmbeddingModel()
qdrant = QdrantClient(host="qdrant", port=6333)

class TextInput(BaseModel):
    text: str = Field(..., min_length=1, description="Text to process")
    model_config = ConfigDict(json_schema_extra={
        "example": {"text": "Example text to process"}
    })

class TextsInput(BaseModel):
    texts: List[str] = Field(..., min_items=1, description="List of texts to process")
    model_config = ConfigDict(json_schema_extra={
        "example": {"texts": ["First text", "Second text"]}
    })

class SimilarityInput(BaseModel):
    text1: str = Field(..., min_length=1, description="First text for comparison")
    text2: str = Field(..., min_length=1, description="Second text for comparison")
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "text1": "First text for comparison",
            "text2": "Second text for comparison"
        }
    })

class DocumentInput(BaseModel):
    text: str = Field(..., min_length=1, description="Document text to store")
    model_config = ConfigDict(json_schema_extra={
        "example": {"text": "Document text to be stored and indexed"}
    })

class SearchInput(BaseModel):
    query: str = Field(..., min_length=1, description="Search query text")
    limit: Optional[int] = Field(10, ge=1, le=100, description="Maximum number of results")
    score_threshold: Optional[float] = Field(
        0.5, 
        ge=0.0, 
        le=1.0, 
        description="Minimum similarity score threshold"
    )
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "query": "Search query text",
            "limit": 10,
            "score_threshold": 0.5
        }
    })

@app.post("/embed", response_model=dict)
async def generate_embedding(input_data: TextInput):
    """Generate embeddings for a single text."""
    try:
        embedding = model.get_embeddings(input_data.text)
        return {"embedding": embedding.tolist()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/embed-batch", response_model=dict)
async def generate_embeddings_batch(input_data: TextsInput):
    """Generate embeddings for multiple texts."""
    try:
        embeddings = model.get_embeddings(input_data.texts)
        return {"embeddings": embeddings.tolist()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/similarity", response_model=dict)
async def calculate_similarity(input_data: SimilarityInput):
    """Calculate similarity between two texts."""
    try:
        score = model.similarity_score(input_data.text1, input_data.text2)
        return {"similarity_score": score}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/documents", response_model=dict)
async def add_document(input_data: DocumentInput):
    """Add a document to the vector store."""
    try:
        # Generate embedding
        embedding = model.get_embeddings(input_data.text)
        
        # Generate unique ID
        doc_id = str(uuid.uuid4())
        
        # Store in Qdrant
        success = await qdrant.add_document(
            document_id=doc_id,
            embedding=embedding,
            text=input_data.text
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to store document")
            
        return {
            "document_id": doc_id,
            "status": "stored"
        }
    except Exception as e:
        logger.error(f"Error adding document: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search", response_model=dict)
async def search_documents(input_data: SearchInput):
    """Search for similar documents."""
    try:
        # Generate query embedding
        logger.info(f"Generating embedding for query: {input_data.query}")
        query_embedding = model.get_embeddings(input_data.query)
        logger.info(f"Generated embedding shape: {query_embedding.shape}")
        
        # Search in Qdrant
        logger.info(f"Searching with parameters: limit={input_data.limit}, threshold={input_data.score_threshold}")
        results = await qdrant.search_documents(
            query_embedding=query_embedding,
            limit=input_data.limit,
            score_threshold=input_data.score_threshold
        )
        
        logger.info(f"Found {len(results)} results")
        return {
            "query": input_data.query,
            "results": results
        }
    except Exception as e:
        logger.error(f"Error searching documents: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"} 