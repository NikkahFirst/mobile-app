
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, MapPin, Users, Calendar, Heart, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

interface SearchStage {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  active: boolean;
  progress: number;
  failureReason?: string;
  visible: boolean;
}

interface MatchSearchProgressProps {
  onCancel: () => void;
  searchCriteria: {
    country: string;
    ethnicities: string[];
    minAge: number;
    maxAge: number;
  };
  onSearchComplete?: (result: 'found' | 'no_matches', reason?: string) => void;
}

const MatchSearchProgress = ({ 
  onCancel, 
  searchCriteria, 
  onSearchComplete 
}: MatchSearchProgressProps) => {
  const { user } = useAuth();
  const [currentStage, setCurrentStage] = useState(0);
  const [searchFailed, setSearchFailed] = useState(false);
  const [failureReason, setFailureReason] = useState<string>('');
  const [actualMatchFound, setActualMatchFound] = useState(false);
  const [stages, setStages] = useState<SearchStage[]>([
    {
      id: "exact-preferences",
      title: "Searching exact preferences",
      description: `Looking in ${searchCriteria.country || 'your preferred location'} for ${searchCriteria.ethnicities.join(', ') || 'your preferred ethnicities'}, ages ${searchCriteria.minAge}-${searchCriteria.maxAge}`,
      icon: <MapPin className="h-4 w-4" />,
      completed: false,
      active: true,
      progress: 0,
      visible: true
    },
    {
      id: "expand-location",
      title: "Expanding search area",
      description: "Checking nearby countries and regions",
      icon: <Users className="h-4 w-4" />,
      completed: false,
      active: false,
      progress: 0,
      visible: false
    },
    {
      id: "broaden-criteria",
      title: "Broadening age and ethnicity",
      description: "Expanding age range and including more ethnicities",
      icon: <Calendar className="h-4 w-4" />,
      completed: false,
      active: false,
      progress: 0,
      visible: false
    },
    {
      id: "personality-compatibility",
      title: "Finding personality matches",
      description: "Analyzing personality compatibility with available profiles",
      icon: <Heart className="h-4 w-4" />,
      completed: false,
      active: false,
      progress: 0,
      visible: false
    }
  ]);

  const performActualSearch = useCallback(async (stageIndex: number): Promise<{ found: boolean; count: number; reason?: string }> => {
    if (!user) return { found: false, count: 0, reason: "User not authenticated" };

    try {
      // Get user's gender for opposite gender matching
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('gender, looking_for_age_min, looking_for_age_max, looking_for_country, looking_for_ethnicity, open_to_all_countries, open_to_all_ethnicities')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      const oppositeGender = userProfile.gender === 'male' ? 'female' : 'male';
      
      let searchParams = {
        user_id: user.id,
        opposite_gender: oppositeGender,
        min_age: userProfile.looking_for_age_min || 18,
        max_age: userProfile.looking_for_age_max || 65,
        countries: userProfile.looking_for_country || [],
        ethnicities: userProfile.looking_for_ethnicity || [],
        open_to_all_countries: userProfile.open_to_all_countries || false,
        open_to_all_ethnicities: userProfile.open_to_all_ethnicities || false
      };

      // Modify search criteria based on stage
      switch (stageIndex) {
        case 0: // Exact preferences
          break;
        case 1: // Expand location
          searchParams.open_to_all_countries = true;
          break;
        case 2: // Broaden criteria
          searchParams.open_to_all_countries = true;
          searchParams.open_to_all_ethnicities = true;
          searchParams.min_age = Math.max(18, searchParams.min_age - 5);
          searchParams.max_age = Math.min(65, searchParams.max_age + 5);
          break;
        case 3: // Final personality search
          searchParams.open_to_all_countries = true;
          searchParams.open_to_all_ethnicities = true;
          searchParams.min_age = 18;
          searchParams.max_age = 65;
          break;
      }

      const { data: matchData, error: matchError } = await supabase
        .rpc('find_personality_match', searchParams);

      if (matchError) throw matchError;

      const matchCount = matchData?.length || 0;
      
      if (matchCount > 0) {
        return { found: true, count: matchCount };
      } else {
        let reason = "";
        switch (stageIndex) {
          case 0:
            reason = `No matches in ${searchParams.countries.join(', ') || 'your area'} with exact preferences`;
            break;
          case 1:
            reason = "No matches found in expanded search area";
            break;
          case 2:
            reason = "No matches found with broader criteria";
            break;
          case 3:
            reason = "No personality-compatible matches found in database";
            break;
        }
        return { found: false, count: 0, reason };
      }
    } catch (error) {
      console.error('Search error:', error);
      return { found: false, count: 0, reason: "Search error occurred" };
    }
  }, [user]);

  const handleSearchComplete = useCallback((result: 'found' | 'no_matches', reason?: string) => {
    // Use setTimeout to avoid calling setState during render
    setTimeout(() => {
      if (onSearchComplete) {
        onSearchComplete(result, reason);
      }
    }, 0);
  }, [onSearchComplete]);

  useEffect(() => {
    if (searchFailed || actualMatchFound) return;

    const searchTimer = setInterval(() => {
      setStages(prev => {
        const newStages = [...prev];
        const activeStage = newStages[currentStage];
        
        if (activeStage && !activeStage.completed) {
          activeStage.progress = Math.min(activeStage.progress + Math.random() * 20 + 10, 100);
          
          if (activeStage.progress >= 100) {
            activeStage.completed = true;
            activeStage.active = false;
            
            // Perform actual search when stage completes
            performActualSearch(currentStage).then(searchResult => {
              if (searchResult.found) {
                setActualMatchFound(true);
                handleSearchComplete('found');
              } else if (currentStage < newStages.length - 1) {
                // Move to next stage
                setTimeout(() => {
                  setStages(prevStages => {
                    const updatedStages = [...prevStages];
                    updatedStages[currentStage + 1].active = true;
                    updatedStages[currentStage + 1].visible = true;
                    return updatedStages;
                  });
                  setCurrentStage(prev => prev + 1);
                }, 500);
              } else {
                // All stages failed
                setSearchFailed(true);
                setFailureReason(searchResult.reason || 'No matches found with any criteria');
                handleSearchComplete('no_matches', searchResult.reason);
              }
            });
          }
        }
        
        return newStages;
      });
    }, 300);

    return () => clearInterval(searchTimer);
  }, [currentStage, searchFailed, actualMatchFound, performActualSearch, handleSearchComplete]);

  const overallProgress = stages.reduce((acc, stage) => acc + (stage.visible ? stage.progress : 0), 0) / 
    (stages.filter(stage => stage.visible).length * 100) * 100;

  const restartSearch = () => {
    setSearchFailed(false);
    setActualMatchFound(false);
    setCurrentStage(0);
    setFailureReason('');
    setStages(stages.map((stage, index) => ({
      ...stage,
      completed: false,
      active: index === 0,
      progress: 0,
      visible: index === 0
    })));
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Finding Your Match</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {searchFailed ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-orange-800 mb-1">No matches found</p>
                <p className="text-xs text-orange-700">{failureReason}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={onCancel}
                className="flex-1"
              >
                Update Preferences
              </Button>
              <Button 
                onClick={restartSearch}
                className="flex-1 bg-nikkah-pink hover:bg-nikkah-pink/90"
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>

            <div className="space-y-4">
              {stages.filter(stage => stage.visible).map((stage, index) => (
                <div key={stage.id} className="space-y-2 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full transition-colors ${
                      stage.completed 
                        ? 'bg-green-100 text-green-600' 
                        : stage.active 
                          ? 'bg-nikkah-pink/20 text-nikkah-pink' 
                          : 'bg-gray-100 text-gray-400'
                    }`}>
                      {stage.icon}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${
                        stage.active ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {stage.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {stage.description}
                      </p>
                    </div>
                    <div className="text-xs">
                      {stage.completed ? (
                        <span className="text-green-600 font-medium">✓</span>
                      ) : stage.active ? (
                        <span className="text-nikkah-pink font-medium">
                          {Math.round(stage.progress)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </div>
                  
                  {stage.active && !stage.completed && (
                    <div className="ml-11">
                      <Progress value={stage.progress} className="h-1" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-center text-muted-foreground">
                Searching through profiles with completed personality assessments for optimal compatibility.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MatchSearchProgress;
