package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type HTTPClient interface {
	Post(url string, contentType string, body io.Reader) (*http.Response, error)
}

type MLClient struct {
	baseURL    string
	httpClient HTTPClient
}

func NewMLClient(baseURL string) *MLClient {
	return &MLClient{
		baseURL:    baseURL,
		httpClient: &http.Client{},
	}
}

type Document struct {
	Text string `json:"text"`
}

type SearchQuery struct {
	Query          string  `json:"query"`
	Limit          int     `json:"limit"`
	ScoreThreshold float64 `json:"score_threshold"`
}

type SearchResult struct {
	ID    string  `json:"id"`
	Score float64 `json:"score"`
	Text  string  `json:"text"`
}

type SearchResponse struct {
	Query   string         `json:"query"`
	Results []SearchResult `json:"results"`
}

func (c *MLClient) AddDocument(text string) (string, error) {
	doc := Document{Text: text}
	jsonData, err := json.Marshal(doc)
	if err != nil {
		return "", fmt.Errorf("error marshaling document: %w", err)
	}

	resp, err := c.httpClient.Post(c.baseURL+"/documents", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("error sending request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var result struct {
		DocumentID string `json:"document_id"`
		Status     string `json:"status"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("error decoding response: %w", err)
	}

	return result.DocumentID, nil
}

func (c *MLClient) SearchDocuments(query string, limit int, scoreThreshold float64) (*SearchResponse, error) {
	searchQuery := SearchQuery{
		Query:          query,
		Limit:          limit,
		ScoreThreshold: scoreThreshold,
	}
	jsonData, err := json.Marshal(searchQuery)
	if err != nil {
		return nil, fmt.Errorf("error marshaling search query: %w", err)
	}

	resp, err := c.httpClient.Post(c.baseURL+"/search", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("error sending request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var searchResp SearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&searchResp); err != nil {
		return nil, fmt.Errorf("error decoding response: %w", err)
	}

	return &searchResp, nil
}
