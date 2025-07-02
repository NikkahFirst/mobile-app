
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, MapPin, Calendar, Heart, X, Check, Crown } from "lucide-react";
import { ProcessedProfile } from "@/types/photo";
import CompatibilityExplanation from "./CompatibilityExplanation";
import UpgradeDialog from "../UpgradeDialog";
import { useAuth } from "@/context/AuthContext";

interface MatchPresentationProps {
  match: ProcessedProfile;
  onAccept: () => void;
  onDecline: () => void;
  requestSent?: boolean;
  userPersonalityType?: string;
}

const MatchPresentation = ({ 
  match, 
  onAccept, 
  onDecline,
  requestSent = false,
  userPersonalityType
}: MatchPresentationProps) => {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { user } = useAuth();

  // Check if current user is on freemium plan
  const isFreemium = user?.user_metadata?.gender === 'male' && 
                    user?.user_metadata?.subscription_status !== 'active';

  const handleAccept = () => {
    if (isFreemium) {
      setShowUpgradeDialog(true);
      return;
    }
    onAccept();
  };

  return (
    <>
      <Card className="w-full max-w-md mx-auto overflow-hidden">
        <div className="aspect-square overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
          <div className="text-center space-y-4">
            <User className="h-16 w-16 text-gray-400 mx-auto" />
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Photos hidden for privacy
              </p>
              <p className="text-xs text-gray-500">
                Photos will be revealed after both users accept the match
              </p>
            </div>
          </div>
          
          {match.personality_compatibility && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-nikkah-pink text-white">
                {match.personality_compatibility}% Compatible
              </Badge>
            </div>
          )}
        </div>
        
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-semibold text-xl mb-2">
                {match.display_name || match.first_name || 'Anonymous'}
              </h3>
              <p className="text-sm text-muted-foreground">
                A potential match has been found for you
              </p>
            </div>
            
            <div className="space-y-3">
              {match.age && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-2" />
                  {match.age} years old
                </div>
              )}
              
              {match.country && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-2" />
                  {match.country}
                </div>
              )}

              {match.personality_compatibility && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Heart className="h-4 w-4 mr-2" />
                  {match.personality_compatibility}% personality compatibility
                </div>
              )}
            </div>

            {/* Add compatibility explanation if we have the personality types */}
            {userPersonalityType && match.personality_type && (
              <CompatibilityExplanation
                userPersonalityType={userPersonalityType}
                matchPersonalityType={match.personality_type}
                compatibilityScore={match.personality_compatibility || 50}
              />
            )}

            <div className="pt-4 border-t">
              {requestSent ? (
                <div className="text-center space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <Check className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-green-800 font-medium">Request Sent!</p>
                    <p className="text-green-600 text-sm mt-1">
                      Your match request has been sent. You'll be notified if they accept.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs text-center text-muted-foreground mb-4">
                    Would you like to connect with this person?
                  </p>
                  
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={onDecline}
                      className="flex-1"
                      size="lg"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Decline
                    </Button>
                    <Button
                      onClick={handleAccept}
                      className="flex-1 bg-nikkah-pink hover:bg-nikkah-pink/90"
                      size="lg"
                    >
                      {isFreemium ? (
                        <Crown className="mr-2 h-4 w-4" />
                      ) : (
                        <Check className="mr-2 h-4 w-4" />
                      )}
                      {isFreemium ? 'Upgrade to Accept' : 'Accept'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <UpgradeDialog 
        open={showUpgradeDialog} 
        onOpenChange={setShowUpgradeDialog}
        feature="accept match requests"
      />
    </>
  );
};

export default MatchPresentation;
