export interface TextBlock {
  id: string;
  hook?: string;
  problem?: string;
  solution?: string;
  proof?: string;
  offer?: string;
  urgency?: string;
  cta?: string;
  bodyLine1?: string;
  bodyLine2?: string;
  bodyLine3?: string;
  bodyLine4?: string;
  bodyLine5?: string;
  bodyLine6?: string;
  bodyLine7?: string;
  bodyLine8?: string;
  bodyLine9?: string;
}

export interface GoogleSheetsService {
  getTextBlock(rowNumber: number): Promise<TextBlock | null>;
}

export class GoogleSheetsServiceImpl implements GoogleSheetsService {
  private readonly spreadsheetId = '18fQlTTutBAtuS3NUCEGGmjou5wfw0nj_X3J8Kv88eMM';
  
  async getTextBlock(rowNumber: number): Promise<TextBlock | null> {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-sheets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          spreadsheetId: this.spreadsheetId,
          rowNumber,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch text block: ${response.statusText}`);
      }

      const data = await response.json();
      return data.textBlock || null;
    } catch (error) {
      console.error('Error fetching text block:', error);
      throw error;
    }
  }
}

export const googleSheetsService = new GoogleSheetsServiceImpl();