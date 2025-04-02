import numpy as np
from app.embeddings.model import EmbeddingModel

class TestEmbeddingModel:
    def __init__(self):
        self.model = EmbeddingModel()

    def test_single_text_embedding(self):
        """Test that single text embedding returns correct shape and type"""
        text = "This is a test sentence."
        embedding, _ = self.model.get_embeddings(text, benchmark=True)
        
        # Test embedding properties
        assert isinstance(embedding, np.ndarray), "Embedding should be a numpy array"
        assert embedding.shape == (1, 384), "Embedding should have shape (1, 384)"
        assert not np.any(np.isnan(embedding)), "Embedding should not contain NaN values"
        # Check if embeddings are normalized (L2 norm ≈ 1)
        assert np.abs(np.linalg.norm(embedding[0]) - 1.0) < 1e-6, "Embeddings should be normalized"

    def test_similarity_score(self):
        """Test similarity scores are within expected range and logically consistent"""
        text1 = "I love programming in Python"
        text2 = "Python is my favorite programming language"
        text3 = "I prefer to eat bananas"
        
        # Test similar texts
        similarity1, _ = self.model.similarity_score(text1, text2, benchmark=True)
        assert 0 <= similarity1 <= 1, "Similarity score should be between 0 and 1"
        assert similarity1 > 0.5, "Similar texts should have high similarity score"
        
        # Test dissimilar texts
        similarity2, _ = self.model.similarity_score(text1, text3, benchmark=True)
        assert 0 <= similarity2 <= 1, "Similarity score should be between 0 and 1"
        assert similarity2 < similarity1, "Unrelated texts should have lower similarity score"

    def test_empty_input(self):
        """Test model behavior with empty input"""
        # Empty input is actually valid for the model
        embedding, _ = self.model.get_embeddings("", benchmark=True)
        assert embedding.shape == (1, 384), "Empty input should still return valid embedding"

    def test_identical_text_similarity(self):
        """Test that identical texts have maximum similarity"""
        text = "This is a test sentence"
        similarity, _ = self.model.similarity_score(text, text, benchmark=True)
        assert np.isclose(similarity, 1.0, rtol=1e-5), "Identical texts should have similarity score of 1"

    def test_performance_benchmark(self):
        """Test that benchmarking returns reasonable timing values"""
        text = "This is a performance test"
        _, time_taken = self.model.get_embeddings(text, benchmark=True)
        assert time_taken > 0, "Processing time should be positive"
        assert time_taken < 10, "Processing time should be reasonable (< 10 seconds)"

    def test_long_text(self):
        """Test model can handle longer texts"""
        long_text = " ".join(["test"] * 100)  # Create a long text
        embedding, _ = self.model.get_embeddings(long_text, benchmark=True)
        assert embedding.shape == (1, 384), "Long text should produce standard embedding shape"

def run_tests():
    """Run all tests and report results"""
    test_instance = TestEmbeddingModel()
    test_methods = [method for method in dir(test_instance) if method.startswith('test_')]
    passed = 0
    failed = 0
    
    print("\nRunning ML Service Tests...")
    print("-" * 50)
    
    for method in test_methods:
        try:
            print(f"Running {method}...", end=" ")
            getattr(test_instance, method)()
            print("✓ PASSED")
            passed += 1
        except AssertionError as e:
            print(f"✗ FAILED: {str(e)}")
            failed += 1
        except Exception as e:
            print(f"✗ ERROR: {str(e)}")
            failed += 1
    
    print("-" * 50)
    print(f"Results: {passed} passed, {failed} failed")
    return failed == 0

if __name__ == "__main__":
    success = run_tests()
    exit(0 if success else 1) 