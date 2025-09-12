import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { spreadsheetId, rowNumber } = await req.json();
    
    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is required');
    }

    const apiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY');
    if (!apiKey) {
      throw new Error('Google Sheets API key not configured');
    }

    if (rowNumber) {
      // Single row mode (existing functionality)
      if (rowNumber < 2) {
        throw new Error('Row number must be >= 2');
      }

      const range = `Sheet1!H${rowNumber}:Q${rowNumber}`; 
      
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google Sheets API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const rows = data.values || [];
      
      if (rows.length === 0) {
        console.log(`❌ No data found for row ${rowNumber}`);
        return new Response(JSON.stringify({ textBlock: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const row = rows[0];
      const textBlock = {
        id: `block-${rowNumber}`,
        hook: row[0] || '',           // Column H
        problem: row[1] || '',        // Column I  
        solution: row[2] || '',       // Column J
        proof: row[3] || '',          // Column K
        offer: row[4] || '',          // Column L
        urgency: row[5] || '',        // Column M
        cta: row[6] || '',            // Column N
        bodyLine1: row[7] || '',      // Column O
        bodyLine2: row[8] || '',      // Column P
        bodyLine3: row[9] || '',      // Column Q
        bodyLine4: row[10] || '',     // Additional columns if present
        bodyLine5: row[11] || '',
        bodyLine6: row[12] || '',
        bodyLine7: row[13] || '',
        bodyLine8: row[14] || '',
        bodyLine9: row[15] || '',
      };

      console.log(`✅ Successfully fetched text block for row ${rowNumber} from Google Sheets`);

      return new Response(JSON.stringify({ textBlock }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Multi-row mode (for chunked audio scenario)
      const range = `Sheet1!H2:H100`; // Get texts from column H, starting from row 2
      
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google Sheets API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const rows = data.values || [];
      
      // Extract texts from rows, filter out empty ones
      const texts = rows
        .map(row => (row[0] || '').trim())
        .filter(text => text.length > 0);

      console.log(`✅ Successfully fetched ${texts.length} texts from Google Sheets`);

      return new Response(JSON.stringify({ texts }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('❌ Error in Google Sheets function:', error);
    
    // Add more detailed error logging
    if (error.message.includes('API has not been used')) {
      console.error('❌ Google Sheets API is not enabled. Please enable it in Google Console.');
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check if Google Sheets API is enabled and API key is valid'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});