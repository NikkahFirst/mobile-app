
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Eye, Clock, CheckCircle, XCircle } from "lucide-react";
import { getOutgoingPhotoRequests, supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface PhotoRequestOutgoing {
  id: string;
  requested_id: string;
  status: string;
  created_at: string;
  profiles: {
    id: string;
    first_name: string | null;
    photos: string[] | null;
    country: string | null;
  };
}

const PhotoRequestsOutgoing = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [photoRequests, setPhotoRequests] = useState<PhotoRequestOutgoing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPhotoRequests();
  }, [user]);

  const fetchPhotoRequests = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Direct query approach since the join is having issues
      const { data: outgoingRequests, error: requestsError } = await supabase
        .from('photo_reveal_requests')
        .select('*')
        .eq('requester_id', user.id);
      
      if (requestsError) {
        console.error("Error fetching outgoing photo requests:", requestsError);
        toast({
          title: "Error",
          description: "Failed to load outgoing photo requests. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      // If we have requests, fetch the requested profiles
      if (outgoingRequests && outgoingRequests.length > 0) {
        const requestsWithProfiles = await Promise.all(
          outgoingRequests.map(async (request) => {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('id, first_name, photos, country')
              .eq('id', request.requested_id)
              .single();
            
            if (profileError) {
              console.error("Error fetching requested profile:", profileError);
              return null;
            }
            
            return {
              ...request,
              profiles: profileData
            };
          })
        );
        
        // Filter out any null results from failed profile fetches
        const validRequests = requestsWithProfiles.filter(request => request !== null) as PhotoRequestOutgoing[];
        console.log("Processed outgoing photo requests:", validRequests);
        setPhotoRequests(validRequests);
      } else {
        setPhotoRequests([]);
      }
    } catch (err) {
      console.error("Exception when fetching outgoing photo requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = (profileId: string) => {
    navigate(`/profile/${profileId}`);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending':
        return (
          <div className="flex items-center text-yellow-600">
            <Clock className="h-4 w-4 mr-1" />
            <span>Pending</span>
          </div>
        );
      case 'accepted':
        return (
          <div className="flex items-center text-green-600">
            <CheckCircle className="h-4 w-4 mr-1" />
            <span>Accepted</span>
          </div>
        );
      case 'rejected':
        return (
          <div className="flex items-center text-red-600">
            <XCircle className="h-4 w-4 mr-1" />
            <span>Declined</span>
          </div>
        );
      case 'matched':
        return (
          <div className="flex items-center text-blue-600">
            <CheckCircle className="h-4 w-4 mr-1" />
            <span>Matched - Photos Visible</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center text-gray-600">
            <Clock className="h-4 w-4 mr-1" />
            <span>{status}</span>
          </div>
        );
    }
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
        <p className="text-gray-500">You have no outgoing photo reveal requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Your Photo Requests ({photoRequests.length})</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {photoRequests.map((request) => (
          <Card key={request.id} className="overflow-hidden">
            <div className="aspect-square overflow-hidden bg-gray-100 flex items-center justify-center">
              {request.profiles.photos && request.profiles.photos.length > 0 && request.status === 'accepted' ? (
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
              <div className="mt-2">
                {getStatusBadge(request.status)}
              </div>
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <Button
                variant="outline"
                onClick={() => handleViewProfile(request.profiles.id)}
                className="w-full"
              >
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

export default PhotoRequestsOutgoing;
