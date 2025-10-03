import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RotateCcw } from 'lucide-react';
import { getPrompts, savePrompts, resetPrompts, PromptKey, PromptConfig, UGC_STYLE_APPENDIX, CINEMATIC_STYLE_APPENDIX } from '@/services/conjuring/promptService';
import { getActivities, saveActivities, resetActivities, getAactivityCounts, saveActivityCounts, resetActivityCounts } from '@/services/conjuring/activityService';
import type { ActivityLists, ActivityCategory, ActivityCounts } from '@/types/conjuring';
import { cn } from '@/lib/utils';
import { saveGeminiApiKey } from '@/services/conjuring/geminiService';
import { saveFalApiKey } from '@/services/conjuring/falService';
import { getArchetypes, saveArchetypes, resetArchetypes } from '@/services/conjuring/archetypeService';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const PROMPT_DETAILS: Record<PromptKey, { title: string; description: string; }> = {
    sceneGeneration: {
        title: 'Scene Generation Prompt (Normal Mode)',
        description: 'This instruction is given to the AI to generate the initial diverse scene ideas based on the character profile. It uses placeholders like {totalScenes}, {sceneGenerationRequirements} and {activityLists}.'
    },
    sceneGenerationSelfie: {
        title: 'Scene Generation Prompt (Selfie Mode)',
        description: 'Generates scenes from a selfie perspective. Uses the {activityLists} placeholder for selfie activities.'
    },
    sceneGenerationRomantic: {
        title: 'Scene Generation Prompt (Romantic Mode)',
        description: 'Generates romantic scenes from a female POV. Uses the {activityLists} placeholder for romantic activities.'
    },
    sceneGenerationDate: {
        title: 'Scene Generation Prompt (Date Mode)',
        description: 'Generates a coherent romantic date from a female POV, with the same outfit in all scenes. Uses the {activityLists} placeholder.'
    },
    sceneGenerationCouple: {
        title: 'Scene Generation Prompt (Couple Mode)',
        description: 'Generates scenes featuring the character with a partner, based on couple activities. Uses the {activityLists} placeholder.'
    },
    variations: {
        title: 'Prompt Variations Prompt',
        description: 'Used in the Creation page to generate 3 creative variations of a single prompt. It uses the {originalPrompt} placeholder.'
    },
    reimagine: {
        title: 'Reimagine Scene Prompt',
        description: 'Used to generate a new prompt for a scene based on the character and a new activity. Uses {characterName}, {personality}, and {newActivity} placeholders.'
    },
    motion: {
        title: 'Motion (Video) Prompt',
        description: 'This instruction tells the AI how to create a short, descriptive video prompt from a static image prompt. It uses the {imagePrompt} placeholder.'
    }
};


export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onOpenChange }) => {
  const [prompts, setPrompts] = useState<Record<PromptKey, PromptConfig>>(getPrompts());
  const [activities, setActivities] = useState<ActivityLists>(getActivities());
  const [activityCounts, setActivityCounts] = useState<ActivityCounts>(getAactivityCounts());
  const [archetypesText, setArchetypesText] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [falApiKey, setFalApiKey] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [activeTab, setActiveTab] = useState<'apiKeys' | 'prompts' | 'activities' | 'archetypes'>('apiKeys');

  useEffect(() => {
    if (open) {
      setPrompts(getPrompts());
      setActivities(getActivities());
      setActivityCounts(getAactivityCounts());
      setArchetypesText(getArchetypes().join('\n'));
      setSaveStatus('idle');
      
      const storedGeminiKey = localStorage.getItem('gemini-api-key') || '';
      const storedFalKey = localStorage.getItem('fal-api-key') || '';
      setGeminiApiKey(storedGeminiKey);
      setFalApiKey(storedFalKey);

      if (!storedGeminiKey || !storedFalKey) {
        setActiveTab('apiKeys');
      } else {
        setActiveTab('prompts');
      }
    }
  }, [open]);

  const handleSave = () => {
    saveGeminiApiKey(geminiApiKey);
    saveFalApiKey(falApiKey);
    savePrompts(prompts);

    // Clean up activities before saving: trim and remove empty lines.
    const cleanedActivities: Partial<ActivityLists> = {};
    for (const key of Object.keys(activities)) {
        const category = key as ActivityCategory;
        cleanedActivities[category] = activities[category]
            .map(s => s.trim())
            .filter(Boolean);
    }
    saveActivities(cleanedActivities as ActivityLists);
    saveActivityCounts(activityCounts);
    saveArchetypes(archetypesText.split('\n'));

    setSaveStatus('saved');
    setTimeout(() => {
        setSaveStatus('idle');
        onOpenChange(false);
    }, 1500);
  };
  
  const handleResetPrompts = () => {
      const defaultPrompts = resetPrompts();
      setPrompts(defaultPrompts);
  };
  
  const handlePromptChange = (key: PromptKey, value: string) => {
    setPrompts(prev => ({ ...prev, [key]: { ...prev[key], prompt: value } }));
  };

  const handleModelChange = (key: PromptKey, value: 'gemini-2.5-flash') => {
    setPrompts(prev => ({ ...prev, [key]: { ...prev[key], model: value } }));
  };
  
  const handleResetActivities = () => {
    const defaultActivities = resetActivities();
    setActivities(defaultActivities);
    const defaultCounts = resetActivityCounts();
    setActivityCounts(defaultCounts);
  };
  
  const handleActivityListChange = (category: ActivityCategory, value: string) => {
    setActivities(prev => ({
      ...prev,
      [category]: value.split('\n')
    }));
  };
  
  const handleActivityCountChange = (category: ActivityCategory, value: number) => {
    if (isNaN(value) || value < 0) return;
    setActivityCounts(prev => ({
      ...prev,
      [category]: value
    }));
  };
  
  const handleResetArchetypes = () => {
    const defaultArchetypes = resetArchetypes();
    setArchetypesText(defaultArchetypes.join('\n'));
  };

  const TabButton: React.FC<{ tabName: 'apiKeys' | 'prompts' | 'activities' | 'archetypes'; children: React.ReactNode; }> = ({ tabName, children }) => (
    <Button
      variant={activeTab === tabName ? 'secondary' : 'ghost'}
      onClick={() => setActiveTab(tabName)}
      className="w-full justify-start"
    >
      {children}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your API keys and customize the generation prompts.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-grow min-h-0">
          <div className="md:col-span-1 flex flex-col gap-2">
            <TabButton tabName="apiKeys">API Keys</TabButton>
            <TabButton tabName="prompts">Prompts</TabButton>
            <TabButton tabName="activities">Activities</TabButton>
            <TabButton tabName="archetypes">Archetypes</TabButton>
          </div>
          <div className="md:col-span-3 overflow-y-auto pr-4 space-y-6">
            {activeTab === 'apiKeys' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-100">API Keys</h3>
                  <p className="text-sm text-zinc-400 mb-4">
                    Your API keys are stored securely in your browser's local storage and are never sent to our servers.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="gemini-key">Gemini API Key</Label>
                      <Input
                        id="gemini-key"
                        type="password"
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        placeholder="Enter your Gemini API key"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fal-key">Fal.ai API Key</Label>
                      <Input
                        id="fal-key"
                        type="password"
                        value={falApiKey}
                        onChange={(e) => setFalApiKey(e.target.value)}
                        placeholder="Enter your Fal.ai API key"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'prompts' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-zinc-100">Prompt Templates</h3>
                    <Button onClick={handleResetPrompts} variant="outline" size="sm">
                        <RotateCcw className="w-4 h-4 mr-2"/>
                        Reset All Prompts
                    </Button>
                </div>

                <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                    <h3 className="text-lg font-semibold text-zinc-100">Style Appendices</h3>
                    <p className="text-sm text-zinc-400 mb-4">
                        The <code>{'{styleAppendix}'}</code> placeholder in the scene generation prompts will be replaced by one of these blocks, depending on your selection on the main page.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label className="font-semibold text-zinc-300">UGC Style</Label>
                            <pre className="mt-1 text-xs p-3 bg-zinc-950 rounded-md whitespace-pre-wrap font-mono text-zinc-400 h-64 overflow-y-auto">
                                {UGC_STYLE_APPENDIX}
                            </pre>
                        </div>
                        <div>
                            <Label className="font-semibold text-zinc-300">Cinematic Style</Label>
                            <pre className="mt-1 text-xs p-3 bg-zinc-950 rounded-md whitespace-pre-wrap font-mono text-zinc-400 h-64 overflow-y-auto">
                                {CINEMATIC_STYLE_APPENDIX}
                            </pre>
                        </div>
                    </div>
                </div>

                {(Object.keys(prompts) as PromptKey[]).map(key => (
                  <div key={key}>
                    <h4 className="text-lg font-semibold text-zinc-100">{PROMPT_DETAILS[key].title}</h4>
                    <p className="text-sm text-zinc-400 mb-2">{PROMPT_DETAILS[key].description}</p>
                    <Label htmlFor={`prompt-${key}`} className="sr-only">Prompt</Label>
                    <Textarea
                      id={`prompt-${key}`}
                      value={prompts[key].prompt}
                      onChange={(e) => handlePromptChange(key, e.target.value)}
                      className="min-h-[120px]"
                    />
                    <div className="mt-2">
                      <Label htmlFor={`model-${key}`}>Model</Label>
                      <select
                        id={`model-${key}`}
                        value={prompts[key].model}
                        onChange={(e) => handleModelChange(key, e.target.value as 'gemini-2.5-flash')}
                        className="flex h-10 w-full mt-1 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm ring-offset-black placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'activities' && (
               <div className="space-y-6">
                 <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-zinc-100">Activity Lists</h3>
                        <p className="text-sm text-zinc-400">Customize the activities used for scene generation. Each line is one activity.</p>
                    </div>
                    <Button onClick={handleResetActivities} variant="outline" size="sm">
                        <RotateCcw className="w-4 h-4 mr-2"/>
                        Reset Defaults
                    </Button>
                </div>
                {(Object.keys(activities) as ActivityCategory[]).map(category => (
                    <div key={category}>
                        <div className="flex justify-between items-baseline mb-1">
                            <Label htmlFor={`activities-${category}`} className="font-semibold text-zinc-300">{category}</Label>
                            <div className="flex items-center gap-2">
                                <Label htmlFor={`count-${category}`} className="text-sm text-zinc-400">Number to use:</Label>
                                <Input
                                    id={`count-${category}`}
                                    type="number"
                                    min="0"
                                    value={activityCounts[category] ?? 0}
                                    onChange={(e) => handleActivityCountChange(category, parseInt(e.target.value, 10))}
                                    className="w-20 h-8"
                                />
                            </div>
                        </div>
                        <Textarea
                          id={`activities-${category}`}
                          value={activities[category].join('\n')}
                          onChange={(e) => handleActivityListChange(category, e.target.value)}
                          className="min-h-[150px]"
                        />
                    </div>
                ))}
               </div>
            )}
            {activeTab === 'archetypes' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-semibold text-zinc-100">Archetype List</h3>
                            <p className="text-sm text-zinc-400">Customize the styles used for character generation. Each line is one archetype.</p>
                        </div>
                        <Button onClick={handleResetArchetypes} variant="outline" size="sm">
                            <RotateCcw className="w-4 h-4 mr-2"/>
                            Reset Defaults
                        </Button>
                    </div>
                    <div>
                        <Label htmlFor="archetypes-list" className="font-semibold text-zinc-300">Archetypes</Label>
                        <Textarea
                            id="archetypes-list"
                            value={archetypesText}
                            onChange={(e) => setArchetypesText(e.target.value)}
                            className="min-h-[250px] mt-1"
                        />
                    </div>
                </div>
            )}
          </div>
        </div>
        <DialogFooter className="pt-4 border-t border-zinc-800">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} className={cn(
            saveStatus === 'saved' && 'bg-green-600 hover:bg-green-700'
          )}>
            {saveStatus === 'saved' ? 'Saved!' : 'Save & Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
