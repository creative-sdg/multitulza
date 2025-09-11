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
  private readonly spreadsheetId = '13fHWy8hTrtLK29xzHS-zr6sAJDmVRQzmQL8BMMpczj4';
  private readonly supabaseUrl = 'https://kyasmnsbddufkyhcdroj.supabase.co';
  
  async getTextBlock(rowNumber: number): Promise<TextBlock | null> {
    try {
      const response = await fetch(`${this.supabaseUrl}/functions/v1/google-sheets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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