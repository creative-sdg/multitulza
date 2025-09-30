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

    // Google Service Account credentials
    const credentials = {
      "type": "service_account",
      "project_id": "kombaen",
      "private_key_id": "fdde87439560b37b839bca83a5cb843c02384a80",
      "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC5HD5K06OuTBKU\nbAmrE41dkT3aYC0ysdxvjtHtV/cWkWzSpDxPArpxlfawivR3HNPBlz6FMzPIWn1I\nZmqsJBLwFvej247GJWqeKmpNFDgtUP6yNVHa8YELpQxnGwWvqtiTiHLq5U4P8jmG\nE974W87H94yfDyPp6gxGFG42VfcPsqkbvCIOcim4EJn6qQRkPM53Fxl353hATYHs\neQru7H1K/5Zwhiz95AZstS6VGzIdj7wgrfPW0Ne0F1fFNuoQ2MioP2UqgHSaqvd2\n65tf3EFc9N88TAhwobpWOMHUVt/jmil7U+OYkBvKXZFH0R2OQQqg6QIVPxEJQop3\njsg6n2SpAgMBAAECggEAEdD71uBdV+yG+kWWvaJFYCzXRvIsT32KcatNnboydDfd\ngT2g91rUHpQYOQA6zM8Xu4GG2TOnJ4C8H7CJ0lUrhHO1dI4whPY7d4suDYqlaIkr\n5nOW1AucB8akNbVGXBTFwRdoNh8JXyQJcNPvSTiu45S6MmH26y/lbAZR4EVwYNB/\nha6isJkXYxRY91zVxyrN6D5Ed+uVGTfIT2y0tf56BhW0azY6taqYDTMS8UeiLQHY\nD7ar95t1CDQkIWfDxYAkmhb2DSsV7N3YIkvw8HstuEcHR+b9wPjHEpcgK2gVMNAn\n9Sa2o/Fmtm86i6frbB58FNEgQqMoFK7eR98CQcklXQKBgQDsati4DBziyX+bTB8x\neOcU/Ld0SFVrFc9EIh0Ur/stRgNEK6jn73djHaQEUN7dST0RjmhWSbFzxZQxx+3A\n0GY3bOLQ6Ol+MMrY4ovekC/qwh9T+PvyPN3xpm2lZ2E5uUCIayBu4b6Id5X/2l9Y\nNT61G6pYG2271KlplBmlWQ9JfQKBgQDIcXKVNmcDaW2NWY0i0iYGJCIw5F1M4eQz\nK0kilkYf1Rs6CHKTMmQBOIRZhgfwHKzNg0GUfU7EhxBzqDQe7BhXu9nmXVLwNL0g\nASYbf8l4XPj46pANb/YRIuJoC1eobBA9kRy/NjFmhjFnhzehNIboLrLybf7hcXpL\npS2j/YUPnQKBgBkIGxgpmClfAlbUEX1weq8bLuVt/zVOYtqo7gFRvLuHbTMbmE+u\naCqjaclXMrGlXoTsWhnAxbwnUFCRBZhjuF7n9X//GTHWQrQCEKMpCxnFIgIHG84D\nKdC7OWLI9l9hQPbwuMdkuYLDfqtPWMcDJDeSzU904AKCOsnF940tR9QVAoGAPHpu\ndjMJ9e+TjHieqwj5TBUO8+2TcSUfM4k18eehlO0539K4r00e+3dQB6r3Li2YvhGC\ncgk1APs3rY3s2/+kgKQ/ZNB3u95NyiBOnTF7WoPC42fyuvszJYx+/6Gce0bPx6PH\nJrJ1SVfoBDK6SDuPEPM2LwudQex5V+Wo1bgis8kCgYEAti/QdoD0W2bkhYsCpukd\nDc8HiQ3e1iPHl01LCHHaAvHDM740YOJqLEpD5vCgHxE0nGfE3nmnkLuF+tSr/hWJ\nzvTZoWhF5thNyMQLxLtXhDCI6nyoydWZwGTmIY/T/ZrMo5wU9M0h+FoIGUuaZG7u\nHuy2AqbXd44WpNL7OPgqTV8=\n-----END PRIVATE KEY-----\n",
      "client_email": "iurii-biriukov-serive-account@kombaen.iam.gserviceaccount.com",
      "client_id": "102169283884339843089",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/iurii-biriukov-serive-account%40kombaen.iam.gserviceaccount.com",
      "universe_domain": "googleapis.com"
    };
    
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
