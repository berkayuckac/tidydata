package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"
)

type MockHTTPClient struct {
	PostFunc func(url string, contentType string, body io.Reader) (*http.Response, error)
}

func NewMLClientWithHTTPClient(baseURL string, httpClient HTTPClient) *MLClient {
	return &MLClient{
		baseURL:    baseURL,
		httpClient: httpClient,
	}
}

func (m *MockHTTPClient) Post(url string, contentType string, body io.Reader) (*http.Response, error) {
	return m.PostFunc(url, contentType, body)
}

func TestNewMLClient(t *testing.T) {
	baseURL := "http://test-ml-service"
	client := NewMLClient(baseURL)

	if client == nil {
		t.Fatal("Expected non-nil client")
	}
	if client.baseURL != baseURL {
		t.Errorf("Expected baseURL %s, got %s", baseURL, client.baseURL)
	}
	if client.httpClient == nil {
		t.Error("Expected non-nil HTTP client")
	}
}

func TestAddDocument(t *testing.T) {
	tests := []struct {
		name        string
		text        string
		mockResp    string
		mockStatus  int
		mockErr     error
		expectedID  string
		expectError bool
	}{
		{
			name:        "successful addition",
			text:        "test document",
			mockResp:    `{"document_id": "doc123", "status": "success"}`,
			mockStatus:  http.StatusOK,
			expectedID:  "doc123",
			expectError: false,
		},
		{
			name:        "server error",
			text:        "test document",
			mockStatus:  http.StatusInternalServerError,
			mockResp:    `{"error": "internal error"}`,
			expectError: true,
		},
		{
			name:        "network error",
			text:        "test document",
			mockErr:     errors.New("network error"),
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockClient := &MockHTTPClient{
				PostFunc: func(url string, contentType string, body io.Reader) (*http.Response, error) {
					if tt.mockErr != nil {
						return nil, tt.mockErr
					}

					if !strings.HasSuffix(url, "/documents") {
						t.Errorf("Expected /documents endpoint, got %s", url)
					}
					if contentType != "application/json" {
						t.Errorf("Expected application/json content type, got %s", contentType)
					}

					var doc Document
					if err := json.NewDecoder(body).Decode(&doc); err != nil {
						t.Errorf("Error decoding request body: %v", err)
					}
					if doc.Text != tt.text {
						t.Errorf("Expected text %q, got %q", tt.text, doc.Text)
					}

					return &http.Response{
						StatusCode: tt.mockStatus,
						Body:       io.NopCloser(bytes.NewBufferString(tt.mockResp)),
					}, nil
				},
			}

			client := NewMLClientWithHTTPClient("http://test", mockClient)
			id, err := client.AddDocument(tt.text)

			if tt.expectError && err == nil {
				t.Error("Expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if id != tt.expectedID {
				t.Errorf("Expected document ID %q, got %q", tt.expectedID, id)
			}
		})
	}
}

func TestSearchDocuments(t *testing.T) {
	tests := []struct {
		name           string
		query          string
		limit          int
		scoreThreshold float64
		mockResp       string
		mockStatus     int
		mockErr        error
		expectError    bool
		expectedCount  int
	}{
		{
			name:           "successful search",
			query:          "test query",
			limit:          5,
			scoreThreshold: 0.5,
			mockStatus:     http.StatusOK,
			mockResp: `{
				"query": "test query",
				"results": [
					{"id": "doc1", "score": 0.8, "text": "result 1"},
					{"id": "doc2", "score": 0.7, "text": "result 2"}
				]
			}`,
			expectedCount: 2,
		},
		{
			name:           "no results",
			query:          "nonexistent",
			limit:          5,
			scoreThreshold: 0.5,
			mockStatus:     http.StatusOK,
			mockResp:       `{"query": "nonexistent", "results": []}`,
			expectedCount:  0,
		},
		{
			name:          "network error",
			query:         "test",
			mockErr:       errors.New("network error"),
			expectError:   true,
			expectedCount: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockClient := &MockHTTPClient{
				PostFunc: func(url string, contentType string, body io.Reader) (*http.Response, error) {
					if tt.mockErr != nil {
						return nil, tt.mockErr
					}

					// Verify request
					if !strings.HasSuffix(url, "/search") {
						t.Errorf("Expected /search endpoint, got %s", url)
					}
					if contentType != "application/json" {
						t.Errorf("Expected application/json content type, got %s", contentType)
					}

					var query SearchQuery
					if err := json.NewDecoder(body).Decode(&query); err != nil {
						t.Errorf("Error decoding request body: %v", err)
					}
					if query.Query != tt.query {
						t.Errorf("Expected query %q, got %q", tt.query, query.Query)
					}
					if query.Limit != tt.limit {
						t.Errorf("Expected limit %d, got %d", tt.limit, query.Limit)
					}
					if query.ScoreThreshold != tt.scoreThreshold {
						t.Errorf("Expected score threshold %f, got %f", tt.scoreThreshold, query.ScoreThreshold)
					}

					return &http.Response{
						StatusCode: tt.mockStatus,
						Body:       io.NopCloser(bytes.NewBufferString(tt.mockResp)),
					}, nil
				},
			}

			client := NewMLClientWithHTTPClient("http://test", mockClient)
			resp, err := client.SearchDocuments(tt.query, tt.limit, tt.scoreThreshold)

			if tt.expectError && err == nil {
				t.Error("Expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if err == nil {
				if len(resp.Results) != tt.expectedCount {
					t.Errorf("Expected %d results, got %d", tt.expectedCount, len(resp.Results))
				}
				if resp.Query != tt.query {
					t.Errorf("Expected query %q in response, got %q", tt.query, resp.Query)
				}
			}
		})
	}
}
