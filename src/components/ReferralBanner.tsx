
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share, Gift, Copy, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const ReferralBanner = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const userGender = user?.user_metadata?.gender || '';
  
  const handleShareOnWhatsApp = () => {
    if (!user) return;
    
    const referralLink = `https://app.nikkahfirst.com/signup?ref=${user.id}`;
    let message = '';
    
    if (userGender === 'male') {
      message = encodeURIComponent(
        `Assalamu Alaikum brother! Join me on NikkahFirst, the best app for Muslims to find a spouse. Sign up using my referral link! ${referralLink}`
      );
    } else {
      message = encodeURIComponent(
        `Assalamu Alaikum sister! Join me on NikkahFirst, the best app for Muslim women to find a spouse. Sign up using my referral link! ${referralLink}`
      );
    }
    
    window.open(`https://wa.me/?text=${message}`, "_blank");
    
    toast({
      title: "WhatsApp Share",
      description: "Opening WhatsApp to share your referral link",
    });
  };
  
  const copyToClipboard = () => {
    if (!user) return;
    
    const referralLink = `https://app.nikkahfirst.com/signup?ref=${user.id}`;
    navigator.clipboard.writeText(referralLink);
    
    toast({
      title: "Referral Link Copied",
      description: "Your referral link has been copied to clipboard",
    });
  };
  
  const getBonusAmount = () => {
    return userGender === 'male' ? '5' : '2';
  };
  
  const getReferralMessage = () => {
    if (userGender === 'male') {
      return 'Refer a brother to NikkahFirst and help them find their spouse';
    } else {
      return 'Refer a sister to NikkahFirst and help them find their spouse';
    }
  };
  
  const getBackgroundClasses = () => {
    return userGender === 'male' 
      ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-nikkah-pink' 
      : 'bg-gradient-to-r from-pink-400 via-rose-400 to-nikkah-pink';
  };

  // Only render the banner when user is logged in
  if (!user) return null;
  
  return (
    <Card className={`border-none shadow-lg ${getBackgroundClasses()} text-white animate-gradient-x overflow-hidden`}>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <Gift className="h-6 w-6 mr-2" />
              <h3 className="text-xl font-bold">Share NikkahFirst</h3>
            </div>
            <p className="mb-4">
              {getReferralMessage()} <br className="inline sm:hidden" />
              <span className="font-bold text-lg bg-white text-nikkah-pink px-2 py-0.5 rounded inline-block mt-1">Help others</span> find their perfect match!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleShareOnWhatsApp}
                className="bg-green-500 hover:bg-green-600 text-white" 
                size="sm"
              >
                <Share className="h-4 w-4 mr-2" />
                Share on WhatsApp
              </Button>
              
              <Button
                onClick={copyToClipboard}
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 border border-white/40"
                size="sm"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Referral Link
              </Button>
            </div>
          </div>
          
          <div className="hidden md:block">
            <div className="relative">
              <Gift className="h-16 w-16" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralBanner;
