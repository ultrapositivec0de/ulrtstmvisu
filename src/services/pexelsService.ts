export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
  selected?: boolean;
}

export class PexelsService {
  private static BASE_URL = 'https://api.pexels.com/v1';

  static async searchPhotos(query: string, apiKey: string, page: number = 1, perPage: number = 20): Promise<PexelsPhoto[]> {
    const url = `${this.BASE_URL}/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}`;
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const data = await response.json();
      return data.photos;
    } catch (err: any) {
      // Proxy fallback
      if (err.name === 'TypeError' || err.message.includes('fetch') || err.message.includes('NetworkError')) {
        try {
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
          const response = await fetch(proxyUrl, {
            headers: {
              Authorization: apiKey,
            },
          });
          if (response.ok) {
            const data = await response.json();
            return data.photos;
          }
        } catch (proxyErr) {
          console.error('Pexels Proxy Error:', proxyErr);
        }
      }
      console.error('Pexels Search Error:', err);
      throw err;
    }
  }

  static async getCuratedPhotos(apiKey: string, perPage: number = 20): Promise<PexelsPhoto[]> {
    const response = await fetch(`${this.BASE_URL}/curated?per_page=${perPage}`, {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Pexels API Error');
    }

    const data = await response.json();
    return data.photos;
  }
}
