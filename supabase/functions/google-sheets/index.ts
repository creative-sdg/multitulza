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
    const { spreadsheetId } = await req.json();
    
    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is required');
    }

    const apiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY');
    if (!apiKey) {
      throw new Error('Google Sheets API key not configured');
    }

    // Define the range for columns H to Q (Hook to Body Line 9)
    const range = 'Sheet1!H:Q'; 
    
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Google Sheets API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const rows = data.values || [];
    
    if (rows.length < 2) {
      throw new Error('No data found in the spreadsheet');
    }

    // Assume first row contains headers
    const headers = rows[0];
    const textBlocks = [];
    
    // Process each row (skip header row)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row && row.length > 0) {
        const block = {
          id: `block-${i}`,
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
        
        // Only add blocks that have at least some content
        if (Object.values(block).some(value => value && typeof value === 'string' && value.trim().length > 0)) {
          textBlocks.push(block);
        }
      }
    }

    console.log(`✅ Successfully fetched ${textBlocks.length} text blocks from Google Sheets`);

    return new Response(JSON.stringify({ textBlocks }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in Google Sheets function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});