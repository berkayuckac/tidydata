package main

import (
	"fmt"
	"os"

	"github.com/berkayuckac/tidydata/internal/api"
	"github.com/spf13/cobra"
)

var (
	mlClient *api.MLClient
	fileFlag string
	version  = "v0.1.0"
)

const defaultMLServiceURL = "http://localhost:8000" // TODO: Make this configurable

func init() {
	mlClient = api.NewMLClient(defaultMLServiceURL)
	rootCmd.AddCommand(addCmd)
	rootCmd.AddCommand(searchCmd)
	addCmd.Flags().StringVarP(&fileFlag, "file", "f", "", "Path to file containing text to add")
	rootCmd.Version = version
}

var rootCmd = &cobra.Command{
	Use:     "tidydata",
	Short:   "TidyData - A personal knowledge management system",
	Version: version,
	Long: `TidyData is a personal knowledge management system that enables semantic search
across your text content. It uses language models to understand
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
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		query := args[0]
		resp, err := mlClient.SearchDocuments(query, 5, 0.3)
		if err != nil {
			return fmt.Errorf("error searching documents: %w", err)
		}

		fmt.Printf("Search results for: %s\n\n", query)
		for _, result := range resp.Results {
			fmt.Printf("Score: %.2f\n", result.Score)
			fmt.Printf("Text: %s\n", result.Text)
			fmt.Println("---")
		}
		return nil
	},
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
