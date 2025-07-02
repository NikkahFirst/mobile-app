import React, { useState } from "react";
import CountdownTimer from "./CountdownTimer";
import { Button } from "@/components/ui/button";
import { Flame, Clock, Sparkles, Tag } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import PaymentDialog from "./PaymentDialog";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface LimitedTimeOfferProps {
  onPurchase: () => void;
  isExpired?: boolean;
  deadline: Date;
}


const LimitedTimeOffer: React.FC<LimitedTimeOfferProps> = ({ 
  onPurchase,
  isExpired = false,
  deadline
}) => {


  
  const [localExpired, setLocalExpired] = useState(isExpired);
  const isMobile = useIsMobile();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  /*console.log("LimitedTimeOffer: Current time:", new Date().toISOString());
  console.log("LimitedTimeOffer: End date:", endDate.toISOString());
  console.log("LimitedTimeOffer: Is expired:", localExpired);*/
  
  const handleExpire = () => {
    console.log("LimitedTimeOffer: Handling expiry");
    setLocalExpired(true);
  };
  
  const handlePurchase = () => {
    setShowPaymentDialog(true);
  };
  
  const handleClosePaymentDialog = () => {
    setShowPaymentDialog(false);
  };
  
  const handlePaymentSuccess = () => {
    setShowPaymentDialog(false);
    toast({
      title: "Purchase Successful!",
      description: "You now have unlimited access to NikkahFirst!",
    });
    onPurchase();
    navigate("/dashboard?success=true");
  };
  
  if (localExpired) {
    return null;
  }
  
  if (isMobile) {
    return (
      <>
        <div className="bg-gradient-to-r from-nikkah-pink to-nikkah-blue text-white rounded-lg overflow-hidden shadow-lg mb-8 relative">
          <div className="absolute -right-8 top-4 bg-yellow-500 text-black font-bold px-10 py-1 transform rotate-45 shadow-md z-10">
            50% OFF
          </div>
          
          <div className="p-5 pt-8">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="h-5 w-5 text-yellow-300" />
              <h3 className="text-lg font-bold">Limited Time Offer</h3>
            </div>
            
            <h2 className="text-2xl font-extrabold mb-3">Lifetime Unlimited Access</h2>
            
            <div className="flex items-center gap-3 mb-4">
              <Tag className="h-5 w-5 text-yellow-300" />
              <div className="flex items-center">
                <p className="text-3xl font-bold">£49.99</p>
                <p className="text-lg line-through text-white/70 ml-2">£99.99</p>
              </div>
            </div>
            
            <p className="mb-4 text-white/90 font-medium">
              Get unlimited requests for life at an incredible discount. Don't miss out!
            </p>
            
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-yellow-300" />
                <p className="font-medium text-sm">Offer Ends In:</p>
              </div>
              <CountdownTimer targetDate={deadline} onExpire={handleExpire} />
            </div>
            
            <Button 
              onClick={handlePurchase} 
              size="lg"
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-lg py-6"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Get This Deal Now
            </Button>
          </div>
        </div>
        
        <PaymentDialog
          open={showPaymentDialog}
          onClose={handleClosePaymentDialog}
          onSuccess={handlePaymentSuccess}
          planName="Limited Offer - Unlimited Plan"
          planPrice="£49.99"
          requestsAmount={999999}
        />
      </>
    );
  }
  
  return (
    <>
      <div className="bg-gradient-to-r from-nikkah-pink to-nikkah-blue text-white rounded-lg overflow-hidden shadow-lg mb-8">
        <div className="p-4 sm:p-6 relative">
          <div className="absolute right-0 top-0 bg-yellow-500 text-black font-bold px-3 py-1 rounded-bl-lg">
            50% OFF
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="h-5 w-5 text-yellow-300" />
                <h3 className="text-xl font-bold">Limited Time Offer</h3>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">Lifetime Unlimited Access</h2>
              <p className="mb-2 text-white/90">
                Get unlimited requests for life at an incredible 50% discount.
              </p>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-2xl font-bold">£49.99</p>
                <p className="text-lg line-through text-white/70">£99.99</p>
              </div>
              
              <Button 
                onClick={handlePurchase} 
                size="lg"
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Get This Deal Now
              </Button>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-yellow-300" />
                <p className="font-semibold">Offer Ends In:</p>
              </div>
              <CountdownTimer targetDate={deadline} onExpire={handleExpire} />
            </div>
          </div>
        </div>
      </div>
      
      <PaymentDialog
        open={showPaymentDialog}
        onClose={handleClosePaymentDialog}
        onSuccess={handlePaymentSuccess}
        planName="Limited Offer - Unlimited Plan"
        planPrice="£49.99"
        requestsAmount={999999}
      />
    </>
  );
};

export default LimitedTimeOffer;
