
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Check, X, Eye, ExternalLink } from "lucide-react";
import { getPendingPhotoRequests, updatePhotoRequest, supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface PhotoRequest {
  id: string;
  requester_id: string;
  status: string;
  created_at: string;
  profiles: {
    id: string;
    first_name: string | null;
    photos: string[] | null;
    country: string | null;
  };
}

const PhotoRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [photoRequests, setPhotoRequests] = useState<PhotoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPhotoRequests();
  }, [user]);

  const fetchPhotoRequests = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Direct query approach since the join is having issues
      const { data: pendingRequests, error: requestsError } = await supabase
        .from('photo_reveal_requests')
        .select('*')
        .eq('requested_id', user.id)
        .eq('status', 'pending');
      
      if (requestsError) {
        console.error("Error fetching photo reveal requests:", requestsError);
        toast({
          title: "Error",
          description: "Failed to load photo reveal requests. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      // If we have pending requests, fetch the requester profiles
      if (pendingRequests && pendingRequests.length > 0) {
        const requestsWithProfiles = await Promise.all(
          pendingRequests.map(async (request) => {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('id, first_name, photos, country')
              .eq('id', request.requester_id)
              .single();
            
            if (profileError) {
              console.error("Error fetching requester profile:", profileError);
              return null;
            }
            
            return {
              ...request,
              profiles: profileData
            };
          })
        );
        
        // Filter out any null results from failed profile fetches
        const validRequests = requestsWithProfiles.filter(request => request !== null) as PhotoRequest[];
        console.log("Processed photo requests:", validRequests);
        setPhotoRequests(validRequests);
      } else {
        setPhotoRequests([]);
      }
    } catch (err) {
      console.error("Exception when fetching photo requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResponse = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      // Mark this request as processing
      setProcessingRequests(prev => new Set([...prev, requestId]));
      
      console.log(`Processing ${status} for photo request ${requestId}`);
      const { data, error } = await updatePhotoRequest(requestId, status);
      
      if (error) {
        console.error(`Error ${status} photo reveal request:`, error);
        toast({
          title: "Error",
          description: `Failed to ${status} photo reveal request. Please try again.`,
          variant: "destructive",
        });
        // Remove from processing set
        setProcessingRequests(prev => {
          const newSet = new Set(prev);
          newSet.delete(requestId);
          return newSet;
        });
        return;
      }
      
      console.log(`Successfully ${status} request:`, data);
      
      // Remove the request from the list
      setPhotoRequests(prev => prev.filter(request => request.id !== requestId));
      
      toast({
        title: status === 'accepted' ? "Request Accepted" : "Request Declined",
        description: status === 'accepted' 
          ? "You've accepted the photo reveal request. They can now view your photos." 
          : "You've declined the photo reveal request.",
      });
      
      // Remove from processing set
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    } catch (error) {
      console.error(`Error ${status} photo reveal request:`, error);
      toast({
        title: "Error",
        description: `An unexpected error occurred. Please try again.`,
        variant: "destructive",
      });
      
      // Remove from processing set
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

  if (photoRequests.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">You have no pending photo reveal requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Photo Reveal Requests ({photoRequests.length})</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {photoRequests.map((request) => (
          <Card key={request.id} className="overflow-hidden">
            <div className="aspect-square overflow-hidden bg-gray-100 flex items-center justify-center">
              {request.profiles.photos && request.profiles.photos.length > 0 ? (
                <img 
                  src={request.profiles.photos[0]} 
                  alt={`${request.profiles.first_name}`} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <User className="h-16 w-16 text-gray-400" />
              )}
            </div>
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-lg">
                {request.profiles.first_name || 'Anonymous'} 
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">
                {request.profiles.country || 'Location not specified'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Requested on {new Date(request.created_at).toLocaleDateString()}
              </p>
              <p className="text-sm mt-2">
                <Eye className="inline-block h-4 w-4 mr-1 text-nikkah-blue" />
                Wants to view your photos
              </p>
            </CardContent>
            <CardFooter className="p-4 pt-0 flex gap-2 flex-col">
              <div className="flex gap-2 w-full">
                <Button 
                  onClick={() => handleRequestResponse(request.id, 'accepted')}
                  className="flex-1 bg-nikkah-pink hover:bg-nikkah-pink/90"
                  disabled={processingRequests.has(request.id)}
                >
                  {processingRequests.has(request.id) ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    <Check className="mr-1 h-4 w-4" />
                  )}
                  Accept
                </Button>
                <Button 
                  onClick={() => handleRequestResponse(request.id, 'rejected')}
                  variant="outline" 
                  className="flex-1"
                  disabled={processingRequests.has(request.id)}
                >
                  {processingRequests.has(request.id) ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-600"></div>
                  ) : (
                    <X className="mr-1 h-4 w-4" />
                  )}
                  Decline
                </Button>
              </div>
              <Button 
                onClick={() => handleViewProfile(request.profiles.id)}
                variant="secondary" 
                className="w-full"
              >
                <ExternalLink className="mr-1 h-4 w-4" />
                View Profile
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PhotoRequests;
