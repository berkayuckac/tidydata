from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any, Union
from ..embeddings.model import EmbeddingModel
from ..embeddings.image_model import ImageModel
from ..storage.qdrant_client import QdrantClient
import numpy as np
import uuid
import logging
import io
import asyncio
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="TidyData ML Service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change this to your allowed origins
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize variables
text_model = None
image_model = None
qdrant = None
is_ready = False

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    global qdrant
    
    # Initialize Qdrant first
    qdrant = QdrantClient(host="qdrant", port=6333)
    await qdrant.ensure_collections()
    
    # Start model initialization in the background
    asyncio.create_task(initialize_models())

async def initialize_models():
    """Initialize models in the background."""
    global text_model, image_model, is_ready
    
    # Initialize models
    text_model = EmbeddingModel()
    image_model = ImageModel()
    
    is_ready = True

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

class ImageInput(BaseModel):
    image_data: str = Field(..., description="Base64 encoded image data")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Optional image metadata")
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "image_data": "base64_encoded_image_data",
            "metadata": {"filename": "example.jpg", "description": "An example image"}
        }
    })

class UnifiedSearchResult(BaseModel):
    id: str
    score: float
    source_type: str  # "text" or "image"
    content: Dict[str, Any]  # Contains either text content or image metadata/data

class UnifiedSearchResponse(BaseModel):
    query: str
    results: List[UnifiedSearchResult]
    time_taken: float = Field(..., description="Time taken for the search operation in seconds")
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "query": "example query",
            "results": [],
            "time_taken": 0.123456
        }
    })

@app.post("/embed", response_model=dict)
async def generate_embedding(input_data: TextInput):
    """Generate embeddings for a single text."""
    try:
        embedding = text_model.get_embeddings(input_data.text)
        return {"embedding": embedding.tolist()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/embed-batch", response_model=dict)
async def generate_embeddings_batch(input_data: TextsInput):
    """Generate embeddings for multiple texts."""
    try:
        embeddings = text_model.get_embeddings(input_data.texts)
        return {"embeddings": embeddings.tolist()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/similarity", response_model=dict)
async def calculate_similarity(input_data: SimilarityInput):
    """Calculate similarity between two texts."""
    try:
        score = text_model.similarity_score(input_data.text1, input_data.text2)
        return {"similarity_score": score}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/documents", response_model=dict)
async def add_document(input_data: DocumentInput):
    """Add a document to the vector store."""
    try:
        embedding = text_model.get_embeddings(input_data.text)
        
        doc_id = str(uuid.uuid4())
        
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

@app.get("/search", response_model=UnifiedSearchResponse)
async def unified_search(query: str, limit: int = 10, score_threshold: float = 0.5):
    """Search across both text and images using a single query."""
    try:
        start_time = time.perf_counter()
        
        text_embedding = text_model.get_embeddings(query)
        image_embedding = image_model.get_text_embedding(query)
        
        results = await qdrant.search_multiple_collections(
            embeddings={
                "documents": text_embedding,
                "images": image_embedding
            },
            limit=limit,
            score_threshold=score_threshold
        )
        
        time_taken = time.perf_counter() - start_time
        
        processed_results = []
        for result in results:
            processed_result = {
                "id": result["id"],
                "score": result["score"],
                "source_type": result["source_type"]
            }
            
            if result["source_type"] == "text":
                processed_result["content"] = {
                    "text": result["payload"]["text"]
                }
            else:  # image
                processed_result["content"] = {
                    "metadata": result["payload"]["metadata"],
                    "image_data": result["payload"]["image_data"]
                }
            
            processed_results.append(processed_result)
        
        return {
            "query": query,
            "results": processed_results,
            "time_taken": time_taken
        }
    except Exception as e:
        logger.error(f"Error in unified search: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "ready": is_ready,
        "services": {
            "text_model": text_model is not None,
            "image_model": image_model is not None,
            "qdrant": qdrant is not None
        }
    }

@app.post("/images", response_model=dict)
async def add_image(image: UploadFile = File(...), description: Optional[str] = None):
    """Add an image to the vector store."""
    try:
        image_data = await image.read()
        
        embedding = image_model.get_image_embedding(image_data)
        
        doc_id = str(uuid.uuid4())
        
        metadata = {
            "filename": image.filename,
            "content_type": image.content_type,
            "description": description
        }
        
        image_base64 = image_model.encode_image_base64(image_data)
        
        success = await qdrant.add_document(
            collection_name="images",
            document_id=doc_id,
            embedding=embedding,
            payload={
                "image_data": image_base64,
                "metadata": metadata
            }
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to store image")
            
        return {
            "image_id": doc_id,
            "status": "stored",
            "metadata": metadata
        }
    except Exception as e:
        logger.error(f"Error adding image: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/images/similar", response_model=dict)
async def find_similar_images(image: UploadFile = File(...), limit: int = 10, score_threshold: float = 0.5):
    """Find similar images to the uploaded image."""
    try:
        image_data = await image.read()
        
        query_embedding = image_model.get_image_embedding(image_data)
        
        results = await qdrant.search_documents(
            collection_name="images",
            query_embedding=query_embedding,
            limit=limit,
            score_threshold=score_threshold
        )
        
        processed_results = []
        for result in results:
            processed_results.append({
                "id": result["id"],
                "score": result["score"],
                "metadata": result["payload"]["metadata"],
                "image_data": result["payload"]["image_data"]
            })
        
        return {
            "query_image": image.filename,
            "results": processed_results
        }
    except Exception as e:
        logger.error(f"Error finding similar images: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) 