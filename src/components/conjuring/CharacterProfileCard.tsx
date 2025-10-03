import React from 'react';
import type { CharacterProfile } from '@/types/conjuring';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FilePenLine } from 'lucide-react';

interface CharacterProfileCardProps {
  profile: CharacterProfile;
  onEdit: () => void;
}

export const CharacterProfileCard: React.FC<CharacterProfileCardProps> = ({ profile, onEdit }) => {
  return (
    <Card className="bg-zinc-950/50 border-zinc-800 animate-fade-in h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-2xl text-zinc-100">{profile.name}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit Profile">
            <FilePenLine className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 flex-grow">
        <div>
          <h3 className="font-semibold text-zinc-400 text-sm uppercase tracking-wider">Personality</h3>
          <p className="text-zinc-50 mt-1">{profile.personality}</p>
        </div>
        <div>
          <h3 className="font-semibold text-zinc-400 text-sm uppercase tracking-wider">Backstory</h3>
          <p className="text-zinc-50 mt-1">{profile.backstory}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
                <h3 className="font-semibold text-zinc-400 text-sm uppercase tracking-wider">Living Place</h3>
                <p className="text-zinc-50 mt-1">{profile.livingPlace}</p>
            </div>
            <div>
                <h3 className="font-semibold text-zinc-400 text-sm uppercase tracking-wider">Style</h3>
                <p className="text-zinc-50 mt-1">{profile.style}</p>
            </div>
        </div>
      </CardContent>
    </Card>
  );
};
