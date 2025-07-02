import { useState, useEffect } from "react";
import { getSavedProfiles, unsaveProfile, shouldPhotosBeVisible } from "@/integrations/supabase/client";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Heart, Eye } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { useIsMobile } from "@/hooks/use-mobile";

type Profile = Tables<"profiles">;

interface SavedProfilesProps {
  inDashboard?: boolean;
  onViewProfile?: (profile: Profile) => void;
}

const SavedProfiles = ({ inDashboard = false, onViewProfile }: SavedProfilesProps) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isUserFemale = user?.user_metadata?.gender === 'female';
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchSavedProfiles();
  }, []);

  const fetchSavedProfiles = async () => {
    const { data, error } = await getSavedProfiles();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load saved profiles",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (data) {
      const profilesWithVisibility = await Promise.all(
        data.map(async (item: any) => {
          const profile = item.profiles;
          let signedPhotoUrl = null;
          let photosVisible = false;

          if (profile.photos && profile.photos.length > 0) {
            const filePath = profile.photos[0].replace("https://utzulhprsfbyaxjzmxmk.supabase.co/storage/v1/object/public/profile-pictures/", "");
            const { data: signed, error: signedError } = await supabase
              .storage
              .from('profile-pictures')
              .createSignedUrl(filePath, 60 * 60);

            if (!signedError) {
              signedPhotoUrl = signed?.signedUrl;
            }
          }

          if (user?.user_metadata?.gender === "female" && profile.gender === "male") {
            photosVisible = true;
          } else {
            const { visible } = await shouldPhotosBeVisible(profile.id);
            photosVisible = visible;
          }

          return { ...profile, signedPhotoUrl, photosVisible };
        })
      );

      setProfiles(profilesWithVisibility);
    }

    setLoading(false);
  };

  const handleUnsave = async (profileId: string) => {
    const { error } = await unsaveProfile(profileId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to unsave profile",
        variant: "destructive",
      });
    } else {
      setProfiles(profiles.filter(p => p.id !== profileId));
      toast({
        title: "Success",
        description: "Profile removed from saved profiles",
      });
    }
  };

  const handleViewProfile = (profile: Profile) => {
    if (onViewProfile) {
      onViewProfile(profile);
    } else {
      navigate(`/dashboard/profile/${profile.id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-nikkah-pink"></div>
      </div>
    );
  }

  const container = inDashboard ? "" : "container py-8 px-4 md:px-8";

  return (
    <div className={container}>
      {profiles.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">You haven't saved any profiles yet.</p>
          <Button 
            className="mt-4 bg-nikkah-pink hover:bg-nikkah-pink/90" 
            onClick={() => {
              if (inDashboard) {
                const searchButton = document.querySelector('[data-tab="search"]');
                if (searchButton) {
                  (searchButton as HTMLButtonElement).click();
                }
              } else {
                navigate('/dashboard?tab=search');
              }
            }}
          >
            Start Searching
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((profile) => (
            <Card key={profile.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-square overflow-hidden bg-gray-100 flex items-center justify-center">
                {profile.photos && profile.photos.length > 0 ? (
                  <div className="w-full h-full relative">
                    <img 
                      src={profile.signedPhotoUrl || '/default-placeholder.jpg'} 
                      alt={`${profile.first_name}`} 
                      className={`w-full h-full object-cover ${!profile.photosVisible ? 'blur-xl' : ''}`} 
                    />
                    {!profile.photosVisible && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black/40 p-4 rounded-lg text-white">
                          <Eye className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm">Photos Hidden</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <User className="h-16 w-16 text-gray-400" />
                )}
              </div>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{profile.first_name || 'Anonymous'}</h3>
                </div>
                <p className="text-gray-600 text-sm mb-4">{profile.country || 'Location not specified'}</p>
                <div className="space-y-2">
                  <Button 
                    variant="default" 
                    className="w-full bg-nikkah-pink hover:bg-nikkah-pink/90"
                    onClick={() => handleViewProfile(profile)}
                  >
                    View Profile
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleUnsave(profile.id)}
                  >
                    <Heart className="mr-2 h-4 w-4" />
                    Unsave
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedProfiles;
