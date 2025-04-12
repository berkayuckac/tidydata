from transformers import CLIPProcessor, CLIPModel
import torch
import numpy as np
from PIL import Image
import logging
import time
import base64
import io
import magic

logger = logging.getLogger(__name__)

class ImageModel:
    def __init__(self, model_name: str = "openai/clip-vit-base-patch32"):
        """Initialize the CLIP model for image processing.
        
        Args:
            model_name: The name of the CLIP model to use
        """
        logger.info(f"Loading CLIP model {model_name}")
        
        self.processor = CLIPProcessor.from_pretrained(model_name)
        self.model = CLIPModel.from_pretrained(model_name)
        
        # Move to GPU if available
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model.to(self.device)
        logger.info(f"Using device: {self.device}")
        
        # Get embedding dimension
        self.embedding_dim = self.model.config.projection_dim
        logger.info(f"Model embedding size: {self.embedding_dim} dimensions")

    def _validate_image(self, image_data: bytes) -> bool:
        """Validate image data format and type.
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            bool: True if valid image, False otherwise
        """
        mime = magic.from_buffer(image_data, mime=True)
        return mime.startswith('image/')

    def _process_image(self, image_data: bytes) -> Image.Image:
        """Process raw image data into PIL Image.
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            PIL.Image: Processed image
        """
        image = Image.open(io.BytesIO(image_data))
        if image.mode not in ['RGB', 'L']:
            image = image.convert('RGB')
        return image

    def get_image_embedding(self, image_data: bytes, benchmark: bool = False) -> np.ndarray:
        """Generate embedding for an image.
        
        Args:
            image_data: Raw image bytes
            benchmark: If True, return timing information
            
        Returns:
            If benchmark=False: numpy.ndarray of embedding
            If benchmark=True: tuple(numpy.ndarray, float) of (embedding, time_taken)
        """
        start_time = time.time() if benchmark else None
        
        if not self._validate_image(image_data):
            raise ValueError("Invalid image format")
        
        image = self._process_image(image_data)
        
        inputs = self.processor(images=image, return_tensors="pt").to(self.device)
        
        with torch.no_grad():
            image_features = self.model.get_image_features(**inputs)
            
        embedding = image_features.cpu().numpy()
        embedding = embedding / np.linalg.norm(embedding, axis=1, keepdims=True)
        
        if benchmark:
            time_taken = time.time() - start_time
            logger.info(f"Generated image embedding in {time_taken:.3f}s")
            return embedding, time_taken
        
        return embedding

    def get_text_embedding(self, text: str, benchmark: bool = False) -> np.ndarray:
        """Generate embedding for text query.
        
        Args:
            text: Text to embed
            benchmark: If True, return timing information
            
        Returns:
            If benchmark=False: numpy.ndarray of embedding
            If benchmark=True: tuple(numpy.ndarray, float) of (embedding, time_taken)
        """
        start_time = time.time() if benchmark else None
        
        inputs = self.processor(text=text, return_tensors="pt", padding=True).to(self.device)
        
        with torch.no_grad():
            text_features = self.model.get_text_features(**inputs)
            
        embedding = text_features.cpu().numpy()
        embedding = embedding / np.linalg.norm(embedding, axis=1, keepdims=True)
        
        if benchmark:
            time_taken = time.time() - start_time
            logger.info(f"Generated text embedding in {time_taken:.3f}s")
            return embedding, time_taken
        
        return embedding

    def encode_image_base64(self, image_data: bytes) -> str:
        """Encode image data as base64 string.
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            str: Base64 encoded image data
        """
        return base64.b64encode(image_data).decode('utf-8')

    def decode_image_base64(self, base64_str: str) -> bytes:
        """Decode base64 string to image data.
        
        Args:
            base64_str: Base64 encoded image data
            
        Returns:
            bytes: Raw image data
        """
        return base64.b64decode(base64_str) 