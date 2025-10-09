import { supabase } from '@/integrations/supabase/client';

// Get authenticated user ID
export const getUserId = async (): Promise<string> => {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('User not authenticated');
  }
  
  return user.id;
};

// Save history item to database
export const saveHistoryItem = async (historyItem: any) => {
  const userId = await getUserId();
  
  try {
    const { error } = await supabase
      .from('user_history')
      .upsert({
        auth_user_id: userId,
        user_id: userId, // Keep for backwards compatibility
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
  const userId = await getUserId();
  
  try {
    const { data, error } = await supabase
      .from('user_history')
      .select('*')
      .eq('auth_user_id', userId)
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
  const userId = await getUserId();
  
  try {
    const { error } = await supabase
      .from('user_history')
      .delete()
      .eq('auth_user_id', userId)
      .eq('image_id', imageId);

    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Failed to delete history item from database:', error);
    return false;
  }
};
