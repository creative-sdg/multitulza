import { supabase } from '@/integrations/supabase/client';

// Get or create a unique user ID for this browser
export const getUserId = (): string => {
  let userId = localStorage.getItem('conjuring-user-id');
  
  if (!userId) {
    // Generate a unique ID based on timestamp and random value
    userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('conjuring-user-id', userId);
  }
  
  return userId;
};

// Save history item to database
export const saveHistoryItem = async (historyItem: any) => {
  const userId = getUserId();
  
  try {
    const { error } = await supabase
      .from('user_history')
      .upsert({
        user_id: userId,
        image_id: historyItem.imageId,
        character_profile: historyItem.characterProfile,
        image_prompts: historyItem.imagePrompts,
        generation_mode: historyItem.generationMode,
        generation_style: historyItem.generationStyle,
        timestamp: historyItem.timestamp,
      }, {
        onConflict: 'image_id'
      });

    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Failed to save history item to database:', error);
    return false;
  }
};

// Load history from database
export const loadHistoryFromDatabase = async () => {
  const userId = getUserId();
  
  try {
    const { data, error } = await supabase
      .from('user_history')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    
    if (data) {
      return data.map(item => ({
        id: item.image_id,
        imageId: item.image_id,
        characterProfile: item.character_profile,
        imagePrompts: item.image_prompts,
        generationMode: item.generation_mode,
        generationStyle: item.generation_style,
        timestamp: item.timestamp,
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Failed to load history from database:', error);
    return [];
  }
};

// Delete history item from database
export const deleteHistoryItem = async (imageId: string) => {
  const userId = getUserId();
  
  try {
    const { error } = await supabase
      .from('user_history')
      .delete()
      .eq('user_id', userId)
      .eq('image_id', imageId);

    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Failed to delete history item from database:', error);
    return false;
  }
};
