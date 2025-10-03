import { GoogleGenAI, Type } from "@google/genai";
import type { CharacterProfile, ImagePrompt, GenerationMode, ActivityLists, GenerationStyle } from '@/types/conjuring';
import { getPromptConfig, PromptConfig, PromptKey, UGC_STYLE_APPENDIX, CINEMATIC_STYLE_APPENDIX } from './promptService';
import { getActivities, getAactivityCounts } from './activityService';
import { getArchetypes } from "./archetypeService";

const GEMINI_API_KEY_STORAGE_KEY = 'gemini-api-key';

export const saveGeminiApiKey = (key: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, key);
    }
};

export const hasGeminiApiKey = (): boolean => {
    if (typeof window !== 'undefined' && localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY)) {
        return true;
    }
    return !!process.env.API_KEY;
};

const getApiKey = (): string => {
    let apiKey: string | null = null;
    if (typeof window !== 'undefined') {
        apiKey = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
    }
    
    if (!apiKey) {
        apiKey = process.env.API_KEY;
    }

    if (!apiKey) {
        throw new Error("Gemini API key not found. Please set it in settings or as an API_KEY environment variable.");
    }
    return apiKey;
};

// Schema for the first call to get character details
const characterProfileSchema = {
  type: Type.OBJECT,
  properties: {
    name: {
        type: Type.STRING,
        description: "A plausible first name for the character."
    },
    personality: { 
      type: Type.STRING, 
      description: 'The character\'s personality in a few words.' 
    },
    backstory: { 
      type: Type.STRING, 
      description: 'The character\'s short backstory (maximum 300 characters).' 
    },
    livingPlace: {
        type: Type.STRING,
        description: "The character's plausible living place (City, Country)."
    },
    style: {
        type: Type.STRING,
        description: `The character's style. This must be chosen from a predefined list.`
    }
  },
  required: ['name', 'personality', 'backstory', 'livingPlace', 'style']
};

// Schema for the second call to get image prompts
const imagePromptsSchema = {
  type: Type.ARRAY,
  description: 'A list of photorealistic image prompts in English.',
  items: {
    type: Type.OBJECT,
    properties: {
      scene: { 
        type: Type.STRING, 
        description: 'A short title for the scene that includes a relevant emoji (e.g., "☕ Scene 1: Morning Coffee").'
      },
      prompt: { 
        type: Type.STRING, 
        description: 'The full English prompt for image generation.' 
      }
    },
    required: ['scene', 'prompt']
  }
};

// Schema for generating prompt variations
const promptVariationsSchema = {
    type: Type.ARRAY,
    description: 'A list of 3 creative variations of the provided prompt.',
    items: {
      type: Type.STRING,
      description: 'A single prompt variation.'
    }
};

const reimagineSceneSchema = {
  type: Type.OBJECT,
  properties: {
    scene: {
        type: Type.STRING,
        description: 'A very short title for the scene (5 words max) that includes a relevant emoji.'
    },
    prompt: {
      type: Type.STRING,
      description: 'The full, multi-line English prompt for image generation, following the required format.'
    }
  },
  required: ['scene', 'prompt']
};

/**
 * Shuffles an array using the Fisher-Yates algorithm.
 * @param array The array to shuffle.
 * @returns A new shuffled array.
 */
const shuffleArray = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};


export const generateCharacterProfile = async (
    base64Image: string,
    mimeType: string,
): Promise<CharacterProfile> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  
  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: base64Image,
    },
  };

  const archetypes = getArchetypes();
  const archetypesString = archetypes.join(', ');

  const schemaCopy = JSON.parse(JSON.stringify(characterProfileSchema));
  schemaCopy.properties.style.description = `The character's style. Choose one from this list: ${archetypesString}.`;

  const profilePrompt = {
    text: `Based on the provided image, create a plausible first name, a personality, a short backstory (max 300 characters), a living place (City, Country), and a style for this character. For the style, choose one from the following list: ${archetypesString}.`
  };

  const profileResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, profilePrompt] },
    config: {
        responseMimeType: "application/json",
        responseSchema: schemaCopy,
    }
  });
  
  let characterProfile: CharacterProfile;
  try {
    const jsonText = profileResponse.text.trim();
    characterProfile = JSON.parse(jsonText);
  } catch (error) {
    // FIX: The caught error is of type 'unknown' and cannot be directly used as a string.
    // Instead, check if it's an instance of Error before accessing properties like .message.
    console.error("Failed to parse Gemini response for character profile:", profileResponse.text);
    if (error instanceof Error) {
        throw new Error(`Failed to parse character profile: ${error.message}. Response was: ${profileResponse.text}`);
    } else {
        throw new Error(`Failed to parse character profile. An unknown error occurred. Response was: ${profileResponse.text}`);
    }
  }

  return characterProfile;
};

export const generateImagePrompts = async (
    characterProfile: CharacterProfile,
    generationMode: GenerationMode,
    generationStyle: GenerationStyle,
    environment?: string,
): Promise<ImagePrompt[]> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  let promptKey: PromptKey;
  switch(generationMode) {
      case 'selfie':
          promptKey = 'sceneGenerationSelfie';
          break;
      case 'romantic':
          promptKey = 'sceneGenerationRomantic';
          break;
      case 'date':
          promptKey = 'sceneGenerationDate';
          break;
      case 'couple':
          promptKey = 'sceneGenerationCouple';
          break;
      default:
          promptKey = 'sceneGeneration';
          break;
  }
  const config = getPromptConfig(promptKey);

  let selectedActivities: string[] = [];
  
  if (generationMode !== 'date') {
    const activities: ActivityLists = getActivities();
    const activityCounts = getAactivityCounts();
    let relevantCategories: (keyof ActivityLists)[] = [];

    if (generationMode === 'romantic') {
        relevantCategories = ['Romantic Activities'];
    } else if (generationMode === 'couple') {
        relevantCategories = ['Couple Activities'];
    } else { // 'normal' or 'selfie'
        relevantCategories = (Object.keys(activityCounts) as (keyof ActivityLists)[]).filter(
            cat => activityCounts[cat] > 0
        );
    }

    relevantCategories.forEach(category => {
        const count = (generationMode === 'romantic' || generationMode === 'couple') 
            ? 9 
            : (activityCounts[category] || 0);
            
        if (activities[category] && count > 0) {
            selectedActivities.push(...shuffleArray(activities[category]).slice(0, count));
        }
    });
  }

  const styleAppendix = generationStyle === 'ugc' ? UGC_STYLE_APPENDIX : CINEMATIC_STYLE_APPENDIX;
  
  let finalPrompt = config.prompt;
  
  if (generationMode === 'date' && environment) {
      finalPrompt = finalPrompt.replace('{dateEnvironment}', environment);
  }
  
  finalPrompt = finalPrompt
      .replace('{selectedActivities}', selectedActivities.join('\n'))
      .replace('{styleAppendix}', styleAppendix);

  const textPart = {
      text: `Character Profile:\n${JSON.stringify(characterProfile, null, 2)}\n\nPrompt Template:\n${finalPrompt}`
  };

  const response = await ai.models.generateContent({
    model: config.model,
    contents: { parts: [textPart] },
    config: {
        responseMimeType: "application/json",
        responseSchema: imagePromptsSchema,
    }
  });

  let prompts: ImagePrompt[];
  try {
    const jsonText = response.text.trim();
    prompts = JSON.parse(jsonText);
  } catch (error) {
    // FIX: The caught error is of type 'unknown' and cannot be directly used as a string.
    // Instead, check if it's an instance of Error before accessing properties like .message.
    console.error("Failed to parse Gemini response for image prompts:", response.text);
    if (error instanceof Error) {
        throw new Error(`Failed to parse prompts: ${error.message}. Response was: ${response.text}`);
    } else {
        throw new Error(`Failed to parse prompts. An unknown error occurred. Response was: ${response.text}`);
    }
  }
  
  if (generationMode === 'date') {
    const processedPrompts = prompts.map(p => ({
        ...p,
        prompt: p.prompt.split('\n').filter(line => !line.trim().toLowerCase().startsWith('outfit:')).join('\n')
    }));
    return processedPrompts;
  }

  return prompts;
};

export const generatePromptVariations = async (originalPrompt: string): Promise<string[]> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const config = getPromptConfig('variations');
    
    const finalPrompt = config.prompt.replace('{originalPrompt}', originalPrompt);

    const textPart = { text: finalPrompt };

    const response = await ai.models.generateContent({
        model: config.model,
        contents: { parts: [textPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: promptVariationsSchema,
        }
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse variations from Gemini:", response.text, e);
        throw new Error("Could not generate prompt variations.");
    }
};

export const generateMotionPrompt = async (imagePrompt: string, config: PromptConfig): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const finalPrompt = config.prompt.replace('{imagePrompt}', imagePrompt);
    const textPart = { text: finalPrompt };
    
    const response = await ai.models.generateContent({
        model: config.model,
        contents: { parts: [textPart] },
    });
    
    return response.text.trim();
};

export const reimagineScenePrompt = async (
    characterProfile: CharacterProfile,
    newActivity: string,
    generationStyle: GenerationStyle,
    generationMode: GenerationMode,
    consistentEnv?: string,
    consistentOutfit?: string, // This parameter is now ignored for 'date' mode.
): Promise<{ scene: string, prompt: string }> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const config = getPromptConfig('reimagine');

    let modeContext = '';
    if (generationMode === 'date' && consistentEnv) {
        modeContext = `This is for a 'Date' sequence. The environment MUST be identical to this: "${consistentEnv}". Do NOT describe an outfit.`;
    } else if (generationMode === 'date') {
        modeContext = `This is for a 'Date' sequence. Maintain a consistent environment as if it's the same day. Do NOT describe an outfit.`;
    }
    
    const styleAppendix = generationStyle === 'ugc' ? UGC_STYLE_APPENDIX : CINEMATIC_STYLE_APPENDIX;
    
    let finalPrompt = config.prompt
        .replace('{characterName}', characterProfile.name)
        .replace('{personality}', characterProfile.personality)
        .replace('{style}', characterProfile.style)
        .replace('{newActivity}', newActivity)
        .replace('{modeContext}', modeContext)
        .replace('{styleAppendix}', styleAppendix);

    const textPart = { text: finalPrompt };

    const response = await ai.models.generateContent({
        model: config.model,
        contents: { parts: [textPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: reimagineSceneSchema,
        }
    });
    
    let result: { scene: string, prompt: string };
    try {
        const jsonText = response.text.trim();
        result = JSON.parse(jsonText);
    } catch (error) {
        console.error("Failed to parse reimagineScene from Gemini:", response.text, error);
        if (error instanceof Error) {
            throw new Error(`Failed to parse reimagine response: ${error.message}. Response was: ${response.text}`);
        } else {
            throw new Error(`Failed to parse reimagine response. An unknown error occurred. Response was: ${response.text}`);
        }
    }

    // In 'date' mode, programmatically remove the 'Outfit' line to ensure consistency with the source image.
    if (generationMode === 'date') {
        result.prompt = result.prompt.split('\n').filter(line => !line.trim().toLowerCase().startsWith('outfit:')).join('\n');
    }

    return result;
};

export const generateEditSuggestion = async (
    base64Image: string,
    mimeType: string,
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  
  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: base64Image,
    },
  };

  const suggestionPrompt = {
    text: `Based on the provided image of a person, suggest a creative and interesting edit that could be made. The suggestion should be a concise instruction for an image editing AI. For example: "Change his t-shirt to a hawaiian shirt", or "Add a pair of sunglasses".`
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, suggestionPrompt] },
  });
  
  return response.text.trim();
};