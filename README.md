# TidyData

A high-performance, self-hosted personal knowledge management system that enables semantic search across your text content.

## Features

- 🔍 Semantic Search: Find content based on meaning, not just keywords
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
echo "alias tidydata='$(pwd)/bin/tidydata'" >> ~/.zshrc
source ~/.zshrc
```

### Usage

1. Add content:
```bash
# Add text directly
tidydata add "Your text content here"

# Add from a file
tidydata add -f path/to/your/file.txt
```

2. Search content:
```bash
tidydata search "your search query"
```

Example search output:
```
Search results for: knowledge management

Score: 0.89
Text: TidyData is a powerful knowledge management system...
---
Score: 0.75
Text: Organize and search through your content...
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