export interface PexelsPhoto {
  id: number | string;
  src: {
    large2x?: string;
    large: string;
    medium: string;
    [key: string]: any;
  };
  alt?: string;
  photographer: string;
  photographer_url: string;
}

export class PexelsService {
  static async searchPhotos(query: string, apiKey: string, page: number): Promise<PexelsPhoto[]> {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=30`;
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: apiKey
        }
      });
      
      if (!response.ok) {
        throw new Error(`Pexels initial fetch failed with status ${response.status}`);
      }
      
      const data = await response.json();
      return data.photos || [];
    } catch (err) {
      // Attempt proxy as fallback
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, {
        headers: {
          Authorization: apiKey
        }
      });
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      return data.photos || [];
    }
  }
}
