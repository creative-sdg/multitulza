export type PromptKey = 
  | 'sceneGeneration'
  | 'sceneGenerationSelfie'
  | 'sceneGenerationRomantic'
  | 'sceneGenerationDate'
  | 'sceneGenerationCouple'
  | 'variations'
  | 'motion'
  | 'reimagine';

export type GeminiModel = 'gemini-2.5-flash';

export interface PromptConfig {
  prompt: string;
  model: GeminiModel;
}

export const UGC_STYLE_APPENDIX = `- Very important : ***⚠️ NO DEPTH OF FIELD, NO BOKEH, FLAT FOCUS, SHARP BACKGROUND*** (REQUIRED)
- No alcohol
- Smartphone photo, authentic user-generated content style, imperfect framing. Bad angle. Flat colors, whitish tones, low contrast, washed-out look, natural daylight.
- Texture like real phone picture: slight noise, compression artifacts, not ultra sharp, glare
- Details: slightly imperfections on the textures of the scene (scratches, dust, stains, marks)
- Vibe: raw, simple, authentic, natural, realistic social media photo.
- NOT cinematic, NOT professional studio, NOT ultra high definition, NOT color graded.
- Aspect ratio: 9:16`;

export const CINEMATIC_STYLE_APPENDIX = `- No alcohol
- Cinematic perspective, professional composition, dynamic framing
- Ultra-high resolution, detailed textures, crystal sharpness
- Studio-quality color grading: deep blacks, balanced highlights, cinematic tonesRealistic cinematic imperfections: subtle film grain, natural lens flares, slight motion blur when appropriate
- Atmosphere: immersive, dramatic, evocative, like a still from a movie
- Aspect ratio: 9:16`;


const PROMPTS_STORAGE_KEY = 'conjuring-studio-prompts';

const defaultPrompts: Record<PromptKey, PromptConfig> = {
  sceneGeneration: {
    model: 'gemini-2.5-flash',
    prompt: `You are an AI assistant that generates a JSON object containing a list of 9 photorealistic image prompts.
For each prompt, you will generate a 'scene' (a short, descriptive title with a relevant emoji) and a 'prompt' (the full image generation prompt).

- Each of the 9 prompts must be based on one of the unique activities from the list provided below.
- The goal is to create scenes that look like a natural piece of life.

Activities to use:
{selectedActivities}

For the 'prompt' field of EACH of the 9 items, construct it using the following multi-line structure:

Smartphone picture of (character name), (doing the activity)

Environment: [Describe a coherent environment based on the character's living place and the activity]
Outfit: [Describe a coherent outfit for the scene based on the character's style]
Emotion: [Describe a varied but coherent emotion based on the activity and the character's personality]

{styleAppendix}

Additional rules for the entire list:
- Do not give specific details about the character's face in the scene description, but use the "Emotion" line for facial expressions.
- No topless scene
- No other people face
- Only one scene in the entire set can include a pet.
- Do not include the scene number in the title.`
  },
  sceneGenerationSelfie: {
    model: 'gemini-2.5-flash',
    prompt: `You are an AI assistant that generates a JSON object containing a list of 9 photorealistic selfie image prompts.
For each prompt, you will generate a 'scene' (a short, descriptive title with a relevant emoji) and a 'prompt' (the full image generation prompt).

- Each of the 9 prompts must be based on one of the unique activities from the list provided below.
- The goal is to create scenes that look like authentic selfies, taken by the character themselves.

Activities to use:
{selectedActivities}

For the 'prompt' field of EACH of the 9 items, construct it using the following multi-line structure:

POV, eye-level view angle, selfie taken by (character name), arm extended holding the phone, (doing the activity)

Environment: [Describe a coherent environment based on the character's living place and the activity]
Outfit: [Describe a coherent outfit for the scene based on the character's style]
Emotion: [Describe a varied but coherent emotion based on the activity and the character's personality]

{styleAppendix}

Additional rules for the entire list:
- Do not give specific details about the character's face in the scene description, but use the "Emotion" line for facial expressions.
- No topless scene
- No other people face
- Only one scene in the entire set can include a pet.
- Do not include the scene number in the title.`
  },
  sceneGenerationRomantic: {
    model: 'gemini-2.5-flash',
    prompt: `You are an AI assistant that generates a JSON object containing a list of 9 photorealistic romantic image prompts.
For each prompt, you will generate a 'scene' (a short, descriptive title with a relevant emoji) and a 'prompt' (the full image generation prompt).

- Each of the 9 prompts must be based on one of the unique romantic activities from the list provided below.
- The goal is to create scenes featuring the character in romantic actions.

Activities to use:
{selectedActivities}

For the 'prompt' field of EACH of the 9 items, construct it using the following multi-line structure:

Picture of (character name) (doing the activity)

Environment: [Describe a coherent environment based on the character's living place and the activity]
Outfit: [Describe a coherent outfit for the scene based on the character's style]
Emotion: [Describe a varied but coherent emotion based on the activity and the character's personality]

{styleAppendix}

Additional rules for the entire list:
- Do not give specific details about the character's face in the scene description, but use the "Emotion" line for facial expressions.
- No topless scene
- No other people face
- Only one scene in the entire set can include a pet.
- Do not include the scene number in the title.`
  },
  sceneGenerationDate: {
    model: 'gemini-2.5-flash',
    prompt: `You are an AI assistant that generates a JSON object containing a list of exactly 9 photorealistic dating scene image prompts, in a specific, non-random order.
For each prompt, you will generate a 'scene' (a short, descriptive title with a relevant emoji) and a 'prompt' (the full image generation prompt).

**Core Concept:**
1. All 9 scenes must be part of a single, coherent date story.
2. The overall story is from a "first-person girlfriend" POV.

**Structure for EACH of the 9 prompts:**
For the 'prompt' field, construct it using the following multi-line structure. **DO NOT include an 'Outfit' line.** The character's outfit is determined by a source image, not this text prompt.

The structure is:
[Main action line]

Environment: [Description]
Emotion: [Description]

{styleAppendix}

**Scene Requirements & STRICT ORDER (Very Important):**
You must generate one prompt for each of the following scenes in this exact sequence:

1.  **Scene 1:** The character is driving.
    - The main action line for the prompt MUST be EXACTLY: \`POV, eye-level view angle, picture from girlfriend, Passenger seat perspective side view, featuring (character name) driving a BMW, hands on the steering wheel.\`
    - The Environment MUST be EXACTLY: \`side road slight blurry speed\`
    - The Emotion MUST be EXACTLY: \`closed mouth smile to the camera\`

2.  **Scene 2:** The character is opening the passenger door.
    - The main action line for the prompt MUST be EXACTLY: \`POV from passenger seat, featuring (character name) outside of the car, through the passenger windows the passenger door\`
    - The Environment MUST be \`{dateEnvironment}\`.
    - The Emotion MUST be EXACTLY: \`Candide smile to the camera\`

3.  **Scene 3:** They are drinking a beverage within the specified date environment (\`{dateEnvironment}\`).
4.  **Scene 4:** A close-up on the character's face as he laughs softly but sincerely. The environment is \`{dateEnvironment}\`.
5.  **Scene 5:** The character is walking next to his partner (the photographer), with his hands in his pockets, seen from a side view. The environment is \`{dateEnvironment}\`.
6.  **Scene 6:** The character is in a relaxed, "chill" position within the \`{dateEnvironment}\`.
7.  **Scene 7:** The character is walking, seen from a frontal view, in the \`{dateEnvironment}\`.
8.  **Scene 8:** The character is walking just ahead of his partner (the photographer), who is holding his hand. He is looking back slightly and smiling. The environment is \`{dateEnvironment}\`.
9.  **Scene 9 (Final Scene):** An "establishing shot" of the \`{dateEnvironment}\` ONLY, without any people, to capture the mood of the date.

Additional rules for the entire list:
- Do not give specific details about the character's face in the scene description, but use the "Emotion" line for facial expressions.
- No topless scenes.
- No other people's faces (except the partner's hand in scene 8).
- Do not include the scene number in the title.`
  },
  sceneGenerationCouple: {
    model: 'gemini-2.5-flash',
    prompt: `You are an AI assistant that generates a JSON object containing a list of 9 photorealistic couple-themed image prompts.
For each prompt, you will generate a 'scene' (a short, descriptive title with a relevant emoji) and a 'prompt' (the full image generation prompt).

- Each of the 9 prompts must be based on one of the unique activities from the list provided below.
- The goal is to create scenes featuring the main character and a companion character engaging in couple activities.

Activities to use:
{selectedActivities}

For the 'prompt' field of EACH of the 9 items, construct it using the following multi-line structure:

Smartphone picture of (character name) and his partner, (doing the activity)

Environment: [Describe a coherent environment based on the character's living place and the activity]
Outfit: [Describe a coherent outfit for the scene for both characters, based on their styles]
Emotion: [Describe a varied but coherent emotion for both characters based on the activity and their personalities]

{styleAppendix}

Additional rules for the entire list:
- Do not give specific details about the characters' faces in the scene description, but use the "Emotion" line for facial expressions.
- No topless scenes.
- Do not include the scene number in the title.`
  },
  variations: {
    model: 'gemini-2.5-flash',
    prompt: `You are an AI assistant for generating creative variations of an image prompt.
Given the original prompt below, generate a JSON array of 3 new, distinct, and creative variations.

- Each variation should be a complete, self-contained prompt.
- Maintain the core subject and multi-line structure of the original.
- Alter elements like camera angle, lighting, environment details, emotion, or time of day to create unique results.
- Do not change the aspect ratio.

Original Prompt:
{originalPrompt}`
  },
  reimagine: {
    model: 'gemini-2.5-flash',
    prompt: `You are an AI assistant that generates a single photorealistic image prompt as a JSON object with 'scene' and 'prompt' keys.
The goal is to create a new scene for a character based on a new activity.

Character Name: {characterName}
Character Personality: {personality}
Character Style: {style}
New Activity: {newActivity}

{modeContext}

For the 'prompt' field, construct it using the following multi-line structure. **If the context above says not to describe an outfit, OMIT the 'Outfit' line entirely.**

Smartphone picture of (character name), (doing the new activity)

Environment: [Describe a coherent environment based on the character's living place and the new activity. Adhere to the context if provided.]
Outfit: [Describe a coherent outfit for the scene based on the character's style. Omit this line if instructed by the context.]
Emotion: [Describe a coherent emotion based on the new activity and the character's personality]

{styleAppendix}

For the 'scene' field, create a very short, descriptive title (max 5 words) with a relevant emoji.
Do not include other people's faces. No topless scenes.`
  },
  motion: {
    model: 'gemini-2.5-flash',
    prompt: `You are an AI assistant that creates a short, descriptive video prompt based on a static image prompt. The video prompt should describe a subtle, brief action that brings the scene to life.

Rules:
- The output must be a single, concise sentence.
- It should describe a simple, realistic motion.
- It must not introduce new characters or radically change the scene.
- Focus on what the character is doing or what is happening in the environment.

Image Prompt:
{imagePrompt}

Video Prompt:`
  }
};

export const getPrompts = (): Record<PromptKey, PromptConfig> => {
  try {
    const stored = localStorage.getItem(PROMPTS_STORAGE_KEY);
    if (stored) {
      const storedPrompts = JSON.parse(stored);
      // Merge stored prompts with defaults to handle new prompts being added
      return { ...defaultPrompts, ...storedPrompts };
    }
  } catch (e) {
    console.error("Failed to load prompts from localStorage", e);
  }
  return defaultPrompts;
};

export const savePrompts = (prompts: Record<PromptKey, PromptConfig>) => {
  try {
    localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(prompts));
  } catch (e) {
    console.error("Failed to save prompts to localStorage", e);
  }
};

export const resetPrompts = (): Record<PromptKey, PromptConfig> => {
  try {
    localStorage.removeItem(PROMPTS_STORAGE_KEY);
  } catch(e) {
     console.error("Failed to remove prompts from localStorage", e);
  }
  return defaultPrompts;
};

export const getPromptConfig = (key: PromptKey): PromptConfig => {
    return getPrompts()[key];
};