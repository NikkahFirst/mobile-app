
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import NavBar from "@/components/NavBar";
import { getProfileById, getSignedPhotoUrl } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ProfileCV from "@/components/ProfileCV";
import { 
  Dialog, 
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Minimize, ChevronLeft } from "lucide-react";
import ProfileView from "@/components/ProfileView";

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [signedPhotoUrl, setSignedPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // Scroll to the top of the page when component mounts
    window.scrollTo(0, 0);
    
    if (user?.id) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await getProfileById(user.id);
      
      if (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error",
          description: "Failed to load your profile information",
          variant: "destructive",
        });
      } else if (data) {
        // Ensure display_name is set if not provided
        if (!data.display_name && !data.first_name) {
          data.display_name = "Anonymous";
        }
        setProfile(data);

        if (data.photos && data.photos.length > 0) {
          const signedUrl = await getSignedPhotoUrl(data.photos[0]);
          setSignedPhotoUrl(signedUrl);
        } else {
          setSignedPhotoUrl(null);
        }
      } else {
        toast({
          title: "Profile Not Found",
          description: "We couldn't find your profile information",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Exception fetching profile:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const handlePhotoClick = (photoUrl: string) => {
    setExpandedPhoto(photoUrl);
  };

  const handleProfileUpdated = () => {
    // Refresh profile data after updates
    fetchProfileData();
    window.dispatchEvent(new Event("photoUploaded")); // <-- Add this line
    setIsEditing(false);
  };

  const toggleEditMode = () => {
    if (isEditing) {
      // Refresh profile data when switching back to view mode
      fetchProfileData();
    }
    setIsEditing(!isEditing);
  };

  if (loading) {
    return (
      <>
        <NavBar />
        <div className="container py-8">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-nikkah-pink"></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <div className="container py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/3 mb-6 md:mb-0">
            <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100">
              <div className="aspect-square bg-gray-100 relative">
                {profile?.photos && profile.photos.length > 0 ? (
                  <div className="relative w-full h-full">
                    <img
                      src={signedPhotoUrl || profile.photos[0]}
                      alt={profile.display_name || "Anonymous"}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => handlePhotoClick(signedPhotoUrl || profile.photos[0])}
                    />
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
                <Button 
                  onClick={toggleEditMode}
                  variant={isEditing ? "outline" : "nikkah"}
                  className="w-full"
                >
                  {isEditing ? "View Profile" : "Edit Profile"}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="w-full md:w-2/3">
            {isEditing ? (
              <ProfileCV 
                onPhotoClick={handlePhotoClick} 
                onProfileUpdated={handleProfileUpdated}
              />
            ) : (
              profile && <ProfileView profile={profile} isOwnProfile={true} onPhotoClick={handlePhotoClick} />
            )}
          </div>
        </div>

        <Dialog open={!!expandedPhoto} onOpenChange={(open) => !open && setExpandedPhoto(null)}>
          <DialogContent className="sm:max-w-[85vw] max-h-[90vh] p-0 overflow-hidden bg-transparent border-none shadow-none">
            <div className="relative w-full h-full flex items-center justify-center" onClick={() => setExpandedPhoto(null)}>
              <img 
                src={expandedPhoto || ''} 
                alt="Expanded photo" 
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-xl"
                onClick={(e) => e.stopPropagation()}
              />
              <Button 
                className="absolute top-2 right-2 rounded-full h-8 w-8 p-0 bg-black/50 hover:bg-black/70"
                variant="ghost"
                onClick={() => setExpandedPhoto(null)}
              >
                <X className="h-4 w-4 text-white" />
              </Button>
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
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default Profile;
