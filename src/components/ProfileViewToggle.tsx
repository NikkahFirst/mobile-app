
import React from 'react';
import { Button } from "@/components/ui/button";
import { Grid2X2, List } from "lucide-react";

interface ProfileViewToggleProps {
  currentView: 'grid' | 'list';
  onToggleView: (view: 'grid' | 'list') => void;
}

const ProfileViewToggle: React.FC<ProfileViewToggleProps> = ({ 
  currentView, 
  onToggleView 
}) => {
  return (
    <div className="flex space-x-2 items-center">
      <Button
        variant={currentView === 'grid' ? 'nikkah' : 'outline'}
        size="sm"
        onClick={() => onToggleView('grid')}
        className="flex items-center gap-2"
      >
        <Grid2X2 className="h-4 w-4" />
        <span className="hidden sm:inline">Grid</span>
      </Button>
      <Button
        variant={currentView === 'list' ? 'nikkah' : 'outline'}
        size="sm"
        onClick={() => onToggleView('list')}
        className="flex items-center gap-2"
      >
        <List className="h-4 w-4" />
        <span className="hidden sm:inline">List</span>
      </Button>
    </div>
  );
};

export default ProfileViewToggle;
