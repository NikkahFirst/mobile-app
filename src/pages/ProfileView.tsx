import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getProfileById, checkIfAlreadyRequested, getUserMatches, shouldPhotosBeVisible } from "@/integrations/supabase/client";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import ProfileViewComponent from "@/components/ProfileView";
import { Button } from "@/components/ui/button";
import { ChevronLeft, X, UserCheck, Heart, Maximize, Minimize } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getEthnicityFlag } from '@/lib/ethnicityFlags';
import { checkFreemiumViewLimit, incrementFreemiumDailyViews } from "@/integrations/supabase/client";
import FreemiumViewBanner from "@/components/FreemiumViewBanner";
import FreemiumViewLimitDialog from "@/components/FreemiumViewLimitDialog";

const ProfileView = () => {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [theyRequestedMe, setTheyRequestedMe] = useState(false);
  const [signedPhotoUrl, setSignedPhotoUrl] = useState<string | null>(null);
  const [isMatched, setIsMatched] = useState(false);
  const [isInactiveMatch, setIsInactiveMatch] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [photosVisible, setPhotosVisible] = useState(false);
  const [matchPhotoSettings, setMatchPhotoSettings] = useState<{ photos_hidden: boolean }>({ photos_hidden: false });
  const [showViewLimitDialog, setShowViewLimitDialog] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (id) {
      checkViewLimitAndFetchProfile(id);
    }
  }, [id]);

  const checkViewLimitAndFetchProfile = async (profileId: string) => {
    try {
      const { canView } = await checkFreemiumViewLimit();
      
      if (!canView) {
        setShowViewLimitDialog(true);
        setLoading(false);
        return;
      }
      
      // If can view, increment the count and fetch profile
      await incrementFreemiumDailyViews(profileId);
      fetchProfile(profileId);
      checkIfMatched(profileId);
      checkPhotoVisibility(profileId);
    } catch (error) {
      console.error("Error checking view limit:", error);
      // Fallback to normal fetch if there's an error
      fetchProfile(profileId);
      checkIfMatched(profileId);
      checkPhotoVisibility(profileId);
    }
  };

  const checkIfMatched = async (profileId: string) => {
    try {
      const { data, error } = await getUserMatches();
      
      if (!error && data && data.length > 0) {
        const matchWithUser = data.find((match: any) => 
          (match.user_one?.id === profileId || match.user_two?.id === profileId)
        );
        
        if (matchWithUser) {
          if (matchWithUser.status === 'active') {
            setIsMatched(true);
            setIsInactiveMatch(false);
            setMatchPhotoSettings({ photos_hidden: matchWithUser.photos_hidden });
          } else if (matchWithUser.status === 'inactive') {
            setIsMatched(false);
            setIsInactiveMatch(true);
          }
          setMatchId(matchWithUser.id);
        } else {
          setIsMatched(false);
          setIsInactiveMatch(false);
          setMatchId(null);
        }
      } else {
        setIsMatched(false);
        setIsInactiveMatch(false);
        setMatchId(null);
      }
    } catch (error) {
      console.error("Error checking match status:", error);
    }
  };

  const checkPhotoVisibility = async (profileId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('gender')
        .eq('id', sessionData.session?.user.id)
        .single();
      
      const { data: viewedProfile } = await supabase
        .from('profiles')
        .select('gender')
        .eq('id', profileId)
        .single();
      
      if (userProfile?.gender === 'female' && viewedProfile?.gender === 'male') {
        setPhotosVisible(true);
        return;
      }
      
      const { visible } = await shouldPhotosBeVisible(profileId);
      
      if (isMatched && matchPhotoSettings.photos_hidden) {
        setPhotosVisible(false);
      } else {
        setPhotosVisible(visible);
      }
      
      const { data, error } = await checkIfAlreadyRequested(profileId, undefined, true);
      if (!error && data && data.length > 0) {
        setTheyRequestedMe(true);
      }
    } catch (error) {
      console.error("Error checking photo visibility:", error);
      setPhotosVisible(false);
    }
  };

  const fetchProfile = async (profileId: string) => {
    try {
      console.log("Fetching profile for ID:", profileId);
      const { data: profile, error } = await getProfileById(profileId);
      
      if (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive",
        });
        navigate("/dashboard");
      } else if (profile) {
        console.log("Profile data loaded:", profile);

        // Ensure profile has a display_name property set to Anonymous if not provided
        if (!profile.display_name && !profile.first_name) {
          profile.display_name = "Anonymous";
        }
        
        setProfile(profile);
        if (profile.photos && profile.photos.length > 0) {
  const { data, error } = await supabase
    .storage
    .from('profile-pictures') // ✅ your correct storage bucket
    .createSignedUrl(profile.photos[0], 60 * 60); // 1 hour expiry

  if (data?.signedUrl) {
    setSignedPhotoUrl(data.signedUrl);
  } else {
    console.error("Error creating signed URL for main photo:", error?.message);
  }
}
      } else {
        console.error("Profile not found for ID:", profileId);
        toast({
          title: "Not Found",
          description: "Profile not found",
          variant: "destructive",
        });
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Exception when fetching profile:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = () => {
    window.history.back();
  };

  const handlePhotoClick = (photoUrl: string) => {
    if (photosVisible) {
      setExpandedPhoto(photoUrl);
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-nikkah-pink"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="ghost"
          onClick={handleBackClick}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        {theyRequestedMe && !isMatched && !isInactiveMatch && (
          <Badge variant="outline" className="bg-nikkah-pink/10 text-nikkah-pink border-nikkah-pink/30 flex items-center">
            <UserCheck className="h-3 w-3 mr-1" />
            <span>This person has requested you</span>
          </Badge>
        )}
        
        {isMatched && (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 flex items-center">
            <UserCheck className="h-3 w-3 mr-1" />
            <span>You are matched with this person</span>
          </Badge>
        )}
        
        {isInactiveMatch && (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30 flex items-center">
            <UserCheck className="h-3 w-3 mr-1" />
            <span>Previously matched</span>
          </Badge>
        )}
      </div>

      <FreemiumViewBanner />
      
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/3 mb-6 md:mb-0">
          <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100">
            <div className="aspect-square bg-gray-100 relative">
              {profile?.photos && profile.photos.length > 0 ? (
                <div className="relative w-full h-full">
                  <img
                    src={signedPhotoUrl || ''}
                    alt={profile.display_name || "Anonymous"}
                    className={`w-full h-full object-cover cursor-pointer ${photosVisible ? '' : 'blur-xl'}`}
                    onClick={() => handlePhotoClick(signedPhotoUrl || '')}
                  />

                  {!photosVisible && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/40 p-2 rounded-lg text-white text-xs">
                        <p>Photos Hidden</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="p-4 rounded-full bg-gray-200">
                    <div className="text-4xl text-gray-500">
                      {(profile?.display_name || profile?.first_name || "Anonymous").charAt(0)}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-5">
              {/* We have removed the unmatch button as requested */}
            </div>
          </div>
        </div>
        
        <div className="w-full md:w-2/3">
          {profile && (
            <ProfileViewComponent
              profile={profile}
              onPhotoClick={handlePhotoClick}
              isOwnProfile={false}
              viewOnly={isMatched}
              photosVisible={photosVisible}
            />
          )}
        </div>
      </div>

      <Dialog open={!!expandedPhoto} onOpenChange={(open) => !open && setExpandedPhoto(null)}>
        <DialogContent className="sm:max-w-[85vw] max-h-[90vh] p-0 overflow-hidden bg-transparent border-none shadow-none">
          <div className="relative w-full h-full flex items-center justify-center" onClick={() => setExpandedPhoto(null)}>
            <img 
              src={expandedPhoto || ''} 
              alt="Expanded photo" 
              className={`max-w-full max-h-[85vh] object-contain rounded-lg shadow-xl ${photosVisible ? '' : 'blur-xl'}`}
              onClick={(e) => e.stopPropagation()}
            />
            <Button 
              className="absolute top-2 right-2 rounded-full h-8 w-8 p-0 bg-black/50 hover:bg-black/70"
              variant="ghost"
              onClick={() => setExpandedPhoto(null)}
            >
              <X className="h-4 w-4 text-white" />
            </Button>
            {photosVisible && (
              <Button
                className="absolute bottom-2 right-2 rounded-full h-8 w-8 p-0 bg-black/50 hover:bg-black/70"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedPhoto(null);
                }}
              >
                <Minimize className="h-4 w-4 text-white" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <FreemiumViewLimitDialog 
        open={showViewLimitDialog} 
        onOpenChange={setShowViewLimitDialog} 
      />
    </div>
  );
};

export default ProfileView;
