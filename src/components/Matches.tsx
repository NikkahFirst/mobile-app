import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient"; 
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Phone, User as UserIcon, Heart, Clock, Mail, Eye, EyeOff, ArrowRight } from "lucide-react";
import { getUserMatches, hidePhotosFromMatch, unhidePhotosFromMatch } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProfileData } from "@/types/photo";

interface Match {
  id: string;
  created_at: string;
  status: string;
  user_one: ProfileData;
  user_two: ProfileData;
  photos_hidden: boolean;
}

interface MatchesProps {
  limit?: number;
  onViewProfile?: (profile: Tables<"profiles">) => void;
  showInactive?: boolean;
}

const isOnlineThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds
const Matches = ({ limit, onViewProfile, showInactive = false }: MatchesProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeMatches, setActiveMatches] = useState<Match[]>([]);
  const [inactiveMatches, setInactiveMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [hidePhotosId, setHidePhotosId] = useState<string | null>(null);
  const [showHidePhotosDialog, setShowHidePhotosDialog] = useState(false);

  useEffect(() => {
    fetchMatches();
  }, [user, limit]);

  const fetchMatches = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await getUserMatches();

if (error) {
  console.error("Error fetching matches:", error);
  toast({
    title: "Error",
    description: "Failed to load matches. Please try again.",
    variant: "destructive",
  });
} else if (data) {
  console.log("Matches data:", data);

  const activeMatches = (data as unknown as Match[]).filter(match => match.status === 'active');
  const inactiveMatches = (data as unknown as Match[]).filter(match => match.status === 'inactive');

  const mapSignedPhotos = async (matches: Match[]) => {
    return await Promise.all(
      matches.map(async (match) => {
        const otherUser = match.user_one.id === user.id ? match.user_two : match.user_one;

        if (otherUser.photos && otherUser.photos.length > 0) {
          const { data: signedData, error: signedError } = await supabase
            .storage
            .from('profile-pictures')
            .createSignedUrl(otherUser.photos[0], 60 * 60);

          if (signedData?.signedUrl) {
            otherUser.signedPhotoUrl = signedData.signedUrl;
          } else {
            console.error("Error signing photo URL:", signedError?.message);
          }
        }

        return match;
      })
    );
  };

  const signedActiveMatches = await mapSignedPhotos(activeMatches);
  const signedInactiveMatches = await mapSignedPhotos(inactiveMatches);

  let activeMatchesData = signedActiveMatches;
  if (limit && activeMatchesData.length > limit) {
    activeMatchesData = activeMatchesData.slice(0, limit);
  }

  setActiveMatches(activeMatchesData);
  setInactiveMatches(signedInactiveMatches);
}
} catch (error) {
  console.error("Exception when fetching matches:", error);
  toast({
    title: "Error",
    description: "An unexpected error occurred. Please try again.",
    variant: "destructive",
  });
} finally {
  setLoading(false);
}}


  const getOtherUser = (match: Match) => {
    if (!user) return null;
    return match.user_one.id === user.id ? match.user_two : match.user_one;
  };

  const handleContactWali = (name: string, contact: string) => {
    const phoneNumber = contact.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=As-salamu%20alaykum,%20I%20am%20contacting%20you%20regarding%20${name}'s%20profile%20on%20NikkahFirst.`;
    window.open(whatsappUrl, '_blank');
  };

  const handleContactWaliEmail = (name: string, email: string) => {
    const mailtoUrl = `mailto:${email}?subject=Regarding%20${name}'s%20Profile%20on%20NikkahFirst&body=As-salamu%20alaykum,%0A%0AI%20am%20contacting%20you%20regarding%20${name}'s%20profile%20on%20NikkahFirst.%0A%0AJazakAllah%20Khair.`;
    window.location.href = mailtoUrl;
  };

  const handleViewFullProfile = (profileId: string) => {
    navigate(`/profile/${profileId}`);
  };

  const handleHidePhotos = async () => {
    if (!hidePhotosId) return;
    
    try {
      const { error, data } = await hidePhotosFromMatch(hidePhotosId);
      
      if (error) {
        console.error("Error hiding photos:", error);
        toast({
          title: "Error",
          description: "Failed to hide photos. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Your photos are now hidden from this match.",
        });
        
        setActiveMatches(prev => prev.map(match => {
          if (match.id === hidePhotosId) {
            return { ...match, photos_hidden: true };
          }
          return match;
        }));
      }
    } catch (error) {
      console.error("Exception when hiding photos:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setHidePhotosId(null);
      setShowHidePhotosDialog(false);
    }
  };

  const handleUnhidePhotos = async (matchId: string) => {
    try {
      const { error, data } = await unhidePhotosFromMatch(matchId);
      
      if (error) {
        console.error("Error unhiding photos:", error);
        toast({
          title: "Error",
          description: "Failed to unhide photos. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Your photos are now visible to this match.",
        });
        
        setActiveMatches(prev => prev.map(match => {
          if (match.id === matchId) {
            return { ...match, photos_hidden: false };
          }
          return match;
        }));
      }
    } catch (error) {
      console.error("Exception when unhiding photos:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const confirmHidePhotos = (matchId: string) => {
    setHidePhotosId(matchId);
    setShowHidePhotosDialog(true);
  };

  const getOnlineStatus = (lastSeen: string | null | undefined) => {
    if (!lastSeen) return null;
    
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const timeDifference = now.getTime() - lastSeenDate.getTime();
    
    if (timeDifference < isOnlineThreshold) {
      return { status: 'online', text: 'Online Now' };
    } else {
      return { 
        status: 'offline', 
        text: `Last seen ${formatDistanceToNow(lastSeenDate, { addSuffix: true })}`
      };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-nikkah-pink"></div>
      </div>
    );
  }

  const matchesToDisplay = showInactive ? inactiveMatches : activeMatches;

  if (matchesToDisplay.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">
          {showInactive 
            ? "You have no previous matches." 
            : "You have no active matches yet."
          }
        </p>
        <Button 
          className="mt-4 bg-nikkah-pink hover:bg-nikkah-pink/90"
          onClick={() => {
            const searchButton = document.querySelector('[data-tab="search"]');
            if (searchButton) {
              (searchButton as HTMLButtonElement).click();
            }
          }}
        >
          Start Searching
        </Button>
      </div>
    );
  }

  const isFemale = user?.user_metadata?.gender === 'female';

  return (
    <>
      <div className="space-y-4">
        {showInactive && (
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-1">Previous Matches</h3>
            <p className="text-gray-500 text-sm">These are people you've previously matched with.</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matchesToDisplay.map((match) => {
            const otherUser = getOtherUser(match);
            if (!otherUser) return null;
            
            const isMale = user?.user_metadata?.gender === 'male';
            const hasWaliInfo = otherUser.wali_name && otherUser.wali_phone;
            const hasWaliEmail = otherUser.wali_email && otherUser.wali_email.trim() !== '';
            const onlineStatus = getOnlineStatus(otherUser.last_seen);
            
            const isFemale = user?.user_metadata?.gender === 'female';
            const shouldBlurPhotos = isFemale ? false : match.photos_hidden;

            
            return (
              <Card key={match.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-square overflow-hidden bg-gray-100 flex items-center justify-center relative">
                  {otherUser.photos && otherUser.photos.length > 0 ? (
                    <img 
  src={otherUser.signedPhotoUrl || "/default-user.png"} 
  alt={`${otherUser.first_name || "Anonymous"}`} 
  className={`w-full h-full object-cover ${shouldBlurPhotos ? 'blur-xl' : ''}`} 
/>

                  ) : (
                    <UserIcon className="h-16 w-16 text-gray-400" />
                  )}
                  
                  {onlineStatus && !showInactive && (
                    <div className="absolute top-2 right-2">
                      <Badge className={`px-2 py-1 text-xs ${
                        onlineStatus.status === 'online' 
                          ? 'bg-green-500' 
                          : 'bg-gray-500'
                      }`}>
                        {onlineStatus.status === 'online' ? (
                          <span className="flex items-center">
                            <span className="h-2 w-2 rounded-full bg-white mr-1 animate-pulse"></span>
                            {onlineStatus.text}
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {onlineStatus.text}
                          </span>
                        )}
                      </Badge>
                    </div>
                  )}
                  
                  {showInactive && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="inactive">
                        Previously matched
                      </Badge>
                    </div>
                  )}
                  
                  {!showInactive && match.photos_hidden && isFemale && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/30">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Photos Hidden
                      </Badge>
                    </div>
                  )}
                  
                  {shouldBlurPhotos && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/40 p-2 rounded-lg text-white text-xs">
                        <p>Photos Hidden</p>
                      </div>
                    </div>
                  )}
                </div>
                <CardContent className="p-5">
                  <div className="mb-2">
                    <h3 className="font-semibold text-lg">{otherUser.first_name || 'Anonymous'}</h3>
                    <p className="text-gray-600 text-sm">{otherUser.country || 'Location not specified'}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {showInactive ? 'Previously matched on ' : 'Matched on '}
                      {new Date(match.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    {!showInactive && isMale && hasWaliInfo && (
                      <div className="p-3 bg-green-50 rounded-md mb-3 border border-green-100">
                        <h4 className="font-medium text-green-800">Wali Contact Information</h4>
                        <p className="text-sm text-green-700">Name: {otherUser.wali_name}</p>
                        <p className="text-sm text-green-700 break-all">Contact: {otherUser.wali_phone}</p>
                        {hasWaliEmail && (
                          <p className="text-sm text-green-700 break-all">Email: {otherUser.wali_email}</p>
                        )}
                      </div>
                    )}
                    
                    {!showInactive && isMale && hasWaliInfo && (
  <div className="mt-4 bg-white border border-green-200 rounded-lg p-4 shadow-sm">
    <h4 className="font-semibold text-green-700 mb-3">Contact Wali</h4>

    <div className="flex flex-col gap-3">
      <Button
        onClick={() =>
          handleContactWali(
            otherUser.first_name || "this person",
            otherUser.wali_phone || ""
          )
        }
        className="flex items-center justify-center bg-green-500 hover:bg-green-600 text-white shadow-md transition-all duration-200"
      >
        <svg
          className="h-5 w-5 mr-2 fill-white"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
        >
          <path d="M16 0C7.177 0 0 7.177 0 16c0 2.821.729 5.472 2.005 7.782L0 32l8.461-2.164C11.165 31.271 13.527 32 16 32c8.823 0 16-7.177 16-16S24.823 0 16 0zm9.684 22.682c-.406 1.141-2.374 2.234-3.305 2.326-.838.084-1.898.121-3.067-.188-.699-.182-1.589-.519-2.746-1.031-4.846-2.103-8.007-7.223-8.258-7.576-.25-.354-1.969-2.619-1.969-4.994s1.241-3.54 1.684-4.014c.44-.474 1.21-.685 1.61-.685.398 0 .8.004 1.145.021.373.02.867-.066 1.363.96.53 1.09 1.664 3.619 1.804 3.878.142.258.236.559.048.913-.188.354-.281.57-.563.886-.278.316-.593.708-.845.95-.278.274-.569.574-.25 1.127.317.553 1.408 2.312 3.02 3.745 2.08 1.813 3.835 2.365 4.388 2.633.554.268.872.224 1.21-.138.338-.363 1.391-1.6 1.766-2.145.374-.544.788-.452 1.33-.27.543.183 3.43 1.616 3.992 1.909.564.293.938.437 1.078.685.138.25.138 1.318-.268 2.459z" />
        </svg>
        WhatsApp Wali
      </Button>

      {hasWaliEmail && (
        <Button
          onClick={() =>
            handleContactWaliEmail(
              otherUser.first_name || "this person",
              otherUser.wali_email || ""
            )
          }
          variant="outline"
          className="flex items-center justify-center text-nikkah-blue border-nikkah-blue hover:bg-nikkah-blue/10 transition-all duration-200"
        >
          <Mail className="mr-2 h-5 w-5 text-nikkah-blue" />
          Email Wali
        </Button>
      )}
    </div>
  </div>
)}
                    
                    {!showInactive && isMale && !hasWaliInfo && (
                      <div className="p-3 bg-yellow-50 rounded-md mb-3 border border-yellow-100">
                        <p className="text-sm text-yellow-700">Wali contact information is not available. Please contact support for assistance.</p>
                      </div>
                    )}
                    
                    {!showInactive && !isMale && (
                      <div className="p-3 bg-blue-50 rounded-md mb-3 border border-blue-100">
                        <p className="text-sm text-blue-700">The brother will contact your guardian soon. Your guardian has been notified.</p>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full justify-center"
                        onClick={() => handleViewFullProfile(otherUser.id)}
                      >
                        <User className="mr-2 h-4 w-4 text-nikkah-blue" />
                        View Profile
                      </Button>
                      
                      {!showInactive && isFemale && (
                        match.photos_hidden ? (
                          <Button 
                            variant="outline" 
                            className="w-full justify-center text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => handleUnhidePhotos(match.id)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Show My Photos
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            className="w-full justify-center text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => confirmHidePhotos(match.id)}
                          >
                            <EyeOff className="mr-2 h-4 w-4" />
                            Hide My Photos
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      
      <AlertDialog open={showHidePhotosDialog} onOpenChange={setShowHidePhotosDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Hide Photos</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to hide your photos from this match? They will no longer be able to see your photos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setHidePhotosId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleHidePhotos} className="bg-blue-500 hover:bg-blue-600">
              Hide Photos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Matches;
