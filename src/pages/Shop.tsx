import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Check, Package, Infinity, Sparkles, AlertTriangle, ArrowUpDown, ChevronLeft } from "lucide-react";
import PaymentDialog from "@/components/PaymentDialog";
import LimitedTimeOffer from "@/components/LimitedTimeOffer";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";



const Shop = () => {
  const [showUpgradeConfirm, setShowUpgradeConfirm] = useState(false);
  const [pendingPlan, setPendingPlan] = useState("");
  const { user, checkSubscription } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [userGender, setUserGender] = useState<string | null>(null);
  const [requestsRemaining, setRequestsRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  
  const [selectedPlan, setSelectedPlan] = useState<{
    name: string;
    price: string;
    requests: number;
  } | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<{
    plan: string;
    status: string;
    id: string | null;
  }>({ plan: "", status: "", id: null });
  const [isCancelling, setIsCancelling] = useState(false);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [nextRenewalDate, setNextRenewalDate] = useState<string | null>(null);
  const [isCancelled, setIsCancelled] = useState(false);
  const [showCancelSuccessDialog, setShowCancelSuccessDialog] = useState(false);
  const [isFirstPurchase, setIsFirstPurchase] = useState(false);
  const [limitedTimeDeadline, setLimitedTimeDeadline] = useState<Date | null>(null);

  const isCurrentPlan = (planName: string) => {
  return currentSubscription.status === "active" && currentSubscription.plan === planName && !isCancelled;
};



  const isOneTimePlan = (planName: string) => {
    return planName === "Unlimited Plan";
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        console.log("Fetching user data for user:", user.id);
        const { data, error } = await supabase
  .from('profiles')
  .select('gender, requests_remaining, subscription_plan, subscription_status, subscription_id, renewal_date, is_canceled, created_at')
  .eq('id', user.id)
  .single();

        
        if (error) throw error;
        
        if (data) {
          if (data.created_at) {
  const createdAt = new Date(data.created_at);
  const deadline = new Date(createdAt);
  deadline.setDate(createdAt.getDate() + 3);
  setLimitedTimeDeadline(deadline);
}

          console.log("User data fetched:", data);
          setUserGender(data.gender);
          setRequestsRemaining(data.requests_remaining || 0);
          setIsCancelled(data.is_canceled || false);
          
          setIsFirstPurchase(!data.subscription_plan || data.subscription_plan === "");
          
          setCurrentSubscription({
            plan: data.subscription_plan || "",
            status: data.subscription_status || "inactive",
            id: data.subscription_id || null
          });
          
          if (data.renewal_date && !data.is_canceled) {
            setNextRenewalDate(new Date(data.renewal_date).toLocaleDateString());
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast({
          title: "Error",
          description: "Failed to load your profile data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [user, toast]);

  const isSubscriptionCancellable = (planName: string) => {
    return (planName === "Monthly Plan" || planName === "Annual Plan") && !isCancelled;
  };

  const handlePaymentSuccess = () => {
    setPaymentDialogOpen(false);
    toast({
      title: "Purchase Successful",
      description: selectedPlan ? `You've successfully purchased the ${selectedPlan.name}!` : "Purchase completed successfully!",
    });
    
    checkSubscription?.();
    
    navigate('/dashboard?success=true');
  };

  const handleSubscribe = (planName: string, requestsAmount: number, price: string) => {
    if (!user) return;
    
    setSelectedPlan({
      name: planName,
      price: price,
      requests: requestsAmount
    });
    setPaymentDialogOpen(true);
  };

  const handlePurchaseRequests = (quantity: number, price: string) => {
    if (!user) return;
    
    if (userGender === 'female') {
      setSelectedPlan({
        name: `${quantity} Requests`,
        price: price,
        requests: quantity
      });
      setPaymentDialogOpen(true);
    }
  };

  const handlePaymentDialogClose = () => {
    setPaymentDialogOpen(false);
    setSelectedPlan(null);
  };

  const handleCancelSubscription = async () => {
    if (!user || !currentSubscription.id) return;
    
    setIsCancelling(true);
    try {
      console.log("Attempting to cancel subscription:", currentSubscription.id, "for user:", user.id);
      
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: { 
          subscriptionId: currentSubscription.id,
          userId: user.id
        }
      });
      
      console.log("Cancel subscription response:", data, error);
      
      if (error) throw error;
      
      if (data && data.success) {
        setCurrentSubscription(prev => ({ 
          ...prev, 
          status: 'active',
          id: null
        }));
        setIsCancelled(true);
        
        setShowCancelSuccessDialog(true);
      } else {
        throw new Error(data?.error || "Failed to cancel subscription");
      }
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast({
        title: "Error",
        description: "Failed to cancel your subscription. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleChangePlan = async (newPlanName: string) => {
  if (!user || !currentSubscription.id || currentSubscription.plan === newPlanName) return;

  setIsChangingPlan(true);
  try {
    // 👇 This is the original function call
    const { data, error } = await supabase.functions.invoke('change-subscription-plan', {
      body: { 
        current_subscription_id: currentSubscription.id,
        new_plan_name: newPlanName,
        user_id: user.id 
      }
    });

    // ❌ You may not have this yet — we are ADDING this ↓
    console.log("change-subscription-plan response:", { data, error });

    if (error) throw error;

    setCurrentSubscription(prev => ({ ...prev, plan: newPlanName }));

    const isUpgrade = 
      (currentSubscription.plan === "Monthly Plan" && newPlanName === "Annual Plan") ||
      (["Monthly Plan", "Annual Plan"].includes(currentSubscription.plan) && newPlanName === "Unlimited Plan");

    toast({
      title: isUpgrade ? "Plan Upgraded" : "Plan Changed",
      description: `Your subscription has been ${isUpgrade ? 'upgraded' : 'changed'} to the ${newPlanName} successfully.`,
    });

    window.location.reload();

  } catch (error: any) {
    // ✅ You might already have this
    console.error("❌ Error changing subscription plan:", error);

    toast({
      title: "Error",
      description: error.message || "Failed to change your subscription plan. Please try again or contact support.",
      variant: "destructive",
    });
  } finally {
    setIsChangingPlan(false);
  }
};
const confirmUpgradeTo = (plan: string) => {
  setPendingPlan(plan);
  setShowUpgradeConfirm(true);
};

const executeUpgrade = () => {
  if (pendingPlan) {
    handleChangePlan(pendingPlan);
  }
  setShowUpgradeConfirm(false);
};


  const canUpgradeToAnnual = () => {
    return currentSubscription.status === "active" && 
           currentSubscription.plan === "Monthly Plan";
  };

  const canDowngradeToMonthly = () => {
    return currentSubscription.status === "active" && 
           currentSubscription.plan === "Annual Plan";
  };

  const handleLimitedTimeOffer = () => {
    if (!user) return;
    
    setSelectedPlan({
      name: "Limited Offer - Unlimited Plan",
      price: "£49.99",
      requests: 999999
    });
    setPaymentDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex justify-center items-center h-64 flex-grow">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nikkah-pink"></div>
        </div>
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
            className="flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
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
          <h1 className="text-3xl font-bold mb-2">Request Shop</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Purchase additional requests to connect with potential matches.
          </p>
          
          {limitedTimeDeadline &&
 !["Unlimited Plan", "Limited Offer - Unlimited Plan"].includes(currentSubscription.plan) &&
 (
  <LimitedTimeOffer 
    onPurchase={handleLimitedTimeOffer} 
    deadline={limitedTimeDeadline}
  />
)}


          
          {isCancelled && (
            <div className="mt-4 p-4 bg-orange-50 border-l-4 border-orange-500 dark:bg-orange-900/20 dark:border-orange-700 rounded-lg shadow-md">
              <div className="flex items-start">
                <AlertTriangle className="h-6 w-6 text-orange-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg text-orange-700 dark:text-orange-400">Subscription Cancelled</h3>
                  <p className="text-orange-700 dark:text-orange-300 mt-1">
                    Your subscription has been cancelled and will not renew at the end of your current billing period.
                    To continue using the service after that date, please select a new plan below.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="font-medium text-blue-600 dark:text-blue-400">
              Your current balance: <span className="font-bold">{requestsRemaining} requests</span>
            </p>
            {currentSubscription.status === 'active' && (
              <>
                <p className="font-medium text-green-600 dark:text-green-400 mt-2">
                  Active subscription: <span className="font-bold">
                    {currentSubscription.plan} {isCancelled ? "(Cancelled - Will not renew)" : ""}
                  </span>
                </p>
                {nextRenewalDate && !isCancelled && !isOneTimePlan(currentSubscription.plan) && (
                  <p className="font-medium text-blue-600 dark:text-blue-400 mt-1">
                    Next request allocation: <span className="font-bold">{nextRenewalDate}</span>
                  </p>
                )}
                {isOneTimePlan(currentSubscription.plan) && currentSubscription.status === 'active' && (
                  <p className="font-medium text-blue-600 dark:text-blue-400 mt-1">
                    Status: <span className="font-bold">Lifetime access</span>
                  </p>
                )}
                {isCancelled && (
                  <p className="font-medium text-orange-600 dark:text-orange-400 mt-1">
                    Status: <span className="font-bold">Will not renew</span>
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mx-auto max-w-5xl">
          <Card className={`overflow-hidden border-2 transition-all transform hover:scale-105 ${currentSubscription.plan === "Monthly Plan" && currentSubscription.status === "active" ? "border-green-500 shadow-green-200 dark:shadow-green-900/20" : "hover:border-nikkah-pink"}`}>
            <CardHeader className="bg-gradient-to-r from-nikkah-pink/10 to-nikkah-blue/10">
              <CardTitle>Monthly</CardTitle>
              <CardDescription>Try for a month</CardDescription>
              {currentSubscription.plan === "Monthly Plan" && currentSubscription.status === "active" && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${isCancelled ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100" : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"}`}>
                  <Check className="w-3 h-3 mr-1" /> {isCancelled ? "Cancelled" : "Active"}
                </span>
              )}
            </CardHeader>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold mb-4">£9.99<span className="text-sm font-normal">/month</span></p>
              <ul className="space-y-2 text-left mb-6">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  10 requests per month
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  Auto-renews monthly
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  Cancel anytime
                </li>
              </ul>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              {currentSubscription.plan === "Monthly Plan" && currentSubscription.status === "active" ? (
                <>
                  <Button 
                    className={`w-full ${isCancelled ? "bg-orange-500 hover:bg-orange-600 cursor-not-allowed opacity-70" : "bg-green-500 hover:bg-green-600"}`}
                    disabled={true}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    {isCancelled ? "Cancelled - Will not renew" : "Current Plan"}
                  </Button>
                  
                  {isSubscriptionCancellable(currentSubscription.plan) && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-300"
                        >
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Cancel Subscription
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            Cancel Subscription
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to cancel your subscription? You will maintain access until the end of your current billing period.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-500 hover:bg-red-600"
                            onClick={handleCancelSubscription}
                            disabled={isCancelling}
                          >
                            {isCancelling ? "Cancelling..." : "Yes, Cancel"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </>
              ) : (
                canDowngradeToMonthly() ? (
                  <Button 
                    className="w-full bg-orange-500 hover:bg-orange-600"
                    onClick={() => handleChangePlan("Monthly Plan")}
                    disabled={isChangingPlan}
                  >
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    {isChangingPlan ? "Processing..." : "Downgrade to Monthly"}
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-nikkah-pink hover:bg-nikkah-pink/90"
                    onClick={() => handleSubscribe("Monthly Plan", 10, "£9.99")}
                    disabled={currentSubscription.status === "active" && currentSubscription.plan === "Annual Plan"}

                  >
                    <Package className="mr-2 h-4 w-4" />
                    Subscribe
                  </Button>
                )
              )}
            </CardFooter>
          </Card>

          <Card className={`overflow-hidden border-2 transition-all transform hover:scale-105 ${currentSubscription.plan === "Annual Plan" && currentSubscription.status === "active" ? "border-green-500 shadow-green-200 dark:shadow-green-900/20" : "border-nikkah-pink shadow-lg"}`}>
            {!currentSubscription.plan && (
              <div className="absolute top-0 right-0 bg-nikkah-pink text-white text-xs font-bold py-1 px-3 rounded-bl">
                BEST VALUE
              </div>
            )}
            {currentSubscription.plan === "Annual Plan" && currentSubscription.status === "active" && !isCancelled && (
              <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold py-1 px-3 rounded-bl">
                ACTIVE PLAN
              </div>
            )}
            {currentSubscription.plan === "Annual Plan" && isCancelled && (
              <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold py-1 px-3 rounded-bl">
                CANCELLED
              </div>
            )}
            <CardHeader className="bg-gradient-to-r from-nikkah-pink/20 to-nikkah-blue/20">
              <CardTitle>Annual</CardTitle>
              <CardDescription>Save over 35%</CardDescription>
              {currentSubscription.plan === "Annual Plan" && currentSubscription.status === "active" && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${isCancelled ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100" : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"}`}>
                  <Check className="w-3 h-3 mr-1" /> {isCancelled ? "Cancelled" : "Active"}
                </span>
              )}
            </CardHeader>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold mb-4">£74.99<span className="text-sm font-normal">/year</span></p>
              <ul className="space-y-2 text-left mb-6">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  15 requests per month
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  Save £44.89 compared to monthly
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  Auto-renews yearly
                </li>
              </ul>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              {currentSubscription.plan === "Annual Plan" && currentSubscription.status === "active" ? (
                <>
                  <Button 
                    className={`w-full ${isCancelled ? "bg-orange-500 hover:bg-orange-600 cursor-not-allowed opacity-70" : "bg-green-500 hover:bg-green-600"}`}
                    disabled={true}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    {isCancelled ? "Cancelled - Will not renew" : "Current Plan"}
                  </Button>
                  
                  {!isCancelled && isSubscriptionCancellable(currentSubscription.plan) && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-300"
                        >
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Cancel Subscription
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            Cancel Subscription
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to cancel your subscription? You will maintain access until the end of your current billing period, even though you've paid for an annual plan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-500 hover:bg-red-600"
                            onClick={handleCancelSubscription}
                            disabled={isCancelling}
                          >
                            {isCancelling ? "Cancelling..." : "Yes, Cancel"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </>
              ) : (
                canUpgradeToAnnual() ? (
                  <Button 
  onClick={() => confirmUpgradeTo("Annual Plan")}
  className="w-full bg-blue-500 hover:bg-blue-600"
  disabled={isChangingPlan}
>
  <ArrowUpDown className="mr-2 h-4 w-4" />
  Upgrade to Annual
</Button>

                ) : (
                  <Button 
                    className="w-full bg-nikkah-pink hover:bg-nikkah-pink/90"
                    onClick={() => handleSubscribe("Annual Plan", 15, "£74.99")}
                    disabled={isCurrentPlan("Monthly Plan")}

                  >
                    <Package className="mr-2 h-4 w-4" />
                    Subscribe
                  </Button>
                )
              )}
            </CardFooter>
          </Card>

          <Card className={`overflow-hidden border-2 transition-all transform hover:scale-105 ${currentSubscription.plan === "Unlimited Plan" && currentSubscription.status === "active" ? "border-green-500 shadow-green-200 dark:shadow-green-900/20" : "hover:border-nikkah-pink"}`}>
            <CardHeader className="bg-gradient-to-r from-nikkah-blue/10 to-nikkah-pink/10">
              <CardTitle>Unlimited</CardTitle>
              <CardDescription>Never worry about limits</CardDescription>
              {currentSubscription.plan === "Unlimited Plan" && currentSubscription.status === "active" && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 mt-2">
                  <Check className="w-3 h-3 mr-1" /> Active
                </span>
              )}
            </CardHeader>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold mb-4">£99.99<span className="text-sm font-normal">/lifetime</span></p>
              <ul className="space-y-2 text-left mb-6">
                <li className="flex items-center">
                  <Infinity className="h-5 w-5 text-green-500 mr-2" />
                  Unlimited requests forever
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  One-time payment
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  Lifetime access
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              {currentSubscription.plan === "Unlimited Plan" && currentSubscription.status === "active" ? (
                <Button 
                  className="w-full bg-green-500 hover:bg-green-600 cursor-not-allowed opacity-50"
                  disabled
                >
                  <Check className="mr-2 h-4 w-4" />
                  Current Plan
                </Button>
              ) : (
                !isCurrentPlan("Unlimited Plan") && currentSubscription.status === "active" ? (
                  <Button 
  onClick={() => confirmUpgradeTo("Unlimited Plan")}
  className="w-full bg-blue-500 hover:bg-blue-600"
  disabled={isChangingPlan}
>
  <ArrowUpDown className="mr-2 h-4 w-4" />
  Upgrade to Annual
</Button>

                ) : (
                  <Button 
                    className="w-full bg-nikkah-blue hover:bg-nikkah-blue/90"
                    onClick={() => handleSubscribe("Unlimited Plan", 999999, "£99.99")}
                    disabled={isCurrentPlan("Annual Plan")}

                  >
                    <Infinity className="mr-2 h-4 w-4" />
                    Purchase Lifetime
                  </Button>
                )
              )}
            </CardFooter>
          </Card>
        </div>

        
      </div>
      
      <PaymentDialog
        open={paymentDialogOpen}
        onClose={handlePaymentDialogClose}
        onSuccess={handlePaymentSuccess}
        planName={selectedPlan?.name || ""}
        planPrice={selectedPlan?.price || ""}
        requestsAmount={selectedPlan?.requests || 0}
      />
      
      <Dialog open={showCancelSuccessDialog} onOpenChange={setShowCancelSuccessDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Check className="h-6 w-6 text-green-500" />
              Subscription Cancelled
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              Your subscription has been successfully cancelled. You will maintain access until the end of your current billing period.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => navigate('/dashboard')} className="bg-nikkah-pink">
              Return to Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={showUpgradeConfirm} onOpenChange={setShowUpgradeConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Confirm Upgrade</AlertDialogTitle>
      <AlertDialogDescription>
        Are you sure you want to upgrade to the <strong>{pendingPlan}</strong>?<br />
        You will be charged immediately using your saved payment method.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={executeUpgrade}
        className="bg-nikkah-pink hover:bg-nikkah-pink/90"
      >
        Yes, Upgrade
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

    </div>
  );
};

export default Shop;
