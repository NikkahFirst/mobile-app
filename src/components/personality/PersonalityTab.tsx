
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import PersonalityQuiz from "@/components/personality/PersonalityQuiz";
import PersonalityResults from "@/components/personality/PersonalityResults";
import PersonalityMatch from "@/components/personality/PersonalityMatch";
import PersonalityOnboarding from "@/components/personality/PersonalityOnboarding";
import FreemiumPersonalityBlock from "@/components/personality/FreemiumPersonalityBlock";
import { Loader } from "lucide-react";
import { Card } from "@/components/ui/card";
import { checkIsFreemium } from "@/utils/freemiumUtils";

interface PersonalityTabProps {
  onPersonalityUpdate?: () => void;
}

const PersonalityTab = ({ onPersonalityUpdate }: PersonalityTabProps) => {
  const { user } = useAuth();
  const [results, setResults] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isFreemium, setIsFreemium] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const checkUserStatus = async () => {
      setLoading(true);
      
      // Check if user is freemium
      const { data: profile } = await supabase
        .from('profiles')
        .select('gender, subscription_status')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        const userIsFreemium = checkIsFreemium(profile.gender, profile.subscription_status);
        setIsFreemium(userIsFreemium);
        
        // If freemium, don't load personality data
        if (userIsFreemium) {
          setLoading(false);
          return;
        }
      }
      
      // Load personality results for non-freemium users
      const { data, error } = await supabase
        .from("personality_results")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        setResults(null);
        // Show onboarding for first-time users
        setShowOnboarding(true);
        setLoading(false);
        return;
      }

      const { data: typeDetails } = await supabase
        .from("personality_types")
        .select("*")
        .eq("type_code", data.type_code)
        .single();

      setResults({
        ...data,
        islamic_name: typeDetails?.islamic_name,
        description: typeDetails?.description,
      });
      setLoading(false);
    };

    checkUserStatus();
  }, [user]);

  const handleComplete = (newResults: any) => {
    setResults(newResults);
    setShowQuiz(false);
    // Notify parent component that personality has been updated
    if (onPersonalityUpdate) {
      onPersonalityUpdate();
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setShowQuiz(true);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader className="h-6 w-6 animate-spin text-nikkah-pink" />
      </div>
    );
  }

  // Show freemium block for freemium users
  if (isFreemium) {
    return <FreemiumPersonalityBlock />;
  }

  // Show personality content for subscribed users and females
  return (
    <div className="p-4 space-y-6">
      {/* Intro Card */}
      <Card className="bg-gradient-to-r from-pink-50 to-blue-50 p-6 shadow-sm rounded-xl">
        <h2 className="text-xl md:text-2xl font-semibold mb-1">AI Personality Matching</h2>
        <p className="text-sm text-muted-foreground">
          Discover your Islamic personality type and find your perfect match.
        </p>
      </Card>

      {/* Content based on state */}
      {showOnboarding ? (
        <PersonalityOnboarding onComplete={handleOnboardingComplete} />
      ) : showQuiz || !results ? (
        <PersonalityQuiz onComplete={handleComplete} />
      ) : (
        <>
          <PersonalityResults
            results={results}
            onRetake={() => {
              setShowOnboarding(true);
            }}
          />
          {/* Match Finder */}
          <PersonalityMatch onPersonalityUpdate={onPersonalityUpdate} />
        </>
      )}
    </div>
  );
};

export default PersonalityTab;
