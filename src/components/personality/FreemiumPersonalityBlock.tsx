
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FreemiumPersonalityBlock = () => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    navigate('/shop');
  };

  return (
    <div className="p-4 space-y-6">
      {/* Main Content Card with Overlay */}
      <div className="relative">
        {/* Background Content (Blurred) */}
        <Card className="bg-gradient-to-r from-pink-50 to-blue-50 p-6 shadow-sm rounded-xl">
          <h2 className="text-xl md:text-2xl font-semibold mb-1">AI Personality Matching</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Discover your Islamic personality type and find your perfect match.
          </p>
          
          {/* Dummy content to make it look more realistic */}
          <div className="space-y-4">
            <div className="h-12 bg-gray-100 rounded-lg"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-100 rounded w-3/4"></div>
              <div className="h-4 bg-gray-100 rounded w-1/2"></div>
              <div className="h-4 bg-gray-100 rounded w-2/3"></div>
            </div>
          </div>
        </Card>
        
        {/* Blur and Lock Overlay */}
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <div className="text-center p-6 max-w-sm">
            <div className="mb-6">
              <Lock className="h-16 w-16 text-nikkah-pink mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Unlock AI Personality Matching
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Discover your Islamic personality type and find compatible matches based on deep personality insights.
              </p>
            </div>
            
            <Button 
              onClick={handleUpgrade}
              className="bg-nikkah-pink hover:bg-nikkah-pink/90 text-white px-6 py-3 rounded-full font-medium flex items-center mx-auto"
            >
              <Crown className="h-5 w-5 mr-2" />
              Upgrade to Premium
            </Button>
          </div>
        </div>
      </div>
      
      {/* Additional blurred content cards */}
      <div className="space-y-4 opacity-50">
        <Card className="p-6">
          <div className="h-20 bg-gray-100 rounded-lg"></div>
        </Card>
        
        <Card className="p-6">
          <div className="space-y-3">
            <div className="h-4 bg-gray-100 rounded w-3/4"></div>
            <div className="h-4 bg-gray-100 rounded w-1/2"></div>
            <div className="h-4 bg-gray-100 rounded w-2/3"></div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default FreemiumPersonalityBlock;
