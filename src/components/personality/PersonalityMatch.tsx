import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Heart, Search, RefreshCw, Clock, HelpCircle } from "lucide-react";
import { processProfilePhotos } from "@/utils/photoUtils";
import { ProcessedProfile } from "@/types/photo";
import MatchSearchProgress from "./MatchSearchProgress";
import MatchPresentation from "./MatchPresentation";
import DeclineConfirmationDialog from "./DeclineConfirmationDialog";
import PersonalityOnboarding from "./PersonalityOnboarding";
import { MobileNotification } from "@/components/ui/mobile-notification";

type SearchState = 'idle' | 'searching' | 'found' | 'no_matches' | 'cancelled' | 'request_sent' | 'limit_reached';

interface PersonalityMatchProps {
  onPersonalityUpdate?: () => void;
}

const PersonalityMatch = ({ onPersonalityUpdate }: PersonalityMatchProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [currentMatch, setCurrentMatch] = useState<ProcessedProfile | null>(null);
  const [userPersonalityType, setUserPersonalityType] = useState<string | null>(null);
  const [searchCriteria, setSearchCriteria] = useState({
    country: '',
    ethnicities: [],
    minAge: 18,
    maxAge: 65
  });
  const [searchFailureReason, setSearchFailureReason] = useState<string>('');
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [showMobileNotification, setShowMobileNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [dailySearchCount, setDailySearchCount] = useState<number>(0);
  const [searchLimit] = useState<number>(2);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHelpOnboarding, setShowHelpOnboarding] = useState(false);

  useEffect(() => {
    checkUserPersonalityType();
    loadUserPreferences();
    checkDailySearchLimit();
  }, [user]);

  // Restore search state on page load
  useEffect(() => {
    const savedSearchState = localStorage.getItem('personality_search_state');
    if (savedSearchState) {
      const parsed = JSON.parse(savedSearchState);
      if (parsed.userId === user?.id && parsed.state === 'searching') {
        setSearchState('searching');
        // Continue the search process
        setTimeout(() => {
          performSearch();
        }, 1000);
      }
    }
  }, [user]);

  // Save search state changes
  useEffect(() => {
    if (searchState === 'searching' && user) {
      localStorage.setItem('personality_search_state', JSON.stringify({
        userId: user.id,
        state: searchState,
        timestamp: Date.now()
      }));
    } else {
      localStorage.removeItem('personality_search_state');
    }
  }, [searchState, user]);

  const checkUserPersonalityType = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('personality_results')
        .select('type_code')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setUserPersonalityType(data?.type_code || null);
    } catch (error) {
      console.error('Error checking personality type:', error);
    }
  };

  const loadUserPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('country, looking_for_ethnicity, looking_for_age_min, looking_for_age_max')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setSearchCriteria({
          country: data.country || '',
          ethnicities: data.looking_for_ethnicity || [],
          minAge: data.looking_for_age_min || 18,
          maxAge: data.looking_for_age_max || 65
        });
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  const checkDailySearchLimit = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('personality_search_limits')
        .select('search_count')
        .eq('user_id', user.id)
        .eq('search_date', today)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const currentCount = data?.search_count || 0;
      setDailySearchCount(currentCount);
      
      if (currentCount >= searchLimit) {
        setSearchState('limit_reached');
      }
    } catch (error) {
      console.error('Error checking daily search limit:', error);
    }
  };

  const incrementSearchCount = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Try to update existing record
      const { data: existingData } = await supabase
        .from('personality_search_limits')
        .select('*')
        .eq('user_id', user.id)
        .eq('search_date', today)
        .single();

      if (existingData) {
        // Update existing record
        const { error } = await supabase
          .from('personality_search_limits')
          .update({ search_count: existingData.search_count + 1 })
          .eq('id', existingData.id);

        if (error) throw error;
        setDailySearchCount(existingData.search_count + 1);
      } else {
        // Create new record
        const { error } = await supabase
          .from('personality_search_limits')
          .insert({
            user_id: user.id,
            search_date: today,
            search_count: 1
          });

        if (error) throw error;
        setDailySearchCount(1);
      }
    } catch (error) {
      console.error('Error incrementing search count:', error);
    }
  };

  const startSearch = async () => {
    if (dailySearchCount >= searchLimit) {
      setSearchState('limit_reached');
      return;
    }

    setSearchState('searching');
    setCurrentMatch(null);
    setSearchFailureReason('');
    
    // Increment the search count
    await incrementSearchCount();
  };

  const handleSearchComplete = (result: 'found' | 'no_matches', reason?: string) => {
    if (result === 'found') {
      performSearch();
    } else {
      setSearchState('no_matches');
      setSearchFailureReason(reason || 'No matches found');
    }
  };

  const performSearch = async () => {
    if (!user || !userPersonalityType) return;

    try {
      // Get user's gender for opposite gender matching
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('gender, looking_for_age_min, looking_for_age_max, looking_for_country, looking_for_ethnicity, open_to_all_countries, open_to_all_ethnicities')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      const oppositeGender = userProfile.gender === 'male' ? 'female' : 'male';
      
      // Use the database function to find ONE personality match
      const { data: matchData, error: matchError } = await supabase
        .rpc('find_personality_match', {
          user_id: user.id,
          opposite_gender: oppositeGender,
          min_age: userProfile.looking_for_age_min || 18,
          max_age: userProfile.looking_for_age_max || 65,
          countries: userProfile.looking_for_country || [],
          ethnicities: userProfile.looking_for_ethnicity || [],
          open_to_all_countries: userProfile.open_to_all_countries || false,
          open_to_all_ethnicities: userProfile.open_to_all_ethnicities || false
        });

      if (matchError) throw matchError;

      if (matchData && matchData.length > 0) {
        // Take only the first match
        const match = matchData[0];
        const processedMatch = await processProfilePhotos(match);
        
        // Get the match's personality type
        const { data: matchPersonality } = await supabase
          .from('personality_results')
          .select('type_code')
          .eq('user_id', match.id)
          .single();
        
        setCurrentMatch({
          ...processedMatch,
          first_name: match.first_name,
          last_name: match.last_name,
          display_name: match.display_name,
          age: match.age,
          personality_compatibility: match.personality_compatibility,
          personality_type: matchPersonality?.type_code,
          country: match.country || 'Not specified'
        });
        setSearchState('found');
      } else {
        setSearchState('no_matches');
        setSearchFailureReason('No compatible matches found. Try expanding your preferences.');
      }
    } catch (error) {
      console.error('Error finding personality matches:', error);
      toast({
        title: "Error finding matches",
        description: "Please try again later.",
        variant: "destructive",
      });
      setSearchState('idle');
    }
  };

  const handleAccept = async () => {
    if (!currentMatch || !user) return;

    try {
      // Send match request
      const { error } = await supabase
        .from('match_requests')
        .insert({
          requester_id: user.id,
          requested_id: currentMatch.id,
          personality_compatibility: currentMatch.personality_compatibility || 50
        });

      if (error) throw error;

      // Set state to show success message
      setSearchState('request_sent');
      
      // Call the update callback when a successful action occurs
      if (onPersonalityUpdate) {
        onPersonalityUpdate();
      }
    } catch (error) {
      console.error('Error sending match request:', error);
      toast({
        title: "Error sending request",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleDecline = () => {
    setShowDeclineDialog(true);
  };

  const confirmDecline = async () => {
    if (!currentMatch || !user) return;

    try {
      // Store the decline in the database (you may need to create this table)
      // For now, we'll just go back to idle state
      
      // Show mobile notification
      setNotificationMessage(`You will never see ${currentMatch.display_name || currentMatch.first_name || 'this profile'} again`);
      setShowMobileNotification(true);
      
      // Close dialog and go back to idle
      setShowDeclineDialog(false);
      setSearchState('idle');
      setCurrentMatch(null);
      
    } catch (error) {
      console.error('Error storing decline:', error);
      toast({
        title: "Error declining match",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setSearchState('cancelled');
    setTimeout(() => {
      setSearchState('idle');
    }, 1000);
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setShowHelpOnboarding(false);
  };

  if (!userPersonalityType) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-nikkah-pink" />
            Personality Matching
          </CardTitle>
          <CardDescription>
            Complete the personality quiz to find compatible matches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            You need to complete the personality quiz before you can find personality-based matches.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (searchState === 'searching') {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <MatchSearchProgress 
          onCancel={handleCancel}
          searchCriteria={searchCriteria}
          onSearchComplete={handleSearchComplete}
        />
      </div>
    );
  }

  if ((searchState === 'found' || searchState === 'request_sent') && currentMatch) {
    return (
      <>
        <div className="flex justify-center items-center min-h-[500px]">
          <MatchPresentation
            match={currentMatch}
            onAccept={handleAccept}
            onDecline={handleDecline}
            requestSent={searchState === 'request_sent'}
            userPersonalityType={userPersonalityType}
          />
        </div>
        
        <DeclineConfirmationDialog
          open={showDeclineDialog}
          onOpenChange={setShowDeclineDialog}
          onConfirm={confirmDecline}
          profileName={currentMatch?.display_name || currentMatch?.first_name || 'this profile'}
        />
        
        <MobileNotification
          message={notificationMessage}
          visible={showMobileNotification}
          onClose={() => setShowMobileNotification(false)}
          variant="default"
        />
      </>
    );
  }

  // Show onboarding if requested
  if (showOnboarding || showHelpOnboarding) {
    return (
      <PersonalityOnboarding
        onComplete={handleOnboardingComplete}
        isHelpMode={showHelpOnboarding}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-nikkah-pink" />
              <div>
                <CardTitle>Personality Matching</CardTitle>
                <CardDescription>
                  Find a compatible match based on personality compatibility (Your type: {userPersonalityType})
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelpOnboarding(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Daily search limit info */}
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-800">Daily Search Limit</p>
              </div>
              <p className="text-xs text-blue-600">
                {dailySearchCount}/{searchLimit} searches used today. Resets at midnight.
              </p>
            </div>

            <Button
              onClick={startSearch}
              disabled={searchState !== 'idle' || dailySearchCount >= searchLimit}
              className="w-full bg-nikkah-pink hover:bg-nikkah-pink/90"
              size="lg"
            >
              <Search className="mr-2 h-4 w-4" />
              Find Compatible Match
            </Button>
            
            {searchState === 'limit_reached' && (
              <div className="text-center py-8 space-y-4">
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-orange-800 font-medium">Daily Limit Reached</p>
                  <p className="text-orange-600 text-sm mt-1">
                    You've used all {searchLimit} personality searches for today. Come back tomorrow for more!
                  </p>
                </div>
              </div>
            )}
            
            {searchState === 'no_matches' && (
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">
                  {searchFailureReason}
                </p>
                <Button
                  onClick={startSearch}
                  variant="outline"
                  className="flex items-center gap-2"
                  disabled={dailySearchCount >= searchLimit}
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              </div>
            )}

            {searchState === 'cancelled' && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  Search cancelled. You can start a new search anytime.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PersonalityMatch;
