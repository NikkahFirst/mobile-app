
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Check, X, Eye } from "lucide-react";
import { getPendingMatchRequests, updateMatchRequest } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useIsFreemium } from "@/utils/freemiumUtils";
import UpgradeDialog from "@/components/UpgradeDialog";

interface MatchRequest {
  id: string;
  requester_id: string;
  status: string;
  created_at: string;
  profiles: {
    id: string;
    first_name: string | null;
    photos: string[] | null;
    country: string | null;
    date_of_birth: string | null;
    signedPhotoUrl?: string | null;
  };
}

const calculateAge = (dob: string | null): number | null => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const MatchRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isFreemium = useIsFreemium();
  const [matchRequests, setMatchRequests] = useState<MatchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradeAction, setUpgradeAction] = useState<'accept' | 'decline'>('accept');

  useEffect(() => {
    fetchMatchRequests();
  }, [user]);

  const fetchMatchRequests = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await getPendingMatchRequests();

    if (error) {
      console.error("Error fetching match requests:", error);
      toast({
        title: "Error",
        description: "Failed to load match requests. Please try again.",
        variant: "destructive",
      });
    } else if (data) {
      const requestsWithSignedPhotos = await Promise.all(
        (data as MatchRequest[]).map(async (request) => {
          if (request.profiles.photos && request.profiles.photos.length > 0) {
            const { data: signedData, error: signedError } = await supabase
              .storage
              .from('profile-pictures')
              .createSignedUrl(request.profiles.photos[0], 60 * 60);

            if (signedData?.signedUrl) {
              return {
                ...request,
                profiles: {
                  ...request.profiles,
                  signedPhotoUrl: signedData.signedUrl,
                },
              };
            } else {
              console.error("Error creating signed URL for match request:", signedError?.message);
            }
          }
          return request;
        })
      );

      setMatchRequests(requestsWithSignedPhotos);
    }

    setLoading(false);
  };

  const handleRequestResponse = async (requestId: string, status: 'accepted' | 'rejected') => {
    // Critical freemium check - prevent freemium users from accepting/declining
    if (isFreemium) {
      setUpgradeAction(status);
      setShowUpgradeDialog(true);
      return;
    }

    try {
      setProcessingRequests(prev => new Set([...prev, requestId]));
      
      console.log(`Processing ${status} for request ${requestId}`);
      const { data, error } = await updateMatchRequest(requestId, status);
      
      if (error) {
        console.error(`Error ${status} match request:`, error);
        toast({
          title: "Error",
          description: `Failed to ${status} match request. Please try again.`,
          variant: "destructive",
        });
        setProcessingRequests(prev => {
          const newSet = new Set(prev);
          newSet.delete(requestId);
          return newSet;
        });
        return;
      }
      
      console.log(`Successfully ${status} request:`, data);
      
      setMatchRequests(prev => prev.filter(request => request.id !== requestId));
      
      toast({
        title: status === 'accepted' ? "Match Accepted" : "Request Declined",
        description: status === 'accepted' 
          ? "You've accepted the match request! You can now view this match in your matches tab." 
          : "You've declined the match request.",
      });
      
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    } catch (error) {
      console.error(`Error ${status} match request:`, error);
      toast({
        title: "Error",
        description: `An unexpected error occurred. Please try again.`,
        variant: "destructive",
      });
      
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleViewProfile = (profileId: string) => {
    navigate(`/profile/${profileId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-nikkah-pink"></div>
      </div>
    );
  }

  if (matchRequests.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">You have no pending match requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {matchRequests.map((request) => (
          <Card key={request.id} className="overflow-hidden">
            <div className="aspect-square overflow-hidden bg-gray-100 flex items-center justify-center">
              {request.profiles.photos && request.profiles.photos.length > 0 ? (
                <img 
                  src={request.profiles.signedPhotoUrl || '/default-user.png'} 
                  alt={`${request.profiles.first_name || "Anonymous"}`} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <User className="h-16 w-16 text-gray-400" />
              )}
            </div>
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <span className="text-gray-900">{request.profiles.first_name || 'Anonymous'}</span>
                {request.profiles.date_of_birth && (
                  <span className="text-gray-600 text-base font-normal bg-gray-100 px-2 py-0.5 rounded-md">
                    {calculateAge(request.profiles.date_of_birth)} yrs
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">
                {request.profiles.country || 'Location not specified'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Requested on {new Date(request.created_at).toLocaleDateString()}
              </p>
            </CardContent>
            <CardFooter className="p-4 pt-0 flex flex-col gap-2">
  <Button 
    onClick={() => handleRequestResponse(request.id, 'accepted')}
    className={`w-full ${isFreemium ? 'bg-orange-500 hover:bg-orange-600' : 'bg-nikkah-pink hover:bg-nikkah-pink/90'}`}
    disabled={processingRequests.has(request.id)}
  >
    {processingRequests.has(request.id) ? (
      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
    ) : (
      <Check className="mr-1 h-4 w-4" />
    )}
    {isFreemium ? 'Upgrade to Accept' : 'Accept'}
  </Button>

  <Button 
    onClick={() => handleRequestResponse(request.id, 'rejected')}
    variant="outline" 
    className={`w-full ${isFreemium ? 'border-orange-500 text-orange-500 hover:bg-orange-50' : ''}`}
    disabled={processingRequests.has(request.id)}
  >
    {processingRequests.has(request.id) ? (
      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-600"></div>
    ) : (
      <X className="mr-1 h-4 w-4" />
    )}
    {isFreemium ? 'Upgrade to Decline' : 'Decline'}
  </Button>

  <Button
    variant="outline"
    onClick={() => handleViewProfile(request.profiles.id)}
    className="w-full"
  >
    <Eye className="mr-1 h-4 w-4" />
    View Full Profile
  </Button>
</CardFooter>

          </Card>
        ))}
      </div>

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        feature={upgradeAction === 'accept' ? 'accept match requests' : 'decline match requests'}
      />
    </div>
  );
};

export default MatchRequests;
