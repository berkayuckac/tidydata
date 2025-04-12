# TidyData

A high-performance, self-hosted personal knowledge management system that enables semantic search across your text content and images.

## Features

- 🔍 Semantic Search: Find content based on meaning, not just keywords
- 🖼️ Cross-Modal Search: Search images using text descriptions and vice versa
- 💻 Local First: All data stays on your machine
- 🐳 Easy Setup: Just Docker and Go required
- 🔋 Battery Included: Comes with all necessary components

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Latest Go
- 2GB RAM
- 500MB disk space

### Installation

1. Clone the repository:
```bash
git clone https://github.com/berkayuckac/tidydata.git
cd tidydata
```

2. Start the backend services:
```bash
docker-compose up -d
```

3. Build and set up the CLI:
```bash
cd core-service
go build -o bin/tidydata cmd/tidydata/main.go

# Add alias to your shell (one-time setup)
echo "alias tidydata='$(pwd)/bin/tidydata'" >> ~/.zshrc  # for zsh
# OR
echo "alias tidydata='$(pwd)/bin/tidydata'" >> ~/.bashrc # for bash

# Reload your shell configuration
source ~/.zshrc  # for zsh
# OR
source ~/.bashrc # for bash
```

### Usage

1. Add text content:
```bash
# Add text directly
tidydata add "Your text content here"

# Add from a file
tidydata add -f path/to/your/file.txt
```

2. Add images:
```bash
# Add an image
tidydata image add path/to/your/image.jpg

# Find similar images
tidydata image similar path/to/your/image.jpg
```

3. Search content:
```bash
# Basic search (uses default threshold of 0.1)
tidydata search "your search query"

# Search with custom threshold
tidydata search "your search query" --threshold 0.3

# Recommended thresholds:
# - For text-to-text search: 0.3-0.7
# - For text-to-image search: 0.1-0.3
```

Example search output:
```
Search results for: cat driving a car (threshold: 0.1)

Score: 0.31
Type: Text
Content: Car travel guides for road trips across the country.
---
Score: 0.28
Type: Image
File: cat_driving.jpg
Description: A cat sitting in a car driver's seat
---
```

## Architecture

The system consists of two main services:

1. **ML Service (Python/FastAPI)**
   - Handles text embedding generation
   - Uses sentence-transformers (all-MiniLM-L6-v2)

2. **Vector Database (Qdrant)**
   - Stores documents and embeddings
   - Enables semantic search
   - Persists data locally

## Development

To start in development mode:
```bash
docker-compose up
```

The services will be available at:
- ML Service: http://localhost:8000
- Qdrant: http://localhost:6333

## License

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 