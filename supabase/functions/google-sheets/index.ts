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
    
    if (!spreadsheetId || !rowNumber) {
      return new Response(
        JSON.stringify({ error: 'Missing spreadsheetId or rowNumber' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountKey) {
      console.error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Service account key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Service account key first 50 chars:', serviceAccountKey.substring(0, 50));
    console.log('Service account key length:', serviceAccountKey.length);
    
    let credentials;
    try {
      credentials = JSON.parse(serviceAccountKey);
    } catch (parseError) {
      console.error('Failed to parse service account key:', parseError);
      console.error('Key starts with:', serviceAccountKey.substring(0, 100));
      return new Response(
        JSON.stringify({ error: 'Invalid service account key format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
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
    const textBlock = {
      id: `row-${rowNumber}`,
      hook: row[0] || '',
      problem: row[1] || '',
      solution: row[2] || '',
      proof: row[3] || '',
      offer: row[4] || '',
      urgency: row[5] || '',
      cta: row[6] || '',
      bodyLine1: row[7] || '',
      bodyLine2: row[8] || '',
      bodyLine3: row[9] || '',
      bodyLine4: row[10] || '',
      bodyLine5: row[11] || '',
      bodyLine6: row[12] || '',
      bodyLine7: row[13] || '',
      bodyLine8: row[14] || '',
      bodyLine9: row[15] || '',
    };
    
    return new Response(
      JSON.stringify({ textBlock }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in google-sheets function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
