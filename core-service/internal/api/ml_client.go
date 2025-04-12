package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
)

type HTTPClient interface {
	Post(url string, contentType string, body io.Reader) (*http.Response, error)
	Get(url string) (*http.Response, error)
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

type ImageMetadata struct {
	Filename    string `json:"filename"`
	ContentType string `json:"content_type"`
	Description string `json:"description,omitempty"`
}

type UnifiedSearchResult struct {
	ID         string         `json:"id"`
	Score      float64        `json:"score"`
	SourceType string         `json:"source_type"`
	Content    UnifiedContent `json:"content"`
}

type UnifiedContent struct {
	Text      string        `json:"text,omitempty"`
	Metadata  ImageMetadata `json:"metadata,omitempty"`
	ImageData string        `json:"image_data,omitempty"`
}

type UnifiedSearchResponse struct {
	Query     string                `json:"query"`
	Results   []UnifiedSearchResult `json:"results"`
	TimeTaken float64               `json:"time_taken"`
}

type AddImageResponse struct {
	ImageID  string        `json:"image_id"`
	Status   string        `json:"status"`
	Metadata ImageMetadata `json:"metadata"`
}

type SimilarImagesResponse struct {
	QueryImage string        `json:"query_image"`
	Results    []ImageResult `json:"results"`
}

type ImageResult struct {
	ID        string        `json:"id"`
	Score     float64       `json:"score"`
	Metadata  ImageMetadata `json:"metadata"`
	ImageData string        `json:"image_data"`
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

func (c *MLClient) Search(query string, limit int, scoreThreshold float64) (*UnifiedSearchResponse, error) {
	baseURL := c.baseURL + "/search"
	u, err := url.Parse(baseURL)
	if err != nil {
		return nil, fmt.Errorf("error parsing URL: %w", err)
	}

	q := u.Query()
	q.Set("query", query)
	q.Set("limit", fmt.Sprintf("%d", limit))
	q.Set("score_threshold", fmt.Sprintf("%f", scoreThreshold))
	u.RawQuery = q.Encode()

	resp, err := c.httpClient.Get(u.String())
	if err != nil {
		return nil, fmt.Errorf("error sending request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var result UnifiedSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decoding response: %w", err)
	}

	return &result, nil
}

func (c *MLClient) AddImage(imageData []byte, filename string) (*AddImageResponse, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	part, err := writer.CreateFormFile("image", filename)
	if err != nil {
		return nil, fmt.Errorf("error creating form file: %w", err)
	}
	if _, err := part.Write(imageData); err != nil {
		return nil, fmt.Errorf("error writing image data: %w", err)
	}

	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("error closing multipart writer: %w", err)
	}

	resp, err := c.httpClient.Post(c.baseURL+"/images", writer.FormDataContentType(), body)
	if err != nil {
		return nil, fmt.Errorf("error sending request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var result AddImageResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decoding response: %w", err)
	}

	return &result, nil
}

func (c *MLClient) FindSimilarImages(imageData []byte, limit int, scoreThreshold float64) (*SimilarImagesResponse, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	part, err := writer.CreateFormFile("image", "query_image")
	if err != nil {
		return nil, fmt.Errorf("error creating form file: %w", err)
	}
	if _, err := part.Write(imageData); err != nil {
		return nil, fmt.Errorf("error writing image data: %w", err)
	}

	_ = writer.WriteField("limit", fmt.Sprintf("%d", limit))
	_ = writer.WriteField("score_threshold", fmt.Sprintf("%f", scoreThreshold))

	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("error closing multipart writer: %w", err)
	}

	resp, err := c.httpClient.Post(c.baseURL+"/images/similar", writer.FormDataContentType(), body)
	if err != nil {
		return nil, fmt.Errorf("error sending request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var result SimilarImagesResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decoding response: %w", err)
	}

	return &result, nil
}
