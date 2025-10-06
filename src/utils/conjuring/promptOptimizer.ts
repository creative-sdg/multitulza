/**
 * Optimizes prompts for different AI models
 * nano-banana works best with short, simple prompts (1-2 sentences)
 * seedream handles detailed, complex prompts well
 */

export type ModelType = 'nano-banana' | 'seedream';

/**
 * Simplifies a complex prompt for nano-banana while preserving key details:
 * - Main action/subject
 * - Style (UGC or cinematic)
 * - Core emotion
 */
export const simplifyPromptForNanoBanana = (fullPrompt: string): string => {
  // Extract main action line (first line before "Environment:")
  const mainActionMatch = fullPrompt.match(/^(.*?)(?:\n\nEnvironment:|Environment:)/s);
  let mainAction = mainActionMatch ? mainActionMatch[1].trim() : fullPrompt.split('\n')[0];
  
  // Extract emotion if present
  const emotionMatch = fullPrompt.match(/Emotion:\s*([^\n]+)/i);
  const emotion = emotionMatch ? emotionMatch[1].trim() : '';
  
  // Detect style markers
  const isUGC = fullPrompt.toLowerCase().includes('smartphone') || 
                fullPrompt.toLowerCase().includes('ugc') ||
                fullPrompt.toLowerCase().includes('user-generated') ||
                fullPrompt.toLowerCase().includes('phone picture');
  
  const isCinematic = fullPrompt.toLowerCase().includes('cinematic') ||
                      fullPrompt.toLowerCase().includes('professional') ||
                      fullPrompt.toLowerCase().includes('studio');
  
  // Build simplified prompt
  let simplified = mainAction;
  
  // Add emotion if present
  if (emotion) {
    simplified += `, ${emotion}`;
  }
  
  // Add essential style markers
  if (isUGC) {
    simplified += '. Smartphone photo, authentic UGC style, natural lighting';
  } else if (isCinematic) {
    simplified += '. Cinematic quality, professional lighting';
  }
  
  // Ensure it's not too long (max ~150 chars for nano-banana)
  if (simplified.length > 150) {
    // Keep first sentence and style
    const firstSentence = simplified.split('.')[0];
    const styleMarker = isUGC ? '. Smartphone photo, UGC style' : (isCinematic ? '. Cinematic quality' : '');
    simplified = firstSentence + styleMarker;
  }
  
  return simplified;
};

/**
 * Optimizes prompt based on the target model
 */
export const optimizePrompt = (prompt: string, model: ModelType): string => {
  if (model === 'nano-banana') {
    return simplifyPromptForNanoBanana(prompt);
  }
  // seedream uses the full prompt
  return prompt;
};
