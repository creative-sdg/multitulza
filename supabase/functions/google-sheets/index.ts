import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { spreadsheetId, rowNumber } = await req.json();
    
    // Validate spreadsheetId format (Google Sheets IDs are typically 30-50 characters)
    const SHEETS_ID_PATTERN = /^[a-zA-Z0-9-_]{30,50}$/;
    if (!spreadsheetId || !SHEETS_ID_PATTERN.test(spreadsheetId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid spreadsheet ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate rowNumber is a valid positive integer within reasonable range
    const rowNum = parseInt(rowNumber);
    if (isNaN(rowNum) || rowNum < 1 || rowNum > 10000) {
      return new Response(
        JSON.stringify({ error: 'Row number must be between 1 and 10000' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load Google Service Account credentials from environment variable
    const credentialsJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!credentialsJson) {
      console.error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable not set');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const credentials = JSON.parse(credentialsJson);
    
    // Get OAuth token
    const jwtHeader = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const now = Math.floor(Date.now() / 1000);
    const jwtClaimSet = {
      iss: credentials.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };
    const jwtClaimSetEncoded = btoa(JSON.stringify(jwtClaimSet));
    
    const signatureInput = `${jwtHeader}.${jwtClaimSetEncoded}`;
    
    // Import private key
    const privateKey = credentials.private_key;
    const pemContents = privateKey
      .replace("-----BEGIN PRIVATE KEY-----", "")
      .replace("-----END PRIVATE KEY-----", "")
      .replace(/\s/g, "");
    
    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );
    
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      new TextEncoder().encode(signatureInput)
    );
    
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    const jwt = `${jwtHeader}.${jwtClaimSetEncoded}.${signatureBase64}`;
    
    // Get access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to get access token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { access_token } = await tokenResponse.json();
    
    // Fetch spreadsheet data
    const range = `A${rowNumber}:Z${rowNumber}`;
    const sheetsResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );
    
    if (!sheetsResponse.ok) {
      const errorText = await sheetsResponse.text();
      console.error('Sheets API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch spreadsheet data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const data = await sheetsResponse.json();
    
    if (!data.values || data.values.length === 0) {
      return new Response(
        JSON.stringify({ textBlock: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const row = data.values[0];
    
    // Read cells H-R (indices 7-17) and skip empty ones
    const bodyCells = [];
    for (let i = 7; i <= 17; i++) {
      const cellValue = row[i] || '';
      if (cellValue.trim()) {
        bodyCells.push(cellValue);
      }
    }
    
    const textBlock: any = {
      id: `row-${rowNumber}`,
    };
    
    // Add only non-empty body lines
    bodyCells.forEach((value, index) => {
      textBlock[`bodyLine${index + 1}`] = value;
    });
    
    return new Response(
      JSON.stringify({ textBlock }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    // Log detailed error for debugging but return generic message to client
    console.error('Error in google-sheets function:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
