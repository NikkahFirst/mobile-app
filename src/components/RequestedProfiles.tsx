import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Eye, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase, getSignedPhotoUrl } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface RequestedProfile {
  id: string;
  requested_id: string;
  status: string;
  created_at: string;
  profiles: {
    id: string;
    first_name: string | null;
    photos: string[] | null; // This will hold signed URLs
    country: string | null;
  };
}

const RequestedProfiles = () => {
  const { user } = useAuth();
  const isUserFemale = user?.user_metadata?.gender === "female";
  const { toast } = useToast();
  const navigate = useNavigate();
  const [requestedProfiles, setRequestedProfiles] = useState<RequestedProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequestedProfiles();
  }, [user]);

  const fetchRequestedProfiles = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: requests, error: requestsError } = await supabase
        .from('match_requests')
        .select('*')
        .eq('requester_id', user.id);

      if (requestsError) {
        toast({
          title: "Error",
          description: "Failed to load requested profiles.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const profilesWithDetails = await Promise.all(
        requests.map(async (request) => {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, first_name, photos, country')
            .eq('id', request.requested_id)
            .single();

          if (profileError || !profileData) return null;

          // Get signed URLs for all photos
          const signedPhotos = await Promise.all(
            (profileData.photos || []).map(async (path) => {
              if (!path) return null;
              const { data: signedUrlData, error: signedUrlError } = await supabase
                .storage
                .from('profile-pictures')
                .createSignedUrl(path, 60 * 60); // 1 hour expiry
              if (signedUrlError || !signedUrlData?.signedUrl) {
                console.error("Error generating signed URL:", signedUrlError);
                return null;
              }
              return signedUrlData.signedUrl;
            })
          );

          return {
            ...request,
            profiles: {
              ...profileData,
              photos: signedPhotos.filter(Boolean),
            },
          };
        })
      );

      const validProfiles = profilesWithDetails.filter(Boolean) as RequestedProfile[];
      setRequestedProfiles(validProfiles);
    } catch (err) {
      console.error("Error fetching requested profiles:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = (profileId: string) => {
    navigate(`/profile/${profileId}`, { state: { fromRequested: true } });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            <span>Pending</span>
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center">
            <CheckCircle className="h-3 w-3 mr-1" />
            <span>Accepted</span>
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center">
            <XCircle className="h-3 w-3 mr-1" />
            <span>Declined</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            <span>{status}</span>
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-nikkah-pink" />
      </div>
    );
  }

  if (requestedProfiles.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">You have not requested any profiles yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Your Requested Profiles ({requestedProfiles.length})</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {requestedProfiles.map((profile) => (
          <Card key={profile.id} className="overflow-hidden relative">
            <div className="absolute top-2 right-2 z-10">{getStatusBadge(profile.status)}</div>
            <div className="aspect-square overflow-hidden bg-gray-100 flex items-center justify-center">
              {profile.profiles.photos && profile.profiles.photos.length > 0 ? (
                isUserFemale ? (
                  // FEMALE view: Always show photo clearly
                  <img src={profile.profiles.photos[0]} alt="Profile Photo" className="w-full h-full object-cover" />
                ) : (
                  // MALE view: blur if not accepted
                  profile.status === 'accepted' ? (
                    <img src={profile.profiles.photos[0]} alt="Profile Photo" className="w-full h-full object-cover" />
                  ) : (
                    <img src={profile.profiles.photos[0]} alt="Profile Photo" className="w-full h-full object-cover blur-md" />
                  )
                )
              ) : (
                <Avatar className="h-16 w-16">
                  <AvatarFallback>
                    <User className="h-10 w-10 text-gray-400" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-lg">{profile.profiles.first_name || 'Anonymous'}</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">{profile.profiles.country || 'Location not specified'}</p>
              <p className="text-xs text-gray-500 mt-1">Requested on {new Date(profile.created_at).toLocaleDateString()}</p>
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <Button variant="outline" onClick={() => handleViewProfile(profile.profiles.id)} className="w-full">
                <Eye className="mr-1 h-4 w-4" />
                View Profile
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RequestedProfiles;
