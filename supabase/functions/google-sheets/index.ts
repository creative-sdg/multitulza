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
      // Single row mode - get texts from columns H to Q
      if (rowNumber < 1) {
        throw new Error('Row number must be >= 1');
      }

      const range = `Sheet1!H${rowNumber}:Q${rowNumber}`; 
      
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
      
      console.log(`🔍 Fetching data from: ${url}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Google Sheets API response:', response.status, errorText);
        throw new Error(`Google Sheets API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const rows = data.values || [];
      
      if (rows.length === 0) {
        console.log(`❌ No data found for row ${rowNumber}`);
        return new Response(JSON.stringify({ texts: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const row = rows[0];
      // Extract texts from columns H to Q, filter out empty ones
      const texts = [
        row[0] || '',   // Column H
        row[1] || '',   // Column I  
        row[2] || '',   // Column J
        row[3] || '',   // Column K
        row[4] || '',   // Column L
        row[5] || '',   // Column M
        row[6] || '',   // Column N
        row[7] || '',   // Column O
        row[8] || '',   // Column P
        row[9] || '',   // Column Q
      ].filter(text => text.trim().length > 0);

      console.log(`✅ Successfully fetched ${texts.length} texts from row ${rowNumber} (columns H-Q)`);

      return new Response(JSON.stringify({ texts }), {
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