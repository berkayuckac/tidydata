from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List, Union
import torch
import logging
import time

logger = logging.getLogger(__name__)

class EmbeddingModel:
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        """Initialize the embedding model.
        
        Args:
            model_name: The name of the model to use
                Default: all-MiniLM-L6-v2 (384 dimensions)
        """
        logger.info(f"Loading model {model_name}")
        
        # Load model directly
        self.model = SentenceTransformer(model_name)
        
        # Move to GPU if available
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model.to(self.device)
        logger.info(f"Using device: {self.device}")
        
        # Log model info
        embedding_size = self.model.get_sentence_embedding_dimension()
        logger.info(f"Model embedding size: {embedding_size} dimensions")

    def get_embeddings(self, texts: Union[str, List[str]], benchmark: bool = False) -> Union[np.ndarray, tuple]:
        """Generate embeddings for the input text(s).
        
        Args:
            texts: Single text string or list of text strings
            benchmark: If True, return timing information
            
        Returns:
            If benchmark=False: numpy.ndarray of embeddings
            If benchmark=True: tuple(numpy.ndarray, float) of (embeddings, time_taken)
        """
        if isinstance(texts, str):
            texts = [texts]
        
        start_time = time.time() if benchmark else None
            
        # Generate embeddings
        embeddings = self.model.encode(
            texts,
            normalize_embeddings=True,  # Normalize
            show_progress_bar=False
        )
        
        if benchmark:
            time_taken = time.time() - start_time
            logger.info(f"Generated {len(texts)} embeddings in {time_taken:.3f}s")
            return embeddings, time_taken
        
        return embeddings

    def similarity_score(self, text1: str, text2: str, benchmark: bool = False) -> Union[float, tuple]:
        """Calculate similarity score between two texts.
        
        Args:
            text1: First text
            text2: Second text
            benchmark: If True, return timing information
            
        Returns:
            If benchmark=False: float similarity score
            If benchmark=True: tuple(float, float) of (similarity_score, time_taken)
        """
        start_time = time.time() if benchmark else None
        
        # Since we normalize, we can just use dot product
        emb1 = self.get_embeddings(text1)
        emb2 = self.get_embeddings(text2)
        
        similarity = float(np.dot(emb1, emb2.T))
        
        if benchmark:
            time_taken = time.time() - start_time
            logger.info(f"Calculated similarity in {time_taken:.3f}s")
            return similarity, time_taken
        
        return similarity 