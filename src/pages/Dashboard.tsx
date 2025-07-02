import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Search, Settings, LogOut, User, X, Send, BookmarkIcon, Clock, Eye, Sparkles, ChevronLeft, LightbulbIcon } from "lucide-react";
import { MobileNav } from "@/components/MobileNav";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import ProfileCV from "@/components/ProfileCV";
import ProfileView from "@/components/ProfileView";
import ProfileFilters, { FilterOptions } from "@/components/ProfileFilters";
import ProfileSort from "@/components/ProfileSort";
import ProfileViewToggle from "@/components/ProfileViewToggle";
import { cn } from "@/lib/utils";
import { 
  supabase, 
  getAllProfiles, 
  getPendingMatchRequests, 
  sendMatchRequest, 
  getSavedProfiles, 
  getProfileById, 
  getPendingPhotoRequests, 
  shouldPhotosBeVisible,
  recordProfileView,
  getUserMatches,
  checkIfAlreadyRequested
} from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import SettingsComponent from "@/components/Settings";
import MatchRequests from "@/components/MatchRequests";
import Matches from "@/components/Matches";
import SavedProfiles from "@/pages/SavedProfiles";
import PhotoRequests from "@/components/PhotoRequests";
import PhotoRequestsOutgoing from "@/components/PhotoRequestsOutgoing";
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination";
import ShopPage from "@/pages/Shop";
import { useSearchPreservation } from "@/context/SearchPreservationContext";
import DashboardScrollPreserver from "@/components/DashboardScrollPreserver";
import AffiliateDashboard from "@/pages/AffiliateDashboard";
import PersonalityTab from "@/components/personality/PersonalityTab";
import NotificationBell from "@/components/notifications/NotificationBell";

const mockUserData = {
  name: "Ahmed",
  profileCompletion: 65,
  newMatches: 3,
  newMessages: 2
};

type Profile = Tables<"profiles">;

interface ExtendedProfile extends Profile {
  signedPhotoUrl?: string | null;
  photosVisible?: boolean;
}

const Dashboard = () => {
  const getSignedPhotoUrl = async (photoPath: string) => {
  const { data, error } = await supabase
    .storage
    .from('profile-pictures')
    .createSignedUrl(photoPath, 60 * 60); // 1 hour expiry

  if (error) {
    console.error("Error creating signed URL:", error.message);
    return null;
  }

  return data?.signedUrl || null;
};

  const { toast } = useToast();
  const { signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { profileId } = useParams();
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || "dashboard");
  const [profiles, setProfiles] = useState<ExtendedProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<ExtendedProfile[]>([]);
  const [displayedProfiles, setDisplayedProfiles] = useState<ExtendedProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [profilesPerPage] = useState(15);
  const [sortOption, setSortOption] = useState("newest");
  const [filters, setFilters] = useState<FilterOptions>({});
  const [matchRequests, setMatchRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestedProfiles, setRequestedProfiles] = useState<Set<string>>(new Set());
  const [savedProfilesCount, setSavedProfilesCount] = useState(0);
  const [viewingProfile, setViewingProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [revealedProfiles, setRevealedProfiles] = useState<Set<string>>(new Set());
  const [photoRequests, setPhotoRequests] = useState<any[]>([]);
  const [photoRequestsLoading, setPhotoRequestsLoading] = useState(true);
  const [viewType, setViewType] = useState<"grid" | "list">("grid");
  const [prevTab, setPrevTab] = useState<string | null>(null);
  const [matchedProfiles, setMatchedProfiles] = useState<Set<string>>(new Set());
  const [profilesRequestingMe, setProfilesRequestingMe] = useState<Set<string>>(new Set());
  const [requestedProfilesCount, setRequestedProfilesCount] = useState(0);
  const [matchesData, setMatchesData] = useState<any[]>([]);
  const isMobile = useIsMobile();
  const isUserFemale = user?.user_metadata?.gender === 'female';
  const { setScrollPosition, setResetSearch } = useSearchPreservation();
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const urlTab = searchParams.get('tab');
  const [personalityData, setPersonalityData] = useState<{ type_code: string; islamic_name: string } | null>(null);
  const [personalityUpdateTrigger, setPersonalityUpdateTrigger] = useState(0);

  const handlePersonalityUpdate = useCallback(() => {
    setPersonalityUpdateTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (activeTab !== "dashboard") {
      url.searchParams.set('tab', activeTab);
    } else {
      url.searchParams.delete('tab');
    }
    window.history.replaceState({}, '', url.toString());
  }, [activeTab]);

  useEffect(() => {
    if (tabParam && ['dashboard', 'search', 'matches', 'profile', 'settings', 'saved', 'affiliate', 'personality'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (profileId) {
      fetchProfileById(profileId);
    }
  }, [profileId]);
  useEffect(() => {
  const fetchCurrentUserProfile = async () => {
    if (!user?.id) return;
    const { data, error } = await getProfileById(user.id);
    if (error) {
      console.error("Failed to fetch current profile:", error);
    } else {
      setCurrentProfile(data);
    }
  };

  fetchCurrentUserProfile();
}, [user]);
useEffect(() => {
  const fetchPersonality = async () => {
    if (!user?.id) return;

    const { data: result, error } = await supabase
      .from("personality_results")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error || !result) return;

    const { data: type } = await supabase
      .from("personality_types")
      .select("islamic_name")
      .eq("type_code", result.type_code)
      .single();

    if (type) {
      setPersonalityData({
        type_code: result.type_code,
        islamic_name: type.islamic_name,
      });
    }
  };

  fetchPersonality();
}, [user, personalityUpdateTrigger]); // Add personalityUpdateTrigger as dependency

  const fetchProfileById = async (id: string) => {
    setProfileLoading(true);
    try {
      const { data, error } = await getProfileById(id);
      if (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      if (data) {
        console.log("Profile fetched:", data);
        setViewingProfile(data);
        setActiveTab("profile-view");
        
        if (user && user.id !== id) {
          await recordProfileView(id);
        }
      } else {
        toast({
          title: "Error",
          description: "Profile not found.",
          variant: "destructive",
        });
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Exception when fetching profile:", error);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "search") {
      fetchProfiles();
      fetchRequestedProfiles();
      setPage(1);
      setHasMore(true);
    }
    
    if (activeTab === "dashboard") {
      fetchMatchRequests();
      fetchSavedProfilesCount();
      fetchPhotoRequests();
      fetchRequestedProfilesCount();
    }
  }, [activeTab]);

  useEffect(() => {
    if (filteredProfiles.length > 0) {
      loadProfiles(1);
    }
  }, [filteredProfiles]);

  const loadProfiles = (pageNum: number) => {
    const startIndex = 0;
    const endIndex = pageNum * profilesPerPage;
    const newProfiles = filteredProfiles.slice(startIndex, endIndex);
    setDisplayedProfiles(newProfiles);
    setHasMore(endIndex < filteredProfiles.length);
  };

  const handleLoadMore = () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    loadProfiles(nextPage);
    setLoadingMore(false);
  };

  const fetchPhotoRequests = async () => {
    if (!user) return;
    
    setPhotoRequestsLoading(true);
    try {
      const { data, error } = await getPendingPhotoRequests();
      
      if (error) {
        console.error("Error fetching photo requests:", error);
      } else if (data) {
        setPhotoRequests(data);
      }
    } catch (err) {
      console.error("Exception when fetching photo requests:", err);
    } finally {
      setPhotoRequestsLoading(false);
    }
  };

  const fetchSavedProfilesCount = async () => {
    const { data } = await getSavedProfiles();
    if (data) {
      setSavedProfilesCount(data.length);
    }
  };
const shouldBlurPhoto = (profile: ExtendedProfile) => {
  if (!user) return true; // If not logged in, blur

  const currentUserGender = user.user_metadata?.gender;
  const profileGender = profile.gender;

  // If current user is female and profile is male -> no blur
  if (currentUserGender === 'female' && profileGender === 'male') {
    return false;
  }

  // Check if we matched
  const match = matchesData?.find((match: any) => 
    (match.user_one?.id === profile.id || match.user_two?.id === profile.id)
  );

  if (match) {
    if (match.photos_hidden) {
      return true; // 📸 If photos hidden by the sister, blur
    }
    return false; // Otherwise, matched and not hidden, show
  }

  // If the profile is revealed manually (for example after photo request accepted)
  if (revealedProfiles.has(profile.id)) {
    return false;
  }

  // Otherwise, blur by default
  return true;
};


  const fetchProfiles = async () => {
    try {
      setLoading(true);
      console.log('Fetching all profiles...');
      
      // First fetch user matches to identify already matched profiles
      await fetchUserMatches();
      await fetchProfilesRequestingMe();
      
      const { data, error } = await getAllProfiles();
      
      if (error) {
        console.error('Error fetching profiles using helper:', error);
        toast({
          title: "Error",
          description: "Failed to load profiles. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      if (data) {
  console.log('Fetched profiles:', data);
  console.log(`Total profiles fetched: ${data.length}`);
  
  const currentUserGender = user?.user_metadata?.gender || '';
  const oppositeGender = currentUserGender === 'male' ? 'female' : 'male';

  const filteredProfiles = data.filter(profile => 
    profile.gender === oppositeGender && profile.onboarding_completed === true
  );

  console.log(`Filtered ${filteredProfiles.length} profiles of opposite gender with completed onboarding`);

  // Map over filteredProfiles and get signed photo URLs
  const profilesWithSignedUrls: ExtendedProfile[] = await Promise.all(
    filteredProfiles.map(async (profile) => {
      let signedPhotoUrl = null;
      if (profile.photos && profile.photos.length > 0) {
        signedPhotoUrl = await getSignedPhotoUrl(profile.photos[0]);
      }
      return { 
        ...profile, 
        signedPhotoUrl,
        photosVisible: true
      };
    })
  );

  setProfiles(profilesWithSignedUrls);
  setFilteredProfiles(profilesWithSignedUrls);
  setPage(1);
  loadProfiles(1);
}
 else {
        const result = await supabase
          .from('profiles')
          .select('*');
        
        if (result.error) {
          console.error('Error with direct query:', result.error);
          toast({
            title: "Error",
            description: "Failed to load profiles with direct query. Please try again.",
            variant: "destructive"
          });
          return;
        }
        
        if (result.data) {
          console.log('Fetched profiles with direct query:', result.data);
          console.log(`Total profiles fetched with direct query: ${result.data.length}`);
          
          const filteredProfiles = result.data.filter(profile => {
            const currentUserGender = user?.user_metadata?.gender || '';
            const oppositeGender = currentUserGender === 'male' ? 'female' : 'male';
            return profile.gender === oppositeGender && profile.onboarding_completed === true;
          });
          
          const extendedProfiles: ExtendedProfile[] = filteredProfiles.map(profile => ({
            ...profile,
            signedPhotoUrl: null,
            photosVisible: true
          }));
          
          setProfiles(extendedProfiles);
          setFilteredProfiles(extendedProfiles);
          setPage(1);
          loadProfiles(1);
        }
      }
    } catch (error) {
      console.error('Exception when fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchMatchRequests = async () => {
  if (!user) return;
  
  setRequestsLoading(true);

  try {
    const { data, error } = await getPendingMatchRequests();

    if (error) {
      console.error("Error fetching match requests:", error);
    } else if (data) {
      const requestsWithSignedPhotos = await Promise.all(
        data.map(async (request: any) => {
          if (request.requester?.photos && request.requester.photos.length > 0) {
            const { data: signedUrlData, error: signedUrlError } = await supabase
              .storage
              .from('profile-pictures')
              .createSignedUrl(request.requester.photos[0], 60 * 60); // 1 hour expiry

            if (signedUrlData?.signedUrl) {
              return {
                ...request,
                requester: {
                  ...request.requester,
                  signedPhotoUrl: signedUrlData.signedUrl,
                },
              };
            } else {
              console.error("Error creating signed URL for match request photo:", signedUrlError?.message);
            }
          }
          return request;
        })
      );

      setMatchRequests(requestsWithSignedPhotos);
    }
  } catch (error) {
    console.error("Error processing match requests:", error);
  } finally {
    setRequestsLoading(false);
  }
};

  
  const fetchRequestedProfiles = async () => {
    const { data: sessionData } = await supabase.auth.getUser();
    if (!sessionData.user) return;
    
    const { data, error: postgrestError } = await supabase
      .from('match_requests')
      .select('requested_id')
      .eq('requester_id', sessionData.user.id);
    
    if (!postgrestError && data) {
      const requestedIds = new Set(data.map(request => request.requested_id));
      setRequestedProfiles(requestedIds);
    }
  };

  const fetchUserMatches = async () => {
    if (!user) return;
    
    try {
      const { data: matches, error } = await getUserMatches();
      if (!error && matches) {
        const matchedIds = new Set<string>();
        matches.forEach((match: any) => {
          if (match.user_one.id === user.id) {
            matchedIds.add(match.user_two.id);
          } else {
            matchedIds.add(match.user_one.id);
          }
        });
        setMatchedProfiles(matchedIds);
        setMatchesData(matches);
      }
    } catch (error) {
      console.error("Error fetching user matches:", error);
    }
  };

  const fetchProfilesRequestingMe = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('match_requests')
        .select('requester_id')
        .eq('requested_id', user.id)
        .eq('status', 'pending');
      
      if (!error && data) {
        const requestingIds = new Set<string>(data.map(request => request.requester_id));
        setProfilesRequestingMe(requestingIds);
      }
    } catch (error) {
      console.error("Error fetching incoming requests:", error);
    }
  };

  const fetchRequestedProfilesCount = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('match_requests')
        .select('*', { count: 'exact' })
        .eq('requester_id', user.id);
      
      if (error) {
        console.error("Error fetching requested profiles count:", error);
      } else if (data) {
        setRequestedProfilesCount(data.length);
      }
    } catch (error) {
      console.error("Error fetching requested profiles count:", error);
    }
  };

  const applyFiltersAndSort = () => {
  let result = [...profiles];

  // Age filter
  if (filters.ageMin !== undefined || filters.ageMax !== undefined) {
    result = result.filter(profile => {
      if (!profile.date_of_birth) return false;
      const birthDate = new Date(profile.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
      return (
        (filters.ageMin === undefined || age >= filters.ageMin) &&
        (filters.ageMax === undefined || age <= filters.ageMax)
      );
    });
  }

  // Country filter
  if (filters.country) {
    result = result.filter(profile => profile.country === filters.country);
  }

  // Ethnicity filter
  if (filters.ethnicities && filters.ethnicities.length > 0) {
    result = result.filter(profile =>
      profile.ethnicity?.some((e: string) => filters.ethnicities!.includes(e))
    );
  }

  // ✅ Sect filter
  if (filters.sect) {
    result = result.filter(profile => profile.sect === filters.sect);
  }

  // ✅ Height filter
  if (filters.heightMin !== undefined || filters.heightMax !== undefined) {
    result = result.filter(profile => {
      const height = profile.height_cm;
      return (
        (filters.heightMin === undefined || height >= filters.heightMin) &&
        (filters.heightMax === undefined || height <= filters.heightMax)
      );
    });
  }

  // Sort
  if (sortOption === "newest") {
    result.sort((a, b) => new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime());
  } else if (sortOption === "last_seen") {
    result.sort((a, b) => new Date(b.last_seen || "").getTime() - new Date(a.last_seen || "").getTime());
  }

  setFilteredProfiles(result);
};

  
  useEffect(() => {
    if (profiles.length > 0) {
      applyFiltersAndSort();
    }
  }, [filters, sortOption, profiles]);
  
  const handleApplyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    toast({
      title: "Filters Applied",
      description: "Your search filters have been applied."
    });
  };
  
  const handleResetFilters = () => {
    setFilters({});
    setFilteredProfiles(profiles);
    
    setResetSearch(true);
    
    toast({
      title: "Filters Reset",
      description: "Your search filters have been reset."
    });
  };
  
  const handleSort = (option: string) => {
    setSortOption(option);
  };
  
  const handleContactRequest = (name: string) => {
    toast({
      title: "Contact Request Sent",
      description: `We've shared your interest with ${name}'s Wali.`
    });
  };
  
  const handleProfileClick = async (profile: Profile) => {
  const container = document.getElementById("search-container");
  if (container) {
    setScrollPosition(container.scrollTop);
  }

  navigate(`/profile/${profile.id}`);
};


  const handleBackFromProfile = () => {
    setViewingProfile(null);
    if (prevTab) {
      setActiveTab(prevTab);
      if (prevTab === "search") {
        navigate("/dashboard?tab=search");
      } else {
        navigate("/dashboard");
      }
    } else {
      navigate("/dashboard");
    }
  };

  const handleRevealPhotos = (profileId: string) => {
    setRevealedProfiles(prev => new Set([...prev, profileId]));
    toast({
      title: "Photos Revealed",
      description: "You can now see this profile's photos"
    });
  };

  const isProfileRevealed = async (profileId: string) => {
    const currentUserGender = user?.user_metadata?.gender || '';
    const profileData = profiles.find(p => p.id === profileId);
    
    if (currentUserGender === 'female' && profileData?.gender === 'male') {
      return true;
    }
    
    const { visible } = await shouldPhotosBeVisible(profileId);
    return visible;
  };

  const calculateAge = (dateOfBirth: string | null) => {
    if (!dateOfBirth) return null;
    
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };
  
  const handleLogout = async () => {
    await signOut();
  };
  
  const handleRequestContact = async (profileId: string, name: string) => {
    try {
      const { error } = await sendMatchRequest(profileId);
      
      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to send request. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      setRequestedProfiles(prev => new Set([...prev, profileId]));
      
      toast({
        title: "Contact Request Sent",
        description: `We've shared your interest with ${name}'s Wali.`
      });
    } catch (error) {
      console.error("Error sending match request:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleViewTypeChange = (type: "grid" | "list") => {
    setViewType(type);
  };

  const isMatchActive = (profileId: string) => {
    if (!matchedProfiles.has(profileId)) return false;
    
    const match = matchesData?.find((match: any) => 
      (match.user_one?.id === profileId || match.user_two?.id === profileId) && 
      match.status === 'active'
    );
    
    return !!match;
  };

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-nikkah-pink"></div>
      </div>
    );
  }
  
  // Special case for affiliate tab
  if (activeTab === "affiliate") {
    return <AffiliateDashboard />;
  }
  
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="flex items-center gap-2 font-semibold" onClick={() => setActiveTab("dashboard")}>
              <img 
                src="/lovable-uploads/35ae8a8d-0a2d-496e-9894-ed867e4bd95b.png" 
                alt="NikkahFirst Logo" 
                className="h-14" 
              />
            </Link>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden md:block border-l h-6 mx-2"></div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <span className="hidden md:inline-block font-medium">
                {user?.user_metadata?.firstName || mockUserData.name}
              </span>
              <Button 
                onClick={handleLogout} 
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 ml-2 hidden md:flex"
                size={isMobile ? "sm" : "default"}
              >
                Log out
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex-1 container py-4 md:py-8 px-4 md:px-8 pb-20 md:pb-8">
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
          <div className="hidden md:block">
            <div className="space-y-1">
              <Button 
                variant={activeTab === "dashboard" ? "nikkah" : "ghost"} 
                className="w-full justify-start" 
                onClick={() => setActiveTab("dashboard")}
              >
                <Heart className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              <Button 
                variant={activeTab === "search" ? "nikkah" : "ghost"} 
                className={`w-full justify-start`} 
                onClick={() => setActiveTab("search")}
                data-tab="search"
              >
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
              <Button 
                variant={activeTab === "matches" ? "nikkah" : "ghost"} 
                className={`w-full justify-start`}
                onClick={() => setActiveTab("matches")}
                data-tab="matches"
              >
                <Heart className="mr-2 h-4 w-4" />
                Matches
              </Button>
              <Button 
                variant={activeTab === "personality" ? "nikkah" : "ghost"} 
                className={`w-full justify-start`}
                onClick={() => setActiveTab("personality")}
                data-tab="personality"
              >
                <LightbulbIcon className="mr-2 h-4 w-4" />
                Personality
              </Button>
              <Button 
                variant={activeTab === "profile" ? "nikkah" : "ghost"} 
                className={`w-full justify-start`} 
                onClick={() => setActiveTab("profile")}
                data-tab="profile"
              >
                <User className="mr-2 h-4 w-4" />
                Profile
              </Button>
              <Button 
                variant={activeTab === "settings" ? "nikkah" : "ghost"} 
                className={`w-full justify-start`} 
                onClick={() => setActiveTab("settings")}
                data-tab="settings"
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </div>
            <div className="mt-8">
              <Button variant="outline" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </Button>
            </div>
          </div>
          
          <div>
            {activeTab === "matches" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl md:text-2xl font-bold">Matches</h2>
                </div>
                <Matches onViewProfile={handleProfileClick} />
              </div>
            )}
            
            {activeTab === "dashboard" && (
              <div className="space-y-4 md:space-y-8">
                {isMobile && (
  <div
    onClick={() => setActiveTab("personality")}
    className="bg-gradient-to-r from-nikkah-pink/10 to-nikkah-blue/10 p-4 rounded-xl mb-4 cursor-pointer animate-fade-in transition hover:shadow-md hover:scale-[1.01]"
  >
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-nikkah-pink text-white flex items-center justify-center">
        <LightbulbIcon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-base font-semibold">
          {personalityData
            ? `You're a ${personalityData.islamic_name} (${personalityData.type_code})`
            : "Discover Your Personality"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {personalityData
            ? "Click to view your quiz results and compatible matches."
            : "Take the quiz and get matches based on your Islamic personality type."}
        </p>
      </div>
    </div>
  </div>
)}

                <div className="grid grid-cols-3 gap-3 md:gap-4">
                  <Card className="overflow-hidden animate-slide-in h-full">
                    <CardContent 
                      className="p-4 md:p-6 cursor-pointer h-full flex flex-col items-center justify-center"
                      onClick={() => navigate("/requested-profiles")}
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className="w-10 h-10 rounded-full bg-nikkah-blue/10 flex items-center justify-center mb-2">
                          <Heart className="h-5 w-5 text-nikkah-blue" />
                        </div>
                        <div>
                          <p className="text-xs md:text-sm text-gray-500">Requested</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="overflow-hidden animate-slide-in h-full" style={{ animationDelay: "0.1s" }}>
                    <CardContent 
                      className="p-4 md:p-6 cursor-pointer h-full flex flex-col items-center justify-center"
                      onClick={() => setActiveTab("matches")}
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className="w-10 h-10 rounded-full bg-nikkah-pink/10 flex items-center justify-center mb-2">
                          <Heart className="h-5 w-5 text-nikkah-pink" />
                        </div>
                        <div>
                          <p className="text-xs md:text-sm text-gray-500">Matches</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="overflow-hidden animate-slide-in h-full" style={{ animationDelay: "0.2s" }}>
  <CardContent 
    className="p-4 md:p-6 cursor-pointer h-full flex flex-col items-center justify-center"
    onClick={() => setActiveTab("saved")}
  >
    <div className="flex flex-col items-center text-center">
      <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center mb-2">
        <BookmarkIcon className="h-5 w-5 text-yellow-600" />
      </div>
      <div>
        <p className="text-xs md:text-sm text-gray-500">Saved</p>
      </div>
    </div>
  </CardContent>
</Card>

                </div>

                {matchRequests.length > 0 && (
                  <div className="bg-background rounded-xl p-4 shadow-sm border animate-fade-in">
                    <h3 className="text-base md:text-lg font-semibold mb-3 flex items-center">
                      <Sparkles className="h-4 w-4 text-nikkah-pink mr-2" />
                      New Match Requests
                    </h3>
                    <MatchRequests />
                  </div>
                )}
                
                {photoRequests.length > 0 && (
                  <div className="bg-background rounded-xl p-4 shadow-sm border animate-fade-in">
                    <h3 className="text-base md:text-lg font-semibold mb-3 flex items-center">
                      <Eye className="h-4 w-4 text-nikkah-blue mr-2" />
                      Photo Requests
                    </h3>
                    <PhotoRequests />
                  </div>
                )}
                
                <div className="bg-background rounded-xl p-4 shadow-sm border animate-fade-in">
                  <h3 className="text-base md:text-lg font-semibold mb-3 flex items-center">
                    <Heart className="h-4 w-4 text-nikkah-pink mr-2" />
                    Recent Matches
                  </h3>
                  <Matches limit={3} onViewProfile={handleProfileClick} />
                  {isMobile && (
                    <div className="mt-3 text-center">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setActiveTab("matches")}
                        className="w-full md:w-auto"
                      >
                        View All Matches
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {activeTab === "search" && (
              <div>
                <h2 className="text-xl md:text-2xl font-bold mb-6">Search</h2>
                
                <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-2 mb-4">
  <div className="flex flex-wrap items-center gap-2">
    <ProfileFilters onApplyFilters={handleApplyFilters} onResetFilters={handleResetFilters} />
    <ProfileSort onSort={handleSort} currentSort={sortOption} />
  </div>
  <div className="flex-shrink-0">
    <ProfileViewToggle 
      currentView={viewType} 
      onToggleView={handleViewTypeChange} 
    />
  </div>
</div>

                
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-nikkah-pink"></div>
                  </div>
                ) : (
                  <DashboardScrollPreserver containerId="search-container" isVisible={activeTab === "search"}>
                    <div id="search-container" className="overflow-y-auto max-h-[calc(100vh-220px)]">
                      {filteredProfiles.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-gray-500 mb-4">No profiles match your search criteria.</p>
                        </div>
                      ) : viewType === "grid" ? (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                            {displayedProfiles.map(profile => {
                              const isOnlineThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds
                              const lastSeen = profile.last_seen ? new Date(profile.last_seen) : null;
                              const now = new Date();
                              const isOnline = lastSeen && (now.getTime() - lastSeen.getTime() < isOnlineThreshold);
                              const revealed = revealedProfiles.has(profile.id) || isUserFemale;
                              const activeMatch = isMatchActive(profile.id);
                              const hasRequestedMe = profilesRequestingMe.has(profile.id);
                              const displayName = profile.display_name || "Anonymous";
                              
                              let lastSeenText = '';
                              if (lastSeen) {
                                const diffInMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
                                if (diffInMinutes < 1) {
                                  lastSeenText = 'Just now';
                                } else if (diffInMinutes < 60) {
                                  lastSeenText = `${diffInMinutes} min ago`;
                                } else if (diffInMinutes < 1440) {
                                  lastSeenText = `${Math.floor(diffInMinutes / 60)} hours ago`;
                                } else {
                                  lastSeenText = `${Math.floor(diffInMinutes / 1440)} days ago`;
                                }
                              }
                              
                              return (
                                <Card key={profile.id} className="overflow-hidden hover:shadow-md transition-shadow animate-fade-in">
                                  <div className="aspect-square overflow-hidden bg-gray-100 flex items-center justify-center relative cursor-pointer" onClick={() => handleProfileClick(profile)}>
                                    {profile.signedPhotoUrl ? (
  <div className="w-full h-full relative">
    <img 
      src={profile.signedPhotoUrl} 
      alt={`${profile.first_name || "Profile"}`} 
      className={`w-full h-full object-cover transition-all duration-300 ${shouldBlurPhoto(profile) ? 'blur-xl' : ''}`}

    />
    {shouldBlurPhoto(profile) && (
  <div className="absolute inset-0 flex items-center justify-center">
    <div className="bg-black/40 p-4 rounded-lg text-white">
      <Eye className="h-8 w-8 mx-auto mb-2" />
      <p className="text-sm">Photos Blurred</p>
    </div>
  </div>
)}

  </div>
) : (
  <div className="w-full h-full flex items-center justify-center bg-gray-100">
    <User className="h-16 w-16 text-gray-400" />
  </div>
)}

                                    
                                    {lastSeen && (
                                      <div className="absolute top-2 right-2">
                                        <Badge className={`px-2 py-1 text-xs ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}>
                                          {isOnline ? (
                                            <span className="flex items-center">
                                              <span className="h-2 w-2 rounded-full bg-white mr-1 animate-pulse"></span>
                                              Online Now
                                            </span>
                                          ) : (
                                            <span className="flex items-center">
                                              <Clock className="h-3 w-3 mr-1" />
                                              {lastSeenText}
                                            </span>
                                          )}
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                  <CardContent className="p-3 md:p-5">
                                    <div className="flex justify-between items-start mb-2 md:mb-3">
                                      <h3 className="font-semibold text-base md:text-lg">{displayName}, {calculateAge(profile.date_of_birth)}</h3>
                                    </div>
                                    <p className="text-gray-600 text-xs md:text-sm mb-3 md:mb-4">
                                      {profile.country || 'Location not specified'}
                                      {profile.ethnicity && profile.ethnicity.length > 0 && (
                                        <span> • {profile.ethnicity.join(', ')}</span>
                                      )}
                                    </p>
                                    
                                    <div className="space-y-2">
                                      {activeMatch ? (
                                        <div className="space-y-2">
                                          <Badge className="w-full py-1.5 px-2 bg-green-500">Matched</Badge>
                                          <Button 
                                            variant="outline" 
                                            className="w-full text-xs md:text-sm py-1 md:py-2"
                                            onClick={() => handleProfileClick(profile)}
                                          >
                                            View Profile
                                          </Button>
                                        </div>
                                      ) : hasRequestedMe ? (
                                        <div className="space-y-2">
                                          <Badge className="w-full py-1.5 px-2 bg-nikkah-pink text-white">Has Requested You</Badge>
                                          <Button 
                                            variant="outline" 
                                            className="w-full text-xs md:text-sm py-1 md:py-2"
                                            onClick={() => handleProfileClick(profile)}
                                          >
                                            View Profile
                                          </Button>
                                        </div>
                                      ) : requestedProfiles.has(profile.id) ? (
                                        <div className="space-y-2">
                                          <Badge className="w-full py-1.5 px-2 bg-nikkah-blue text-white">Request Sent</Badge>
                                          <Button 
                                            variant="outline" 
                                            className="w-full text-xs md:text-sm py-1 md:py-2"
                                            onClick={() => handleProfileClick(profile)}
                                          >
                                            View Profile
                                          </Button>
                                        </div>
                                      ) : (
                                        <Button 
                                          variant="outline" 
                                          className="w-full text-xs md:text-sm py-1 md:py-2"
                                          onClick={() => handleProfileClick(profile)}
                                        >
                                          View Profile
                                        </Button>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                          {hasMore && (
                            <div className="mt-8 flex justify-center">
                              <Button 
                                variant="outline" 
                                onClick={handleLoadMore} 
                                disabled={loadingMore}
                                className="min-w-[200px]"
                              >
                                {loadingMore ? (
                                  <div className="flex items-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-nikkah-pink mr-2"></div>
                                    Loading...
                                  </div>
                                ) : 'Load More'}
                              </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="space-y-3 mt-2">
  {displayedProfiles.map(profile => {
    const age = calculateAge(profile.date_of_birth);
    const displayName = profile.display_name || "Anonymous";
    const summary = profile.self_summary?.split("\n")[0] || "No summary provided.";
    const isOnlineThreshold = 5 * 60 * 1000;
    const lastSeen = profile.last_seen ? new Date(profile.last_seen) : null;
    const now = new Date();
    const isOnline = lastSeen && (now.getTime() - lastSeen.getTime() < isOnlineThreshold);
    const activeMatch = isMatchActive(profile.id);
    const hasRequestedMe = profilesRequestingMe.has(profile.id);
    const hasRequested = requestedProfiles.has(profile.id);

    return (
      <Card
        key={profile.id}
        onClick={() => handleProfileClick(profile)}
        className="cursor-pointer hover:border-nikkah-pink border bg-background shadow-sm px-4 py-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-col gap-1 sm:max-w-[70%]">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-nikkah-pink">
                {displayName}, {age}
              </h3>
              {isOnline && (
                <span className="flex items-center text-xs text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-1"></span>
                  Online
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {profile.country}{profile.ethnicity?.length ? ` • ${profile.ethnicity.join(", ")}` : ""}
            </div>
            <div className="text-sm text-gray-600 line-clamp-2">{summary}</div>
          </div>
          <div className="flex flex-col items-end justify-center gap-2">
            {activeMatch ? (
              <Badge className="bg-green-600 text-white">Matched</Badge>
            ) : hasRequestedMe ? (
              <Badge className="bg-nikkah-pink text-white">Has Requested You</Badge>
            ) : hasRequested ? (
              <Badge className="bg-nikkah-blue text-white">Request Sent</Badge>
            ) : null}
            <Button variant="outline" size="sm">View Profile</Button>
          </div>
        </div>
      </Card>
    );
  })}
</div>

                          {hasMore && (
                            <div className="mt-8 flex justify-center">
                              <Button 
                                variant="outline" 
                                onClick={handleLoadMore} 
                                disabled={loadingMore}
                                className="min-w-[200px]"
                              >
                                {loadingMore ? (
                                  <div className="flex items-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-nikkah-pink mr-2"></div>
                                    Loading...
                                  </div>
                                ) : 'Load More'}
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </DashboardScrollPreserver>
                )}
              </div>
            )}
            
            {activeTab === "profile" && (
              <div>
                <ProfileCV />
              </div>
            )}
            
            {activeTab === "settings" && (
              <div>
                <SettingsComponent />
              </div>
            )}
            
            {activeTab === "saved" && (
              <div>
                <div className="flex items-center mb-6">
                  <Button 
                    variant="ghost" 
                    className="mr-2 p-2"
                    onClick={() => setActiveTab(prevTab || "dashboard")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <h2 className="text-xl md:text-2xl font-bold">Saved Profiles</h2>
                </div>
                <SavedProfiles onViewProfile={handleProfileClick} />
              </div>
            )}
            
            {activeTab === "personality" && (
              <div>
                <PersonalityTab onPersonalityUpdate={handlePersonalityUpdate} />
              </div>
            )}
            
            {activeTab === "shop" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl md:text-2xl font-bold">Shop</h2>
                </div>
                <ShopPage />
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="md:hidden">
        <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </div>
  );
};

export default Dashboard;
