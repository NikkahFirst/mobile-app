
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ChevronLeft } from "lucide-react";
import PaymentDialog from "@/components/PaymentDialog";

const MobileCheckout = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const { user, checkSubscription } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isFirstPurchase, setIsFirstPurchase] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [verifyAttempts, setVerifyAttempts] = useState(0);

  const planName = searchParams.get("plan") || "Monthly Plan";
  const planPrice = searchParams.get("price") || "£9.99";
  const requestsAmount = parseInt(searchParams.get("requests") || "10", 10);

  useEffect(() => {
    // Check if this is the first purchase
    const checkPurchaseHistory = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('subscription_plan, has_received_initial_allocation, referred_by')
            .eq('id', user.id)
            .single();
            
          if (!error && data) {
            setIsFirstPurchase(!data.subscription_plan || data.subscription_plan === "" || !data.has_received_initial_allocation);
            console.log("Purchase history check:", { 
              hasSubscription: !!data.subscription_plan && data.subscription_plan !== "", 
              receivedInitialAllocation: data.has_received_initial_allocation,
              isFirstPurchase: !data.subscription_plan || data.subscription_plan === "" || !data.has_received_initial_allocation,
              referredBy: data.referred_by
            });
            
            // Process referral if this is first purchase and user has a referral code
            if (isFirstPurchase && data.referred_by) {
              console.log("First purchase with referral code, will process after payment");
            }
          }
        } catch (e) {
          console.error("Error checking purchase history:", e);
        }
      }
    };
    
    checkPurchaseHistory();
    
    const savedPaymentState = localStorage.getItem('nikkahFirstPaymentState');
    if (savedPaymentState) {
      try {
        const paymentState = JSON.parse(savedPaymentState);
        if (paymentState.inProgress) {
          console.log("Found in-progress payment on mobile checkout:", paymentState);
          setPaymentDialogOpen(true);
        }
      } catch (e) {
        console.error("Error parsing saved payment state:", e);
      }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const redirectStatus = urlParams.get("redirect_status");
    const success = urlParams.get("success");

    if (redirectStatus === "succeeded" || success === "true") {
      handlePaymentSuccess();
      return;
    }

    setTimeout(() => {
      setLoading(false);
      setPaymentDialogOpen(true);
    }, 300);
  }, [user]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("Page became visible again in mobile checkout");
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("success") === "true") {
          handlePaymentSuccess();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const verifyPaymentStatus = async () => {
    if (!user) return false;
    
    try {
      setVerifyingPayment(true);
      setVerifyAttempts(prev => prev + 1);
      
      // Get payment state with paymentIntentId or subscriptionId from localStorage
      const savedState = localStorage.getItem('nikkahFirstPaymentState');
      if (!savedState) {
        console.log("No payment state found for verification");
        return false;
      }
      
      const paymentState = JSON.parse(savedState);
      
      console.log("Verifying payment with details:", {
        paymentIntentId: paymentState.paymentIntentId,
        setupIntentId: paymentState.setupIntentId,
        subscriptionId: paymentState.subscriptionId,
        userId: user.id,
        planName,
        planPrice
      });
      
      const { data, error } = await supabase.functions.invoke('check-payment-status', {
        body: { 
          paymentIntentId: paymentState.paymentIntentId,
          setupIntentId: paymentState.setupIntentId,
          subscriptionId: paymentState.subscriptionId,
          userId: user.id,
          planName,
          planPrice,
          skipEmail: true // Add skipEmail parameter to prevent duplicate emails
        }
      });
      
      if (error) {
        console.error("Error verifying payment:", error);
        
        // If we've tried too many times, assume success (webhook will handle it)
        if (verifyAttempts > 3) {
          toast({
            title: "Payment Processing",
            description: "Your payment is being processed. It may take a moment to be reflected in your account.",
          });
          
          // Force a subscription check
          if (checkSubscription) {
            await checkSubscription();
          }
          
          return true;
        }
        
        return false;
      }
      
      console.log("Payment verification response:", data);
      
      if (data.success) {
        // If payment was successful, check the user's subscription status and update it
        if (checkSubscription) {
          await checkSubscription();
        }
        
        // If this is the first purchase and there's a referral code, process it
        if (isFirstPurchase) {
          const { data: userData } = await supabase
            .from('profiles')
            .select('referred_by')
            .eq('id', user.id)
            .single();
            
          if (userData?.referred_by) {
            console.log("Processing referral after successful first purchase:", userData.referred_by);
            try {
              // Use skipEmail=true to prevent duplicate emails
              await supabase.functions.invoke('process-referral', {
                body: { userId: user.id, referralCode: userData.referred_by, skipEmail: true }
              });
              console.log("Successfully processed referral after payment");
            } catch (err) {
              console.error("Error processing referral after payment:", err);
            }
          }
        }
        
        return true;
      }
      
      // If we've tried too many times, assume success (webhook will handle it)
      if (verifyAttempts > 3) {
        toast({
          title: "Payment Processing",
          description: "Your payment is being processed. It may take a moment to be reflected in your account.",
        });
        
        // Force a subscription check
        if (checkSubscription) {
          await checkSubscription();
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error in payment verification:", error);
      
      // If we've tried too many times, assume success (webhook will handle it)
      if (verifyAttempts > 3) {
        toast({
          title: "Payment Processing",
          description: "Your payment is being processed. It may take a moment to be reflected in your account.",
        });
        
        // Force a subscription check
        if (checkSubscription) {
          await checkSubscription();
        }
        
        return true;
      }
      
      return false;
    } finally {
      setVerifyingPayment(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setPaymentSuccess(true);
    setPaymentDialogOpen(false);
    
    // Before verification, log the plan details for debugging
    console.log(`Payment success for plan: ${planName}, price: ${planPrice}`);
    
    // Verify payment status
    const verified = await verifyPaymentStatus();
    
    if (verified) {
      toast({
        title: "Payment Successful",
        description: `You've successfully purchased the ${planName}!`,
      });
    } else {
      toast({
        title: "Payment Processed",
        description: `Your payment for ${planName} is being processed.`,
      });
    }
    
    localStorage.removeItem('nikkahFirstPaymentState');
    
    // Always redirect to dashboard after purchase
    setTimeout(() => {
      navigate("/dashboard?success=true");
    }, 800);
  };

  const handlePaymentDialogClose = () => {
    if (processingPayment || verifyingPayment) return;
    
    setPaymentDialogOpen(false);
    
    if (paymentSuccess) {
      navigate("/dashboard?success=true");
    } else {
      navigate("/shop");
    }
  };

  const handleProceedToCheckout = () => {
    setProcessingPayment(true);
    
    setTimeout(() => {
      setPaymentDialogOpen(true);
      setProcessingPayment(false);
    }, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-nikkah-pink" />
          <p>Preparing your checkout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Checkout Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>{error}</p>
            <Button onClick={() => navigate("/shop")} className="w-full">
              Return to Shop
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4">
        <div className="container flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
            disabled={processingPayment || verifyingPayment}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          
          <div className="flex items-center gap-2">
            <img 
              src="/lovable-uploads/35ae8a8d-0a2d-496e-9894-ed867e4bd95b.png" 
              alt="NikkahFirst Logo" 
              className="h-10" 
            />
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </Button>
        </div>
      </div>

      <div className="container py-8 max-w-6xl mx-auto flex-grow">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Checkout</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Complete your purchase to get access to more requests.
          </p>
        </div>

        <Card className="flex-1 w-full max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>
              {planName} - {planPrice}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full bg-nikkah-pink hover:bg-nikkah-pink/90"
              onClick={handleProceedToCheckout}
              disabled={processingPayment || verifyingPayment}
            >
              {processingPayment || verifyingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {verifyingPayment ? "Verifying Payment..." : "Processing..."}
                </>
              ) : (
                "Proceed to Checkout"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <PaymentDialog
        open={paymentDialogOpen}
        onClose={handlePaymentDialogClose}
        onSuccess={handlePaymentSuccess}
        planName={planName}
        planPrice={planPrice}
        requestsAmount={requestsAmount}
      />
    </div>
  );
};

export default MobileCheckout;
