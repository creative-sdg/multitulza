import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CharacterProfile } from '@/types/conjuring';
import { getArchetypes } from '@/services/conjuring/archetypeService';

interface CharacterProfileEditorModalProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  profile: CharacterProfile | null;
  onSave: (updatedProfile: CharacterProfile) => void;
}

export const CharacterProfileEditorModal: React.FC<CharacterProfileEditorModalProps> = ({ open, onOpenChange, profile, onSave }) => {
  const [editedProfile, setEditedProfile] = useState<CharacterProfile | null>(profile);
  const [archetypes, setArchetypes] = useState<string[]>([]);
  const [isCustomStyle, setIsCustomStyle] = useState(false);

  useEffect(() => {
    if (open && profile) {
      setEditedProfile(profile);
      const currentArchetypes = getArchetypes();
      setArchetypes(currentArchetypes);
      setIsCustomStyle(!currentArchetypes.includes(profile.style));
    }
  }, [open, profile]);

  const handleChange = (field: keyof CharacterProfile, value: string) => {
    if (editedProfile) {
      setEditedProfile({ ...editedProfile, [field]: value });
    }
  };

  const handleSave = () => {
    if (editedProfile) {
      onSave(editedProfile);
    }
  };

  const switchToArchetypeList = () => {
      setIsCustomStyle(false);
      // If the current style isn't a valid archetype, switch to the first one.
      if (archetypes.length > 0 && !archetypes.includes(editedProfile?.style || '')) {
          handleChange('style', archetypes[0]);
      }
  };

  if (!open || !editedProfile) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Character Profile</DialogTitle>
          <DialogDescription>
            Make manual changes to the generated character profile.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={editedProfile.name} onChange={(e) => handleChange('name', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="personality">Personality</Label>
            <Textarea id="personality" value={editedProfile.personality} onChange={(e) => handleChange('personality', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="backstory">Backstory</Label>
            <Textarea id="backstory" value={editedProfile.backstory} onChange={(e) => handleChange('backstory', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="livingPlace">Living Place</Label>
            <Input id="livingPlace" value={editedProfile.livingPlace} onChange={(e) => handleChange('livingPlace', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="style">Style</Label>
            {isCustomStyle ? (
                <div className="flex items-center gap-2 mt-1">
                    <Input
                        id="style"
                        value={editedProfile.style}
                        onChange={(e) => handleChange('style', e.target.value)}
                        placeholder="Enter custom style"
                    />
                    <Button variant="outline" size="sm" onClick={switchToArchetypeList}>List</Button>
                </div>
            ) : (
                <div className="flex items-center gap-2 mt-1">
                    <select
                      id="style"
                      value={editedProfile.style}
                      onChange={(e) => handleChange('style', e.target.value)}
                      className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm ring-offset-black placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {archetypes.map(archetype => (
                        <option key={archetype} value={archetype}>{archetype}</option>
                      ))}
                    </select>
                    <Button variant="outline" size="sm" onClick={() => setIsCustomStyle(true)}>Custom</Button>
                </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
