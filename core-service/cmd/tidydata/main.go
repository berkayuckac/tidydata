package main

import (
	"fmt"
	"io/ioutil"
	"mime"
	"os"
	"path/filepath"
	"strings"

	"github.com/berkayuckac/tidydata/internal/api"
	"github.com/spf13/cobra"
)

var (
	mlClient  *api.MLClient
	fileFlag  string
	version   = "v0.1.0"
	threshold float64
)

const defaultMLServiceURL = "http://localhost:8000" // TODO: Make this configurable

func init() {
	mlClient = api.NewMLClient(defaultMLServiceURL)
	rootCmd.AddCommand(addCmd)
	rootCmd.AddCommand(searchCmd)
	rootCmd.AddCommand(imageCmd)
	addCmd.Flags().StringVarP(&fileFlag, "file", "f", "", "Path to file containing text to add")
	searchCmd.Flags().Float64VarP(&threshold, "threshold", "t", 0.1, "Minimum similarity score threshold (0.0 to 1.0)")
	rootCmd.Version = version
}

var rootCmd = &cobra.Command{
	Use:     "tidydata",
	Short:   "TidyData - A personal knowledge management system",
	Version: version,
	Long: `TidyData is a personal knowledge management system that enables semantic search
across your text content and images. It uses language and vision models to understand
the meaning of your content and find relevant information quickly.`,
}

var addCmd = &cobra.Command{
	Use:   "add [text]",
	Short: "Add text content to your knowledge base",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		var text string
		if fileFlag != "" {
			content, err := os.ReadFile(fileFlag)
			if err != nil {
				return fmt.Errorf("error reading file: %w", err)
			}
			text = string(content)
		} else if len(args) > 0 {
			text = args[0]
		} else {
			return fmt.Errorf("either provide text as an argument or use --file flag")
		}

		docID, err := mlClient.AddDocument(text)
		if err != nil {
			return fmt.Errorf("error adding document: %w", err)
		}

		fmt.Printf("Successfully added document with ID: %s\n", docID)
		return nil
	},
}

var searchCmd = &cobra.Command{
	Use:   "search [query]",
	Short: "Search your knowledge base",
	Long: `Search across your text and image content using natural language queries.
Results will include both relevant text and images, ranked by relevance.`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		query := args[0]
		resp, err := mlClient.Search(query, 10, threshold)
		if err != nil {
			return fmt.Errorf("error searching: %w", err)
		}

		fmt.Printf("Search results for: %s (threshold: %.2f)\n\n", query, threshold)
		for _, result := range resp.Results {
			fmt.Printf("Score: %.2f\n", result.Score)
			if result.SourceType == "text" {
				fmt.Printf("Type: Text\n")
				fmt.Printf("Content: %s\n", result.Content.Text)
			} else {
				fmt.Printf("Type: Image\n")
				fmt.Printf("File: %s\n", result.Content.Metadata.Filename)
				if result.Content.Metadata.Description != "" {
					fmt.Printf("Description: %s\n", result.Content.Metadata.Description)
				}
			}
			fmt.Println("---")
		}
		return nil
	},
}

var imageCmd = &cobra.Command{
	Use:   "image",
	Short: "Image operations",
	Long:  `Commands for managing and finding similar images in your knowledge base.`,
}

var imageAddCmd = &cobra.Command{
	Use:   "add [image_path]",
	Short: "Add an image to your knowledge base",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		imagePath := args[0]

		if _, err := os.Stat(imagePath); err != nil {
			return fmt.Errorf("error accessing image file: %w", err)
		}

		imageData, err := ioutil.ReadFile(imagePath)
		if err != nil {
			return fmt.Errorf("error reading image file: %w", err)
		}

		mimeType := mime.TypeByExtension(filepath.Ext(imagePath))
		if mimeType == "" || !strings.HasPrefix(mimeType, "image/") {
			return fmt.Errorf("file does not appear to be an image: %s", imagePath)
		}

		resp, err := mlClient.AddImage(imageData, filepath.Base(imagePath))
		if err != nil {
			return fmt.Errorf("error adding image: %w", err)
		}

		fmt.Printf("Successfully added image with ID: %s\n", resp.ImageID)
		return nil
	},
}

var imageSimilarCmd = &cobra.Command{
	Use:   "similar [image_path]",
	Short: "Find similar images",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		imagePath := args[0]

		if _, err := os.Stat(imagePath); err != nil {
			return fmt.Errorf("error accessing image file: %w", err)
		}

		imageData, err := ioutil.ReadFile(imagePath)
		if err != nil {
			return fmt.Errorf("error reading image file: %w", err)
		}

		mimeType := mime.TypeByExtension(filepath.Ext(imagePath))
		if mimeType == "" || !strings.HasPrefix(mimeType, "image/") {
			return fmt.Errorf("file does not appear to be an image: %s", imagePath)
		}

		resp, err := mlClient.FindSimilarImages(imageData, 5, 0.3)
		if err != nil {
			return fmt.Errorf("error finding similar images: %w", err)
		}

		fmt.Printf("Similar images to: %s\n\n", filepath.Base(imagePath))
		for _, result := range resp.Results {
			fmt.Printf("Score: %.2f\n", result.Score)
			fmt.Printf("File: %s\n", result.Metadata.Filename)
			if result.Metadata.Description != "" {
				fmt.Printf("Description: %s\n", result.Metadata.Description)
			}
			fmt.Println("---")
		}
		return nil
	},
}

func init() {
	imageCmd.AddCommand(imageAddCmd)
	imageCmd.AddCommand(imageSimilarCmd)
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
