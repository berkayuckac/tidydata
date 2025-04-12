from typing import List, Dict, Any, Optional
import httpx
import numpy as np
import logging
import json
from pydantic import BaseModel
import asyncio

logger = logging.getLogger(__name__)

class QdrantClient:
    def __init__(self, host: str = "qdrant", port: int = 6333):
        """Initialize Qdrant client.
        
        Args:
            host: Qdrant host
            port: Qdrant port
        """
        self.base_url = f"http://{host}:{port}"
        self.collections = {
            "documents": {"dim": 384},  # text embeddings
            "images": {"dim": 512}      # CLIP embeddings
        }
        
        # Initialize collections asynchronously
        self._collections_initialized = False
        
    async def ensure_collections(self):
        """Ensure collections are initialized."""
        if not self._collections_initialized:
            await self._init_collections()
            self._collections_initialized = True

    async def _init_collections(self):
        """Initialize collections if they don't exist."""
        for name, config in self.collections.items():
            try:
                async with httpx.AsyncClient() as client:
                    # Check if collection exists
                    response = await client.get(f"{self.base_url}/collections/{name}")
                    
                    if response.status_code == 404:
                        # Create collection
                        create_data = {
                            "name": name,
                            "vectors": {
                                "size": config["dim"],
                                "distance": "Cosine"
                            }
                        }
                        
                        response = await client.put(
                            f"{self.base_url}/collections/{name}",
                            json=create_data
                        )
                        
                        if response.status_code == 200:
                            logger.info(f"Created collection: {name}")
                        else:
                            logger.error(f"Failed to create collection {name}: {response.text}")
                    
            except Exception as e:
                logger.error(f"Error initializing collection {name}: {str(e)}")
    
    async def add_document(self,
                          document_id: str,
                          embedding: np.ndarray,
                          text: str = None,
                          collection_name: str = "documents",
                          payload: Dict[str, Any] = None) -> bool:
        """Add a document to the vector store.
        
        Args:
            document_id: Unique identifier for the document
            embedding: Document embedding vector
            text: Document text (for text documents)
            collection_name: Name of the collection to add to
            payload: Additional payload data
            
        Returns:
            bool: Success status
        """
        await self.ensure_collections()
        try:
            logger.info(f"Vector details for {collection_name}:")
            logger.info(f"Shape: {embedding.shape}")
            logger.info(f"Type: {embedding.dtype}")
            logger.info(f"Sample (first 5): {embedding[:5]}")
            logger.info(f"Min: {np.min(embedding)}, Max: {np.max(embedding)}")
            logger.info(f"Norm: {np.linalg.norm(embedding)}")

            # Convert numpy array to list and ensure it's flat
            vector = embedding.flatten().tolist()

            # Prepare payload
            if payload is None:
                payload = {}
            
            if text is not None:
                payload["text"] = text

            # Prepare request data
            point_data = {
                "points": [
                    {
                        "id": document_id,
                        "vector": vector,
                        "payload": payload
                    }
                ]
            }

            url = f"{self.base_url}/collections/{collection_name}/points"
            logger.info(f"Making request to: {url}")
            logger.info(f"Request body size: {len(str(point_data))} bytes")

            async with httpx.AsyncClient() as client:
                response = await client.put(
                    url,
                    json=point_data
                )

            logger.info(f"Response status: {response.status_code}")
            logger.info(f"Response body: {response.text}")

            return response.status_code == 200
        except Exception as e:
            logger.error(f"Error adding document to {collection_name}: {str(e)}", exc_info=True)
            return False
            
    async def search_documents(self,
                             query_embedding: np.ndarray,
                             collection_name: str = "documents",
                             limit: int = 10,
                             score_threshold: float = 0.7) -> List[Dict[str, Any]]:
        """Search for similar documents.
        
        Args:
            query_embedding: Query vector
            collection_name: Name of the collection to search
            limit: Maximum number of results
            score_threshold: Minimum similarity score
            
        Returns:
            List of documents with scores
        """
        await self.ensure_collections()
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

            url = f"{self.base_url}/collections/{collection_name}/points/search"
            logger.info(f"Making search request to: {url}")
            logger.info(f"Search request body: {search_data}")

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=search_data
                )

            logger.info(f"Search response status: {response.status_code}")
            logger.info(f"Search response body: {response.text}")

            if response.status_code != 200:
                return []

            results = response.json()
            return results["result"]
        except Exception as e:
            logger.error(f"Error searching documents in {collection_name}: {str(e)}", exc_info=True)
            return []

    async def search_multiple_collections(self,
                                       embeddings: Dict[str, np.ndarray],
                                       limit: int = 10,
                                       score_threshold: float = 0.7) -> List[Dict[str, Any]]:
        """Search across multiple collections with different embeddings.
        
        Args:
            embeddings: Dict mapping collection names to their query vectors
            limit: Maximum number of results per collection
            score_threshold: Minimum similarity score
            
        Returns:
            Combined and sorted list of results from all collections
        """
        await self.ensure_collections()
        try:
            # Search each collection in parallel
            tasks = []
            for collection_name, embedding in embeddings.items():
                task = self.search_documents(
                    query_embedding=embedding,
                    collection_name=collection_name,
                    limit=limit,
                    score_threshold=score_threshold
                )
                tasks.append(task)
            
            # Wait for all searches to complete
            results = await asyncio.gather(*tasks)
            
            # Combine and process results
            combined_results = []
            for collection_name, collection_results in zip(embeddings.keys(), results):
                for result in collection_results:
                    # Add source collection to each result
                    result["source_type"] = "text" if collection_name == "documents" else "image"
                    combined_results.append(result)
            
            # Sort by score in descending order
            combined_results.sort(key=lambda x: x["score"], reverse=True)
            
            # Limit total results if needed
            if len(combined_results) > limit * 2:  # Allow more results for mixed content
                combined_results = combined_results[:limit * 2]
            
            return combined_results
        except Exception as e:
            logger.error(f"Error searching multiple collections: {str(e)}", exc_info=True)
            return [] 