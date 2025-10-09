import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId } = await req.json();

    // Validate text input
    const MAX_TEXT_LENGTH = 5000;
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Text is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Text cannot be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Text too long. Maximum ${MAX_TEXT_LENGTH} characters allowed` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate voiceId
    const ALLOWED_VOICE_IDS = [
      'TX3LPaxmHKxFdv7VOQHJ', // Liam
      'cgSgspJ2msm6clMCkdW9', // Jessica
      'onwK4e9ZLuTAKqWW03F9', // Daniel
      'pFZP5JQG7iQjIQuC4Bku', // Lily
    ];
    
    if (voiceId && !ALLOWED_VOICE_IDS.includes(voiceId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid voice ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      console.error('ELEVENLABS_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating speech for text:', text.substring(0, 50) + '...');
    console.log('Using voice ID:', voiceId);

    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `ElevenLabs API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get audio data
    const audioArrayBuffer = await response.arrayBuffer();
    
    // Calculate duration (rough estimate based on file size)
    // MP3 files are roughly 1MB per minute at 128kbps
    const durationSeconds = (audioArrayBuffer.byteLength / (128 * 1024 / 8));

    console.log('Audio generated successfully, duration:', durationSeconds.toFixed(2), 'seconds');

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store in user-specific folder
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, audioArrayBuffer, {
        contentType: 'audio/mpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload audio: ${uploadError.message}`);
    }

    // Get signed URL with 1 hour expiration
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('videos')
      .createSignedUrl(fileName, 3600);

    if (signedUrlError) {
      console.error('Signed URL error:', signedUrlError);
      throw new Error(`Failed to create signed URL: ${signedUrlError.message}`);
    }

    console.log('Audio uploaded to storage with signed URL');

    return new Response(
      JSON.stringify({ 
        audioUrl: signedUrlData.signedUrl,
        duration: durationSeconds
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Log detailed error for debugging but return generic message to client
    console.error('Error in elevenlabs-tts function:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
