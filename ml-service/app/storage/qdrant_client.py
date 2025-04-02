from typing import List, Dict, Any, Optional
import httpx
import numpy as np
import logging
import json
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class QdrantClient:
    def __init__(self, host: str = "qdrant", port: int = 6333):
        """Initialize Qdrant client.
        
        Args:
            host: Qdrant host
            port: Qdrant port
        """
        self.base_url = f"http://{host}:{port}"
        self.collection_name = "documents"
        
    async def add_document(self, 
                          document_id: str,
                          embedding: np.ndarray,
                          text: str) -> bool:
        """Add a document to the vector store.
        
        Args:
            document_id: Unique identifier for the document
            embedding: Document embedding vector
            text: Document text
            
        Returns:
            bool: Success status
        """
        try:
            # Log vector details
            logger.info(f"Vector details:")
            logger.info(f"Shape: {embedding.shape}")
            logger.info(f"Type: {embedding.dtype}")
            logger.info(f"Sample (first 5): {embedding[:5]}")
            logger.info(f"Min: {np.min(embedding)}, Max: {np.max(embedding)}")
            logger.info(f"Norm: {np.linalg.norm(embedding)}")

            # Convert numpy array to list and ensure it's flat
            vector = embedding.flatten().tolist()

            # Prepare request data
            point_data = {
                "points": [
                    {
                        "id": document_id,
                        "vector": vector,
                        "payload": {
                            "text": text
                        }
                    }
                ]
            }

            # Log request details
            url = f"{self.base_url}/collections/{self.collection_name}/points"
            logger.info(f"Making request to: {url}")
            logger.info(f"Request body: {point_data}")

            # Make request
            async with httpx.AsyncClient() as client:
                response = await client.put(
                    url,
                    json=point_data
                )

            # Log response details
            logger.info(f"Response status: {response.status_code}")
            logger.info(f"Response body: {response.text}")

            return response.status_code == 200
        except Exception as e:
            logger.error(f"Error adding document: {str(e)}", exc_info=True)
            return False
            
    async def search_documents(self,
                             query_embedding: np.ndarray,
                             limit: int = 10,
                             score_threshold: float = 0.7) -> List[Dict[str, Any]]:
        """Search for similar documents.
        
        Args:
            query_embedding: Query vector
            limit: Maximum number of results
            score_threshold: Minimum similarity score
            
        Returns:
            List of documents with scores
        """
        try:
            # Convert numpy array to list and ensure it's flat
            vector = query_embedding.flatten().tolist()

            # Prepare request data
            search_data = {
                "vector": vector,
                "limit": limit,
                "params": {
                    "hnsw_ef": 128,
                    "exact": False
                },
                "score_threshold": score_threshold,
                "with_payload": True,
                "with_vector": False
            }

            # Log request details
            url = f"{self.base_url}/collections/{self.collection_name}/points/search"
            logger.info(f"Making search request to: {url}")
            logger.info(f"Search request body: {search_data}")

            # Make request
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=search_data
                )

            # Log response details
            logger.info(f"Search response status: {response.status_code}")
            logger.info(f"Search response body: {response.text}")

            if response.status_code != 200:
                return []

            results = response.json()
            return [
                {
                    "id": hit["id"],
                    "score": hit["score"],
                    "text": hit["payload"]["text"]
                }
                for hit in results["result"]
            ]
        except Exception as e:
            logger.error(f"Error searching documents: {str(e)}", exc_info=True)
            return [] 