import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { 
  User, 
  MapPin, 
  Calendar, 
  School, 
  Briefcase, 
  Ruler, 
  Weight, 
  Heart,
  BookOpenText,
  Send,
  ImageIcon,
  Users,
  Globe,
  Check,
  X,
  UserCircle,
  AlertTriangle,
  UserCheck,
  Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  sendMatchRequest, 
  checkIfAlreadyRequested, 
  getUserMatches, 
  saveProfile, 
  unsaveProfile, 
  isProfileSaved,
  shouldPhotosBeVisible,
  updateMatchRequest
} from "@/integrations/supabase/client";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { getEthnicityFlag } from '@/lib/ethnicityFlags';
import { useLocation } from "react-router-dom";
import UpgradeDialog from "./UpgradeDialog";
import { checkIsFreemium } from "@/utils/freemiumUtils";
import { getSavedProfilesCount } from "@/integrations/supabase/client";

type Profile = Tables<"profiles">;

interface ProfileViewProps {
  profile: Profile;
  onRequestContact?: (name: string) => void;
  viewOnly?: boolean;
  onRevealPhotos?: () => void;
  isOwnProfile?: boolean;
  onPhotoClick?: (photoUrl: string) => void;
  photosVisible?: boolean;
}

const cmToFeetInches = (cm: number) => {
  const inches = cm / 2.54;
  const feet = Math.floor(inches / 12);
  const remainingInches = Math.round(inches % 12);
  return `${feet}'${remainingInches}"`;
};

const kgToPounds = (kg: number) => {
  return Math.round(kg * 2.20462);
};

const calculateAge = (dateOfBirth: string | null) => {
  if (!dateOfBirth) return null;
  
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

const ProfileView = ({ 
  profile, 
  onRequestContact = () => {}, 
  viewOnly = false,
  onRevealPhotos = () => {},
  isOwnProfile = false,
  onPhotoClick = () => {},
  photosVisible = false
}: ProfileViewProps) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [alreadyRequested, setAlreadyRequested] = useState(false);
  const [theyRequestedMe, setTheyRequestedMe] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [isMatched, setIsMatched] = useState(false);
  const [isInactiveMatch, setIsInactiveMatch] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [localPhotosVisible, setLocalPhotosVisible] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradeDialogFeature, setUpgradeDialogFeature] = useState("send match requests");
  const { toast } = useToast();
  const { user } = useAuth();
  const location = useLocation();
  
  const getDisplayName = () => {
    if (isOwnProfile) {
      return profile.display_name || profile.first_name || "Anonymous";
    }
    return profile.display_name || "Anonymous";
  };

  // Check if current user is on freemium plan
  const isFreemium = user?.user_metadata?.gender === 'male' && 
                    user?.user_metadata?.subscription_status !== 'active';

  useEffect(() => {
    if (photosVisible !== undefined) {
      setLocalPhotosVisible(photosVisible);
    } else {
      const checkPhotoVisibility = async () => {
        if (!user || isOwnProfile) {
          setLocalPhotosVisible(true);
          return;
        }
        
        if (user?.user_metadata?.gender === 'female') {
          const { data: viewedProfile } = await supabase
            .from('profiles')
            .select('gender')
            .eq('id', profile.id)
            .single();
            
          if (viewedProfile?.gender === 'male') {
            setLocalPhotosVisible(true);
            
          }
        }
        
        const { visible } = await shouldPhotosBeVisible(profile.id);
        setLocalPhotosVisible(visible);
        
        const { data, error } = await checkIfAlreadyRequested(profile.id, undefined, true);
        if (!error && data && data.length > 0) {
          setTheyRequestedMe(true);
        }
      };
      
      checkPhotoVisibility();
    }
  }, [profile.id, user, isOwnProfile, isInactiveMatch, photosVisible]);
  const [signedPhotos, setSignedPhotos] = useState<string[]>([]);

useEffect(() => {
  const fetchSignedPhotoUrls = async () => {
    if (!profile?.photos || profile.photos.length === 0) return;

    const signedUrls: string[] = [];
    
    for (const photo of profile.photos) {
      const { data, error } = await supabase
        .storage
        .from('profile-pictures')
        .createSignedUrl(photo, 60 * 60); // 1 hour expiry
      
      if (data?.signedUrl) {
        signedUrls.push(data.signedUrl);
      } else {
        console.error("Error fetching signed URL for photo:", error?.message);
      }
    }

    setSignedPhotos(signedUrls);
  };

  fetchSignedPhotoUrls();
}, [profile?.photos]);

  useEffect(() => {
    if (!viewOnly && !isOwnProfile) {
      checkIfProfileRequested();
      checkIfMatched();
      checkIfTheyRequestedMe();
    } else if (isOwnProfile) {
      setIsMatched(true);
      setLocalPhotosVisible(true);
    } else {
      setIsMatched(true);
    }
    
    if (location.state && location.state.fromRequested) {
      console.log("Coming from requested profiles page, setting already requested");
      setAlreadyRequested(true);
    }
  }, [profile.id, viewOnly, isOwnProfile, location]);
  
  useEffect(() => {
    console.log("Profile data in ProfileView component:", profile);
  }, [profile]);

  const checkIfProfileRequested = async () => {
    if (!user?.id) return;
    
    const { data, error } = await checkIfAlreadyRequested(profile.id);
    if (!error && data && data.length > 0) {
      console.log("Profile already requested:", data);
      setAlreadyRequested(true);
    }
  };

  const checkIfTheyRequestedMe = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await checkIfAlreadyRequested(user.id, profile.id);
      
      if (!error && data && data.length > 0) {
        const incomingRequest = data.find(req => 
          req.requester_id === profile.id && req.status === 'pending'
        );
        
        if (incomingRequest) {
          setTheyRequestedMe(true);
          setPendingRequest(incomingRequest);
        }
      }
    } catch (error) {
      console.error("Error checking if they requested me:", error);
    }
  };

  const checkIfMatched = async () => {
    const { data: matches, error } = await getUserMatches();
    if (!error && matches) {
      const matchWithUser = matches.find((match: any) => 
        (match.user_one.id === profile.id || match.user_two.id === profile.id)
      );
      
      if (matchWithUser) {
        if (matchWithUser.status === 'active') {
          setIsMatched(true);
          setIsInactiveMatch(false);
        } else if (matchWithUser.status === 'inactive') {
          setIsMatched(false);
          setIsInactiveMatch(true);
        }
      } else {
        setIsMatched(false);
        setIsInactiveMatch(false);
      }
    }
  };
  
  const handleRequestContact = async () => {
    // Check if user is freemium and trying to send a request
    if (isFreemium) {
      setShowUpgradeDialog(true);
      return;
    }

    if (alreadyRequested && !isInactiveMatch) {
      toast({
        title: "Already Requested",
        description: `You have already sent a request to ${profile.first_name || "this person"}.`,
      });
      return;
    }
    
    setIsRequesting(true);
    
    try {
      const { error } = await sendMatchRequest(profile.id);
      
      if (error) {
        console.error("Error sending match request:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to send match request. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      setAlreadyRequested(true);
      
      if (isInactiveMatch) {
        toast({
          title: "Rematch Request Sent",
          description: `Your rematch request has been sent to ${profile.first_name || "this person"}.`,
        });
      } else {
        onRequestContact(profile.first_name || "this person");
      }
      
    } catch (error) {
      console.error("Exception when sending match request:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRequesting(false);
    }
  };
  
  const handleRequestResponse = async (status: 'accepted' | 'rejected') => {
    if (!pendingRequest) return;
    
    try {
      setProcessingAction(true);
      console.log(`Processing ${status} for request ${pendingRequest.id}`);
      
      const { error } = await updateMatchRequest(pendingRequest.id, status);
      
      if (error) {
        console.error(`Error ${status} match request:`, error);
        toast({
          title: "Error",
          description: `Failed to ${status} match request. Please try again.`,
          variant: "destructive",
        });
        return;
      }
      
      setPendingRequest(null);
      setTheyRequestedMe(false);
      
      if (status === 'accepted') {
        setIsMatched(true);
      }
      
      toast({
        title: status === 'accepted' ? "Match Accepted" : "Request Declined",
        description: status === 'accepted' 
          ? "You've accepted the match request! You can now view this match in your matches tab." 
          : "You've declined the match request.",
      });
    } catch (error) {
      console.error(`Error ${status} match request:`, error);
      toast({
        title: "Error",
        description: `An unexpected error occurred. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setProcessingAction(false);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      checkIfSaved();
    }
  }, [profile?.id]);

  const checkIfSaved = async () => {
    const { isSaved } = await isProfileSaved(profile.id);
    setIsSaved(isSaved);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      if (isSaved) {
        const { error } = await unsaveProfile(profile.id);
        if (!error) {
          setIsSaved(false);
          toast({
            title: "Success",
            description: "Profile removed from saved profiles",
          });
        }
      } else {
        // Check if user is freemium and at limit before saving
        if (isFreemium) {
          try {
            const { count } = await getSavedProfilesCount();
            if (count >= 3) {
              setUpgradeDialogFeature("save more profiles");
              setShowUpgradeDialog(true);
              return;
            }
          } catch (error) {
            console.error("Error checking saved profiles count:", error);
          }
        }

        try {
          const { error } = await saveProfile(profile.id);
          if (!error) {
            setIsSaved(true);
            toast({
              title: "Success",
              description: "Profile saved successfully",
            });
          }
        } catch (error: any) {
          if (error.message === 'FREEMIUM_LIMIT_REACHED') {
            setUpgradeDialogFeature("save more profiles");
            setShowUpgradeDialog(true);
          } else {
            console.error("Error saving profile:", error);
            toast({
              title: "Error",
              description: "Failed to save profile",
              variant: "destructive",
            });
          }
        }
      }
    } catch (error) {
      console.error("Error saving/unsaving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save/unsave profile",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const ProfileStatusHeader = () => {
    if (viewOnly || isOwnProfile) return null;

    const displayName = getDisplayName();

    return (
      <Card className="mb-6">
        <CardContent className="p-5">
          {isInactiveMatch && (
            <div className="mb-4">
              <div className="bg-yellow-50 p-4 rounded-md text-yellow-700">
                <h4 className="font-medium text-lg flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" /> 
                  This match has been removed
                </h4>
                <p className="mt-2 text-sm">
                  You or the other person has unmatched. You can still view their profile, but you'll need to send a new match request to connect.
                </p>
              </div>
            </div>
          )}

          {isMatched && !isInactiveMatch && (
            <div className="mb-4">
              <div className="bg-green-50 p-4 rounded-md text-green-700">
                <h4 className="font-medium text-lg flex items-center">
                  <Heart className="h-5 w-5 mr-2 fill-green-600" /> 
                  You are matched with {displayName}
                </h4>
                
                {user?.user_metadata?.gender === 'male' && (
                  <div className="mt-3 border-t border-green-200 pt-3">
                    <h5 className="font-medium mb-1">Wali Contact Information</h5>
                    <p className="text-sm">Name: {profile.wali_name || "Not provided"}</p>
                    <p className="text-sm">Contact: {profile.wali_phone || "Not provided"}</p>
                  </div>
                )}
                
                {user?.user_metadata?.gender === 'female' && (
                  <p className="mt-2 text-sm">
                    The brother will contact your guardian soon. Your guardian has been notified.
                  </p>
                )}
              </div>
            </div>
          )}

          {theyRequestedMe && !isMatched && !isInactiveMatch && (
            <div className="mb-4">
              <div className="bg-nikkah-pink/10 p-4 rounded-md">
                <h4 className="font-medium text-nikkah-pink flex items-center">
                  <UserCheck className="h-5 w-5 mr-2" /> 
                  {displayName} has requested to connect with you
                </h4>
                
                <div className="mt-3 flex gap-2">
                  <Button 
                    onClick={() => handleRequestResponse('accepted')}
                    className="flex-1 bg-nikkah-pink hover:bg-nikkah-pink/90"
                    disabled={processingAction}
                  >
                    {processingAction ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Check className="mr-1 h-4 w-4" />
                    )}
                    Accept
                  </Button>
                  <Button 
                    onClick={() => handleRequestResponse('rejected')}
                    variant="outline" 
                    className="flex-1"
                    disabled={processingAction}
                  >
                    {processingAction ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-600 mr-2"></div>
                    ) : (
                      <X className="mr-1 h-4 w-4" />
                    )}
                    Decline
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!isMatched && !theyRequestedMe && !isInactiveMatch && (
            <div className="grid grid-cols-2 gap-2">
              {alreadyRequested ? (
                <Button 
                  disabled
                  className="w-full"
                  variant="nikkah"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Request Sent
                </Button>
              ) : (
                <Button 
                  onClick={handleRequestContact}
                  disabled={isRequesting || alreadyRequested}
                  className="w-full"
                  variant="nikkah"
                >
                  {isRequesting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  ) : isFreemium ? (
                    <Crown className="mr-2 h-4 w-4" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {isFreemium ? 'Upgrade to Request' : 'Request'}
                </Button>
              )}
              
              <Button 
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="w-full"
                variant="outline"
              >
                {savingProfile ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-current"></div>
                ) : (
                  <>
                    <Heart className={`mr-2 h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                    {isSaved ? 'Unsave' : 'Save'}
                  </>
                )}
              </Button>
            </div>
          )}

          {isInactiveMatch && (
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button 
                onClick={handleRequestContact}
                disabled={isRequesting || alreadyRequested}
                className="w-full"
                variant="nikkah"
              >
                {isRequesting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                ) : isFreemium ? (
                  <Crown className="mr-2 h-4 w-4" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {alreadyRequested ? 'Rematch Sent' : isFreemium ? 'Upgrade to Rematch' : 'Rematch'}
              </Button>
              
              <Button 
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="w-full"
                variant="outline"
              >
                {savingProfile ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-current"></div>
                ) : (
                  <>
                    <Heart className={`mr-2 h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                    {isSaved ? 'Unsave' : 'Save'}
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderPhotoGrid = () => {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {signedPhotos.length > 0 && signedPhotos.map((photoUrl: string, index: number) => (
  <div key={index} className="aspect-square rounded-md overflow-hidden border relative">
    <img 
      src={photoUrl} 
      alt={`Profile ${index + 1}`} 
      className={`w-full h-full object-cover transition-all duration-300 ${(localPhotosVisible || isOwnProfile) ? 'cursor-pointer' : 'blur-xl'}`}
      onClick={() => (localPhotosVisible || isOwnProfile) && onPhotoClick(photoUrl)}
    />
    {!localPhotosVisible && !isOwnProfile && (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-black/40 p-2 rounded-lg text-white text-xs">
          <p>Photos Hidden</p>
        </div>
      </div>
    )}
  </div>
))}

      </div>
    );
  };

  const renderProfileContent = () => {
    const displayName = getDisplayName();
    
    return (
      <div className="space-y-8">
        {!viewOnly && !isOwnProfile && <ProfileStatusHeader />}
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserCircle className="mr-2 h-5 w-5 text-nikkah-pink" />
              {isOwnProfile ? "Display Name" : "Profile"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start">
              <User className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
              <div>
                <h3 className="font-medium">{isOwnProfile ? "Your Display Name" : "Name"}</h3>
                <p className="text-gray-600">{displayName}</p>
                {isOwnProfile && !profile.display_name && (
                  <p className="text-sm text-gray-400 mt-1">
                    You haven't set a display name. You will appear as "Anonymous" to others.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {profile.photos && profile.photos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ImageIcon className="mr-2 h-5 w-5 text-nikkah-pink" />
                Photos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderPhotoGrid()}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5 text-nikkah-pink" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                  <div>
                    <h3 className="font-medium">Date of Birth</h3>
                    {profile.date_of_birth ? (
                      <p className="text-gray-600">
                        {new Date(profile.date_of_birth).toLocaleDateString()} 
                        <span className="ml-2 text-sm text-gray-500">
                          ({calculateAge(profile.date_of_birth)} years old)
                        </span>
                      </p>
                    ) : (
                      <p className="text-gray-400">Not provided</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Heart className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                  <div>
                    <h3 className="font-medium">Marital Status</h3>
                    {profile.marital_status ? (
                      <p className="text-gray-600">{profile.marital_status}</p>
                    ) : (
                      <p className="text-gray-400">Not provided</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                  <div>
                    <h3 className="font-medium">Country</h3>
                    {profile.country ? (
                      <p className="text-gray-600">{profile.country}</p>
                    ) : (
                      <p className="text-gray-400">Not provided</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Globe className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                  <div>
                    <h3 className="font-medium">Ethnicity</h3>
                    {profile.ethnicity && profile.ethnicity.length > 0 ? (
                      <div className="text-gray-600">
                        {Array.isArray(profile.ethnicity) 
                          ? profile.ethnicity.map((eth, index) => (
                            <span key={index}>
                              {eth} {getEthnicityFlag(eth)}
                              {index < profile.ethnicity.length - 1 ? ', ' : ''}
                            </span>
                          ))
                          : <span>{profile.ethnicity} {getEthnicityFlag(profile.ethnicity)}</span>
                        }
                      </div>
                    ) : (
                      <p className="text-gray-400">Not provided</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <Ruler className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                  <div>
                    <h3 className="font-medium">Height</h3>
                    {profile.height_cm ? (
                      <p className="text-gray-600">{cmToFeetInches(profile.height_cm)} ({profile.height_cm} cm)</p>
                    ) : (
                      <p className="text-gray-400">Not provided</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Weight className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                  <div>
                    <h3 className="font-medium">Weight</h3>
                    {profile.weight_kg ? (
                      <p className="text-gray-600">{profile.weight_kg} kg ({kgToPounds(profile.weight_kg)} lbs)</p>
                    ) : (
                      <p className="text-gray-400">Not provided</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="flex items-start">
              <BookOpenText className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
              <div>
                <h3 className="font-medium">About Me</h3>
                {profile.self_summary ? (
                  <p className="text-gray-600 whitespace-pre-line mt-2">{profile.self_summary}</p>
                ) : (
                  <p className="text-gray-400">No description provided</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpenText className="mr-2 h-5 w-5 text-nikkah-pink" />
              Islamic Background
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div>
                    <h3 className="font-medium">Islamic Sect</h3>
                    {profile.sect ? (
                      <p className="text-gray-600">{profile.sect}</p>
                    ) : (
                      <p className="text-gray-400">Not provided</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div>
                    <h3 className="font-medium">Salah Frequency</h3>
                    {profile.salah ? (
                      <p className="text-gray-600">{profile.salah}</p>
                    ) : (
                      <p className="text-gray-400">Not provided</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <Separator className="my-4" />
                <div>
                  <h3 className="font-medium">Islamic Practices / Dress Code</h3>
                  {profile.islamic_practices ? (
                    <p className="text-gray-600 whitespace-pre-line mt-2">{profile.islamic_practices}</p>
                  ) : (
                    <p className="text-gray-400">Not provided</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <School className="mr-2 h-5 w-5 text-nikkah-pink" />
              Education & Career
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start">
                <School className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                <div>
                  <h3 className="font-medium">Highest Education</h3>
                  {profile.highest_education ? (
                    <p className="text-gray-600">{profile.highest_education}</p>
                  ) : (
                    <p className="text-gray-400">Not provided</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-start">
                <Briefcase className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                <div>
                  <h3 className="font-medium">Profession</h3>
                  {profile.profession ? (
                    <p className="text-gray-600">{profile.profession}</p>
                  ) : (
                    <p className="text-gray-400">Not provided</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Heart className="mr-2 h-5 w-5 text-nikkah-pink" />
              Partner Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start">
                <Calendar className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                <div>
                  <h3 className="font-medium">Age Preference</h3>
                  {profile.looking_for_age_min && profile.looking_for_age_max ? (
                    <p className="text-gray-600">{profile.looking_for_age_min} - {profile.looking_for_age_max} years old</p>
                  ) : (
                    <p className="text-gray-400">Not provided</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-start">
                <Ruler className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                <div>
                  <h3 className="font-medium">Height Preference</h3>
                  {profile.looking_for_height_min && profile.looking_for_height_max ? (
                    <p className="text-gray-600">
                      {cmToFeetInches(profile.looking_for_height_min)} - {cmToFeetInches(profile.looking_for_height_max)}
                      <span className="text-sm text-gray-500 ml-1">
                        ({profile.looking_for_height_min} - {profile.looking_for_height_max} cm)
                      </span>
                    </p>
                  ) : (
                    <p className="text-gray-400">Not provided</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-start">
                <Globe className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                <div>
                  <h3 className="font-medium">Country Preference</h3>
                  {profile.looking_for_country ? (
                    <p className="text-gray-600">{profile.looking_for_country}</p>
                  ) : (
                    <p className="text-gray-400">Not provided</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-start">
                <Users className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                <div>
                  <h3 className="font-medium">Ethnicity Preference</h3>
                  {profile.looking_for_ethnicity && profile.looking_for_ethnicity.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {profile.looking_for_ethnicity.map((eth, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {eth} {getEthnicityFlag(eth)}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400">Not provided</p>
                  )}
                </div>
              </div>
              
              <div className="md:col-span-2">
                <Separator className="my-4" />
                <div>
                  <h3 className="font-medium">Partner Preferences Summary</h3>
                  {profile.looking_for_summary ? (
                    <p className="text-gray-600 whitespace-pre-line mt-2">{profile.looking_for_summary}</p>
                  ) : (
                    <p className="text-gray-400">Not provided</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (viewOnly || isOwnProfile) {
    return (
      <>
        {renderProfileContent()}
        <UpgradeDialog 
          open={showUpgradeDialog} 
          onOpenChange={setShowUpgradeDialog}
          feature={upgradeDialogFeature}
        />
      </>
    );
  }
  
  return (
    <>
      {renderProfileContent()}
      <UpgradeDialog 
        open={showUpgradeDialog} 
        onOpenChange={setShowUpgradeDialog}
        feature={upgradeDialogFeature}
      />
    </>
  );
};

export default ProfileView;
