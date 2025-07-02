
import { useState, useEffect } from "react";
import { Eye, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFreemiumViewsRemaining } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const FreemiumViewBanner = () => {
  const [viewsRemaining, setViewsRemaining] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchViewsRemaining = async () => {
      const remaining = await getFreemiumViewsRemaining();
      if (remaining < 999) { // Only show for freemium users
        setViewsRemaining(remaining);
      }
    };

    fetchViewsRemaining();
  }, []);

  if (viewsRemaining === null || viewsRemaining >= 999) {
    return null;
  }

  const handleUpgrade = () => {
    navigate('/shop');
  };

  return (
    <div className="bg-gradient-to-r from-nikkah-pink/10 to-purple-100 border border-nikkah-pink/20 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Eye className="h-4 w-4 text-nikkah-pink" />
          <span className="text-sm font-medium text-gray-700">
            {viewsRemaining} profile views remaining today
          </span>
        </div>
        
        <Button
          onClick={handleUpgrade}
          size="sm"
          className="bg-nikkah-pink hover:bg-nikkah-pink/90 text-white text-xs px-3 py-1 h-7"
        >
          <Crown className="h-3 w-3 mr-1" />
          Unlimited
        </Button>
      </div>
    </div>
  );
};

export default FreemiumViewBanner;
