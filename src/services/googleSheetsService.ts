import { supabase } from "@/integrations/supabase/client";

export interface TextBlock {
  id: string;
  bodyLine1?: string;
  bodyLine2?: string;
  bodyLine3?: string;
  bodyLine4?: string;
  bodyLine5?: string;
  bodyLine6?: string;
  bodyLine7?: string;
  bodyLine8?: string;
  bodyLine9?: string;
  bodyLine10?: string;
  bodyLine11?: string;
  [key: string]: string | undefined;
}

export interface GoogleSheetsService {
  getTextBlock(rowNumber: number): Promise<TextBlock | null>;
}

export class GoogleSheetsServiceImpl implements GoogleSheetsService {
  private readonly spreadsheetId = '18fQlTTutBAtuS3NUCEGGmjou5wfw0nj_X3J8Kv88eMM';
  
  async getTextBlock(rowNumber: number): Promise<TextBlock | null> {
    try {
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: this.spreadsheetId,
          rowNumber,
        }
      });

      if (error) {
        throw new Error(`Failed to fetch text block: ${error.message}`);
      }

      return data.textBlock || null;
    } catch (error) {
      console.error('Error fetching text block:', error);
      throw error;
    }
  }
}

export const googleSheetsService = new GoogleSheetsServiceImpl();