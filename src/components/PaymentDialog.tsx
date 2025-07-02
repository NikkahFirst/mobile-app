
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { StripeElementsOptions } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

// Production Stripe publishable key
const stripePromise = loadStripe("pk_live_51Px5hl00Mh805C6vTYs0ulhEbOgUCoT6Pyz63IAelItU7hN7pNppZjVeofcG2HyzFFhEP57zDIMSyrp8hzy0ATAV00L3bs1phS");

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  planName: string;
  planPrice: string;
  requestsAmount: number;
}

// Store payment state in localStorage to persist through page navigations
const savePaymentState = (state: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('nikkahFirstPaymentState', JSON.stringify(state));
  }
};

const getPaymentState = () => {
  if (typeof window !== 'undefined') {
    const state = localStorage.getItem('nikkahFirstPaymentState');
    return state ? JSON.parse(state) : null;
  }
  return null;
};

const clearPaymentState = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('nikkahFirstPaymentState');
  }
};

const CheckoutForm = ({ 
  planName, 
  planPrice, 
  requestsAmount, 
  onSuccess, 
  onClose,
  paymentIntentId,
  setupIntentId,
  customerId,
  priceId,
  isSubscription,
  subscriptionId
}: { 
  planName: string; 
  planPrice: string; 
  requestsAmount: number;
  onSuccess: () => void;
  onClose: () => void;
  paymentIntentId?: string;
  setupIntentId?: string;
  customerId?: string;
  priceId?: string;
  isSubscription: boolean;
  subscriptionId?: string;
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isElementsReady, setIsElementsReady] = useState(false);
  const [paymentVerificationAttempts, setPaymentVerificationAttempts] = useState(0);
  const [verificationIntervalId, setVerificationIntervalId] = useState<number | null>(null);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [needsRetry, setNeedsRetry] = useState(false);
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [bufferProgress, setBufferProgress] = useState(0);
  const [bufferTimerId, setBufferTimerId] = useState<number | null>(null);

  // Check if there's an ongoing payment when component mounts
  useEffect(() => {
    const savedState = getPaymentState();
    if (savedState && savedState.inProgress) {
      console.log("Found in-progress payment state:", savedState);
      setPaymentInProgress(true);
      
      // Start buffer progress instead of immediately showing retry
      startBufferProgress();
      
      if (savedState.paymentIntentId || savedState.subscriptionId) {
        // We have a payment intent ID or subscription ID, so we can verify payment status
        verifyPaymentStatus(
          savedState.paymentIntentId || "", 
          savedState.isSetupIntent || false, 
          savedState.subscriptionId
        ).then(isVerified => {
          if (isVerified) {
            console.log("Payment verified as successful from saved state!");
            clearPaymentState();
            onSuccess();
          } else {
            console.log("Payment not verified, showing buffer");
            // Don't immediately show retry - the buffer will handle this
          }
        });
      }
    }
  }, []);

  // Function to start the buffer progress
  const startBufferProgress = () => {
    // Clear any existing timer
    if (bufferTimerId) {
      clearInterval(bufferTimerId);
    }
    
    setBufferProgress(0);
    setShowRetryButton(false);
    
    // Update progress every second, reaching 100% after 2 minutes (120 seconds)
    const timer = window.setInterval(() => {
      setBufferProgress(prev => {
        const newProgress = prev + (100 / 120);
        
        // When we reach 100%, show the retry button
        if (newProgress >= 100) {
          clearInterval(timer);
          setShowRetryButton(true);
        }
        
        return Math.min(newProgress, 100);
      });
    }, 1000);
    
    setBufferTimerId(timer);
    
    return timer;
  };

  useEffect(() => {
    return () => {
      if (verificationIntervalId) {
        clearInterval(verificationIntervalId);
      }
      if (bufferTimerId) {
        clearInterval(bufferTimerId);
      }
    };
  }, [verificationIntervalId, bufferTimerId]);

  // When payment is abandoned and user returns, offer a buffer to check payment status
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && paymentInProgress) {
        console.log("Page became visible again, checking payment status");
        const savedState = getPaymentState();
        if (savedState && savedState.inProgress) {
          // Don't immediately show retry, check status first
          verifyPaymentStatus(
            savedState.paymentIntentId || "", 
            savedState.isSetupIntent || false, 
            savedState.subscriptionId
          ).then(isVerified => {
            if (isVerified) {
              console.log("Payment verified as successful after return!");
              clearPaymentState();
              // Clear buffer if running
              if (bufferTimerId) {
                clearInterval(bufferTimerId);
                setBufferTimerId(null);
              }
              onSuccess();
            } else {
              console.log("Payment not verified after return, showing buffer");
              // Start/continue buffer instead of immediately showing retry
              if (!bufferTimerId) {
                startBufferProgress();
              }
            }
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [paymentInProgress, onSuccess]);

  const verifyPaymentStatus = async (intentId: string, isSetupIntent: boolean = false, subId?: string) => {
    if (!user) return false;
    
    try {
      console.log("Verifying payment status:", { 
        intentId, 
        isSetupIntent, 
        subId,
        userId: user.id,
        planName,
        planPrice
      });
      
      const { data, error } = await supabase.functions.invoke('update-payment-status', {
        body: { 
          paymentIntentId: !isSetupIntent ? intentId : undefined,
          setupIntentId: isSetupIntent ? intentId : undefined,
          subscriptionId: subId,
          userId: user.id,
          planName,
          planPrice,
          requestsAmount
        }
      });
      
      if (error) {
        console.error("Error verifying payment:", error);
        return false;
      }
      
      console.log("Payment verification response:", data);
      return data.success;
    } catch (error) {
      console.error("Error in payment verification:", error);
      return false;
    }
  };

  const startVerificationLoop = (intentId: string, isSetupIntent: boolean = false, subId?: string) => {
    if (verificationIntervalId) {
      clearInterval(verificationIntervalId);
    }
    
    const intervalId = window.setInterval(async () => {
      const isVerified = await verifyPaymentStatus(intentId, isSetupIntent, subId);
      setPaymentVerificationAttempts(prev => prev + 1);
      
      if (isVerified) {
        clearInterval(intervalId);
        console.log("Payment verified as successful!");
        clearPaymentState();
        // Clear buffer if running
        if (bufferTimerId) {
          clearInterval(bufferTimerId);
          setBufferTimerId(null);
        }
        onSuccess();
      } else if (paymentVerificationAttempts > 10) {
        clearInterval(intervalId);
        if (isSubscription) {
          console.log("Assuming subscription will be activated by webhook");
          clearPaymentState();
          onSuccess();
        } else {
          toast({
            title: "Verification timeout",
            description: "Please check your account dashboard to confirm your payment status.",
            variant: "default",
          });
          clearPaymentState();
          onSuccess();
        }
      }
    }, 2000);
    
    setVerificationIntervalId(intervalId);
    return intervalId;
  };

  const handleRetry = async () => {
    // Reset states
    setShowRetryButton(false);
    setNeedsRetry(false);
    setIsProcessing(true);
    
    // Clear buffer timer if running
    if (bufferTimerId) {
      clearInterval(bufferTimerId);
      setBufferTimerId(null);
    }
    
    const savedState = getPaymentState();
    if (!savedState) {
      toast({
        title: "Error",
        description: "Cannot retrieve payment details for retry",
        variant: "destructive"
      });
      setIsProcessing(false);
      return;
    }
    
    try {
      if (savedState.isSubscription && savedState.customerId && savedState.priceId) {
        // Retry subscription creation
        console.log("Retrying subscription creation");
        
        const { data: subscriptionData, error: subscriptionError } = await supabase.functions.invoke('create-subscription', {
          body: {
            customerId: savedState.customerId,
            priceId: savedState.priceId,
            userId: user?.id,
            planName
          }
        });
        
        if (subscriptionError) {
          throw new Error(subscriptionError.message || "Failed to retry subscription");
        }
        
        console.log("Subscription retry:", subscriptionData);
        
        if (subscriptionData.clientSecret && subscriptionData.paymentIntentId) {
          // Save state for possible interruptions
          savePaymentState({
            inProgress: true,
            isSubscription: true,
            paymentIntentId: subscriptionData.paymentIntentId,
            subscriptionId: subscriptionData.subscriptionId,
            customerId: savedState.customerId,
            priceId: savedState.priceId,
            planName,
            planPrice
          });
          
          // Submit the payment with the new client secret
          if (!stripe || !elements) throw new Error("Stripe not initialized");
          
          const { error: submitError } = await elements.submit();
          if (submitError) throw new Error(submitError.message || "Failed to submit payment details");
          
          const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
            elements,
            clientSecret: subscriptionData.clientSecret,
            confirmParams: {
              return_url: window.location.origin + '/dashboard?success=true'
            },
            redirect: 'if_required',
          });
          
          if (confirmError) throw new Error(confirmError.message || "Payment confirmation failed");
          
          console.log("Payment confirmation:", paymentIntent);
          
          if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
            clearPaymentState();
            onSuccess();
          } else {
            startVerificationLoop(paymentIntent?.id || "", false, subscriptionData.subscriptionId);
          }
        }
      } else if (savedState.paymentIntentId) {
        // Retry one-time payment
        console.log("Retrying one-time payment", savedState.paymentIntentId);
        
        if (!stripe || !elements) throw new Error("Stripe not initialized");
        
        const { error: submitError } = await elements.submit();
        if (submitError) throw new Error(submitError.message || "Failed to submit payment details");
        
        const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: window.location.origin + '/dashboard?success=true'
          },
          redirect: 'if_required',
        });
        
        if (confirmError) throw new Error(confirmError.message || "Payment confirmation failed");
        
        if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
          clearPaymentState();
          onSuccess();
        } else {
          // Start verification loop
          startVerificationLoop(paymentIntent?.id || "");
        }
      } else {
        throw new Error("Invalid payment state");
      }
    } catch (error) {
      console.error("Retry error:", error);
      toast({
        title: "Payment retry failed",
        description: error.message || "Failed to process your payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submit handler called", {
      stripe: !!stripe,
      elements: !!elements,
      user: !!user,
      isElementsReady,
      isSubscription,
      paymentIntentId,
      customerId,
      priceId,
      planName,
      planPrice
    });

    if (!stripe || !elements || !user) {
      toast({
        title: "Payment system not ready",
        description: "Please wait a moment and try again",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setPaymentInProgress(true);

    try {
      // First, call elements.submit() as required by Stripe
      const { error: submitError } = await elements.submit();
      if (submitError) {
        console.error("Elements submission error:", submitError);
        throw new Error(submitError.message || "Failed to submit payment details");
      }
      
      // For subscription plans (Monthly or Annual), we need to create a subscription
      if (isSubscription && customerId && priceId && !paymentIntentId) {
        console.log("Creating subscription with Stripe Elements");
        
        // Save payment state before proceeding
        savePaymentState({
          inProgress: true,
          isSubscription: true,
          customerId,
          priceId,
          planName,
          planPrice
        });
        
        // We don't need to call createPaymentMethod here - the subscription creation
        // will use the payment details from the Elements
        const { data: subscriptionData, error: subscriptionError } = await supabase.functions.invoke('create-subscription', {
          body: {
            customerId,
            priceId,
            userId: user.id,
            planName
          }
        });
        
        if (subscriptionError) {
          console.error("Subscription error:", subscriptionError);
          throw new Error(subscriptionError.message || "Failed to create subscription");
        }
        
        console.log("Subscription created:", subscriptionData);
        
        // Update payment state with subscription ID
        savePaymentState({
          inProgress: true,
          isSubscription: true,
          subscriptionId: subscriptionData.subscriptionId,
          paymentIntentId: subscriptionData.paymentIntentId,
          customerId,
          priceId,
          planName,
          planPrice
        });
        
        if (subscriptionData.clientSecret && subscriptionData.paymentIntentId) {
          // We need to confirm the payment intent
          const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
            elements,
            clientSecret: subscriptionData.clientSecret,
            confirmParams: {
              return_url: window.location.origin + '/dashboard?success=true'
            },
            redirect: 'if_required',
          });
          
          if (confirmError) {
            console.error("Payment confirmation error:", confirmError);
            throw new Error(confirmError.message || "Payment failed");
          }
          
          console.log("Payment confirmed:", paymentIntent);
          
          if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
            // Update payment status
            const { data: updateData, error: updateError } = await supabase.functions.invoke('update-payment-status', {
              body: { 
                subscriptionId: subscriptionData.subscriptionId,
                userId: user.id,
                planName,
                planPrice,
                requestsAmount
              }
            });
            
            if (updateError) {
              console.error("Error updating payment status:", updateError);
            } else {
              console.log("Payment status updated:", updateData);
              clearPaymentState();
              onSuccess();
              return;
            }
            
            // Start verification loop
            startVerificationLoop(paymentIntent.id, false, subscriptionData.subscriptionId);
          }
        } else {
          // Subscription might be created but we don't have a payment intent to confirm
          // Try to update the status directly
          const { data: updateData, error: updateError } = await supabase.functions.invoke('update-payment-status', {
            body: { 
              subscriptionId: subscriptionData.subscriptionId,
              userId: user.id,
              planName,
              planPrice,
              requestsAmount
            }
          });
          
          if (updateError) {
            console.error("Error updating payment status:", updateError);
            throw new Error(updateError.message || "Failed to update payment status");
          } else {
            console.log("Payment status updated:", updateData);
            clearPaymentState();
            onSuccess();
            return;
          }
        }
      } else if (paymentIntentId) {
        // Regular payment flow or subscription with paymentIntent
        console.log("Confirming payment with PaymentElement");
        
        // Save payment intent ID to localStorage for resilience
        savePaymentState({
          inProgress: true,
          isSubscription: false,
          paymentIntentId,
          subscriptionId
        });
        
        const { error: paymentError, paymentIntent } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: window.location.origin + '/dashboard?success=true'
          },
          redirect: 'if_required',
        });

        if (paymentError) {
          console.error("Payment error:", paymentError);
          throw new Error(paymentError.message || "Payment failed");
        }

        if (paymentIntent) {
          console.log(`Payment intent ID: ${paymentIntent.id}, Status: ${paymentIntent.status}`);
          
          // Update saved state with payment intent ID
          savePaymentState({
            inProgress: true,
            isSubscription: false,
            paymentIntentId: paymentIntent.id,
            subscriptionId
          });
          
          if (paymentIntent.status === "succeeded" || paymentIntent.status === "processing") {
            const isVerified = await verifyPaymentStatus(paymentIntent.id, false, subscriptionId);
            
            if (isVerified) {
              console.log("Payment verified as successful immediately!");
              clearPaymentState();
              onSuccess();
            } else {
              startVerificationLoop(paymentIntent.id, false, subscriptionId);
            }
          } else {
            console.log(`Payment in unexpected state: ${paymentIntent.status}`);
            toast({
              title: "Payment Status",
              description: "Your payment is being processed. Please check your dashboard shortly.",
              variant: "default",
            });
            startVerificationLoop(paymentIntent.id, false, subscriptionId);
          }
        } else {
          throw new Error("Payment confirmation returned no payment intent");
        }
      } else {
        throw new Error("Unable to process payment - missing required parameters");
      }
    } catch (error) {
      console.error("Payment error:", error);
      let errorMessage = error.message || "Failed to process your payment";
      
      if (errorMessage.includes("card was declined")) {
        errorMessage = "Your card was declined. Please try another payment method.";
      } else if (errorMessage.includes("insufficient funds")) {
        errorMessage = "Insufficient funds on your card. Please try another payment method.";
      } else if (errorMessage.includes("processing error")) {
        errorMessage = "There was a processing error with your payment. Please try again.";
      }
      
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      setPaymentInProgress(false);
      setIsProcessing(false);
      clearPaymentState();
    }
  };

  const handleElementChange = (event: any) => {
    console.log("Element changed", event);
    setIsElementsReady(event.complete);
  };

  // If payment is in progress and we returned to the app, show loading buffer or retry UI
  if (paymentInProgress && !isProcessing) {
    return (
      <div className="space-y-6 py-4">
        {showRetryButton ? (
          // Show retry UI after buffer completes
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
            <h3 className="font-bold text-yellow-800 dark:text-yellow-400 mb-2">Payment Incomplete</h3>
            <p className="text-yellow-700 dark:text-yellow-300 text-sm mb-4">
              Your payment process seems to be taking longer than expected. 
              It may still be processing, or you may need to retry.
            </p>
            <Button 
              onClick={handleRetry}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Payment
            </Button>
          </div>
        ) : (
          // Show buffer UI while waiting
          <div className="space-y-4">
            <div className="text-center mb-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-nikkah-pink" />
              <h3 className="font-medium text-lg">Verifying Payment</h3>
              <p className="text-muted-foreground text-sm">
                Please wait while we confirm your payment with NikkahFirst...
              </p>
            </div>
            
            <Progress value={bufferProgress} className="h-2" />
            
            <p className="text-xs text-center text-muted-foreground">
              This may take a moment. Please don't close this window.
            </p>
          </div>
        )}
      </div>
    );
  }

  // If we need to retry a payment, show retry UI (legacy case - should now go through buffer first)
  if (needsRetry) {
    return (
      <div className="space-y-6 py-4">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
          <h3 className="font-bold text-yellow-800 dark:text-yellow-400 mb-2">Payment Incomplete</h3>
          <p className="text-yellow-700 dark:text-yellow-300 text-sm mb-4">
            Your previous payment was interrupted. No charges have been made yet. 
            Would you like to retry the payment process?
          </p>
          <Button 
            onClick={handleRetry}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Payment
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement 
        onChange={handleElementChange}
        options={{
          layout: 'tabs',
          paymentMethodOrder: ['card'],
          fields: {
            billingDetails: {
              name: 'auto',
              email: 'auto'
            }
          }
        }}
      />
      
      <DialogFooter className="pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => {
            clearPaymentState();
            onClose();
          }}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        
        <Button 
          type="submit"
          className="bg-nikkah-pink hover:bg-nikkah-pink/90"
          disabled={isProcessing || !stripe || !elements || !isElementsReady}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>Pay {planPrice}</>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
};

const PaymentDialog: React.FC<PaymentDialogProps> = ({ 
  open, 
  onClose,
  onSuccess,
  planName, 
  planPrice,
  requestsAmount
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState("");
  const [setupIntentId, setSetupIntentId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [priceId, setPriceId] = useState("");
  const [subscriptionId, setSubscriptionId] = useState("");
  const [isSubscription, setIsSubscription] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAttemptedToCreatePayment, setHasAttemptedToCreatePayment] = useState(false);

  // Debounce function to prevent multiple payment creation attempts
  const createPaymentWithDebounce = useCallback(async () => {
    if (!open || !user || hasAttemptedToCreatePayment) return;
    
    setHasAttemptedToCreatePayment(true);
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Creating payment for", planName, planPrice);
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: { 
          planName, 
          planPrice, 
          userId: user.id,
          redirectMode: false
        }
      });
      
      if (error) {
        console.error("Error invoking create-payment-intent:", error);
        throw new Error(error.message);
      }

      console.log("Payment creation response:", data);
      
      // Check if this is a subscription plan
      const isSubscriptionPlan = planName === 'Monthly Plan' || planName === 'Annual Plan';
      setIsSubscription(isSubscriptionPlan);
      
      if (isSubscriptionPlan && data.customerId && data.priceId) {
        // For subscriptions, we have customer ID and price ID
        setCustomerId(data.customerId);
        setPriceId(data.priceId);
        
        // Create an empty client secret for the Elements component
        // This will be used to collect payment method
        const { data: setupData, error: setupError } = await supabase.functions.invoke('create-setup-intent', {
          body: {
            customerId: data.customerId
          }
        });
        
        if (setupError) throw new Error(setupError.message);
        
        if (setupData && setupData.client_secret) {
          setClientSecret(setupData.client_secret);
          setSetupIntentId(setupData.setup_intent_id || "");
        } else {
          throw new Error("Failed to create setup intent");
        }
      } else if (data.clientSecret) {
        // For one-time payments or subscription with payment intent
        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId || "");
        setCustomerId(data.customerId || "");
        setPriceId(data.priceId || "");
        
        if (data.subscriptionId) {
          setSubscriptionId(data.subscriptionId);
        }
      } else {
        throw new Error("No client secret or customer ID received");
      }
    } catch (error) {
      console.error("Error creating payment:", error);
      setError(error.message || "Failed to initialize payment");
      toast({
        title: "Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [open, user, planName, planPrice, toast, hasAttemptedToCreatePayment]);

  // Clear payment state when dialog closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        clearPaymentState();
        setClientSecret("");
        setPaymentIntentId("");
        setSetupIntentId("");
        setCustomerId("");
        setPriceId("");
        setSubscriptionId("");
        setIsSubscription(false);
        setError(null);
        setHasAttemptedToCreatePayment(false);
      }, 300);
    } else if (open) {
      // When dialog opens, create payment intent
      createPaymentWithDebounce();
    }
  }, [open, createPaymentWithDebounce]);

  const handleSuccess = () => {
    clearPaymentState(); // Make sure to clear any saved state
    onSuccess();
  };

  // Update the options to include paymentMethodCreation: 'manual'
  const options: StripeElementsOptions = clientSecret ? {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#e83e8c',
      },
    },
    paymentMethodCreation: 'manual',
  } : { 
    appearance: { theme: 'stripe' },
    paymentMethodCreation: 'manual'
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Checkout - {planName}</DialogTitle>
          <DialogDescription>
            Enter your payment details to complete your {isSubscription ? 'subscription' : 'purchase'} to {planName} for {planPrice}.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-nikkah-pink" />
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <p className="text-red-500 mb-4">{error}. Please try again or contact support.</p>
            <Button 
              onClick={() => {
                setHasAttemptedToCreatePayment(false);
                createPaymentWithDebounce();
              }}
              className="bg-nikkah-pink hover:bg-nikkah-pink/90"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : clientSecret || (customerId && priceId) ? (
          <ScrollArea className="max-h-[60vh] overflow-y-auto">
            <div className="p-1">
              <Elements stripe={stripePromise} options={options}>
                <CheckoutForm 
                  planName={planName} 
                  planPrice={planPrice} 
                  requestsAmount={requestsAmount}
                  onSuccess={handleSuccess}
                  onClose={onClose}
                  paymentIntentId={paymentIntentId}
                  setupIntentId={setupIntentId}
                  customerId={customerId}
                  priceId={priceId}
                  isSubscription={isSubscription}
                  subscriptionId={subscriptionId}
                />
              </Elements>
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-4">
            <p className="text-red-500 mb-4">Failed to initialize payment. Please try again.</p>
            <Button 
              onClick={() => {
                setHasAttemptedToCreatePayment(false);
                createPaymentWithDebounce();
              }}
              className="bg-nikkah-pink hover:bg-nikkah-pink/90"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;
