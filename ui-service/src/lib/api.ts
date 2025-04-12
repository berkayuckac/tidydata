export interface SearchResponse {
  id: string;
  score: number;
  source_type: "text" | "image";
  text?: string;
  filename?: string;
  content_type?: string;
  description?: string;
  image_data?: string;
}

export type SearchResult = SearchResponse & { type: "text" | "image" };

interface AddContentResponse {
  success: boolean;
  id: string;
}

class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

function getEndpoint(): string {
  if (typeof window === 'undefined') {
    throw new Error('Cannot access localStorage on server side');
  }
  const endpoint = localStorage.getItem("tidydata-server-endpoint");
  if (!endpoint) {
    return "http://localhost:8000"; // fallback to default
  }
  
  // Format the endpoint URL
  let url;
  try {
    const formattedEndpoint = endpoint
      .replace(/localhost([0-9]+)/, 'localhost:$1')
      .replace(/([^:])\/\//, '$1/');

    url = new URL(formattedEndpoint);
    if (!url.protocol.startsWith('http')) {
      url = new URL(`http://${formattedEndpoint}`);
    }
  } catch (e) {
    try {
      url = new URL(`http://${endpoint}`);
    } catch (e) {
      throw new Error(`Invalid server endpoint: ${endpoint}`);
    }
  }

  // Remove trailing slash if present
  return url.toString().replace(/\/$/, '');
}

export async function searchContent(query: string, threshold: number = 0.1): Promise<SearchResult[]> {
  try {
    const endpoint = getEndpoint();
    const response = await fetch(`${endpoint}/search?query=${encodeURIComponent(query)}&score_threshold=${threshold}&limit=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new ApiError('Failed to search content', response.status);
    }

    const data = await response.json();
    return data.results.map((result: any) => ({
      id: result.id,
      score: result.score,
      source_type: result.source_type,
      type: result.source_type as "text" | "image",
      text: result.content?.text,
      ...result.content?.metadata,
      image_data: result.content?.image_data
    }));
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
}

export async function addTextContent(content: string): Promise<AddContentResponse> {
  try {
    const endpoint = getEndpoint();
    const response = await fetch(`${endpoint}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: content }),
    });

    if (!response.ok) {
      throw new ApiError('Failed to add text content', response.status);
    }

    return await response.json();
  } catch (error) {
    console.error('Add text error:', error);
    throw error;
  }
}

export async function addImage(file: File): Promise<AddContentResponse> {
  try {
    const endpoint = getEndpoint();
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${endpoint}/images`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new ApiError('Failed to add image', response.status);
    }

    return await response.json();
  } catch (error) {
    console.error('Add image error:', error);
    throw error;
  }
}

export async function findSimilarImages(file: File): Promise<SearchResponse[]> {
  try {
    const endpoint = getEndpoint();
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${endpoint}/images/similar`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new ApiError('Failed to find similar images', response.status);
    }

    return await response.json();
  } catch (error) {
    console.error('Find similar images error:', error);
    throw error;
  }
} 