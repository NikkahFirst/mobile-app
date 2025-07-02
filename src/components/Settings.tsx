import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase, getUserRemainingRequests } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, LogOut, MessageSquarePlus, Mail, User, Pencil, Save, X, Lock, Trash2 } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { countryCodes, getPhoneLengthForCountry } from "@/lib/countryCodes";

const Settings = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [subscriptionPlan, setSubscriptionPlan] = useState("Free Plan");
  const [subscriptionStatus, setSubscriptionStatus] = useState("inactive");
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [requestsRemaining, setRequestsRemaining] = useState(0);
  const [userGender, setUserGender] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextRenewalDate, setNextRenewalDate] = useState<string | null>(null);
  const [waliDetails, setWaliDetails] = useState({
    name: "",
    phone: "",
    email: "",
    countryCode: ""
  });
  const [isEditingWali, setIsEditingWali] = useState(false);
  const [isUpdatingWali, setIsUpdatingWali] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [isCancelled, setIsCancelled] = useState(false);

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Account deletion states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showSubscriptionWarning, setShowSubscriptionWarning] = useState(false);

  // New subscription cancellation dialog state
  const [showCancelSubscriptionDialog, setShowCancelSubscriptionDialog] = useState(false);

  // New deletion flow states
  const [deletionStep, setDeletionStep] = useState(1);
  const [deletionReason, setDeletionReason] = useState("");
  const [deletionFeedback, setDeletionFeedback] = useState("");
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  const deletionReasons = [
    "Found a match elsewhere",
    "Not satisfied with matches",
    "Technical issues",
    "Other"
  ];

  const isOneTimePlan = (planName: string) => {
    const cleaned = planName.trim().toLowerCase();
    return (
      cleaned === "unlimited plan" ||
      cleaned === "limited offer - unlimited plan" ||
      cleaned === "limited time offer"
    );
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('gender, requests_remaining, subscription_plan, subscription_status, subscription_id, renewal_date, created_at, wali_name, wali_phone, wali_email, is_canceled')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setUserGender(data.gender);
          setRequestsRemaining(data.requests_remaining || 0);
          setSubscriptionPlan(data.subscription_plan || "Free Plan");
          setSubscriptionStatus(data.subscription_status || "inactive");
          setSubscriptionId(data.subscription_id || null);
          
          setIsCancelled(data.is_canceled || false);
          
          if (data.gender === 'female') {
            let phoneNum = "";
            let countryCode = "";
            
            if (data.wali_phone) {
              if (data.wali_phone.startsWith('+') && data.wali_phone.includes(' ')) {
                const parts = data.wali_phone.split(' ');
                countryCode = parts[0];
                phoneNum = parts.slice(1).join(' ');
              } else {
                phoneNum = data.wali_phone;
                countryCode = "+1";
              }
            }
            
            setWaliDetails({
              name: data.wali_name || "",
              phone: phoneNum,
              email: data.wali_email || "",
              countryCode: countryCode || "+1"
            });
          }
          
          if (data.renewal_date) {
            setNextRenewalDate(new Date(data.renewal_date).toLocaleDateString());
          } else if (data.created_at) {
            const createdDate = new Date(data.created_at);
            const nextRenewal = new Date(createdDate);
            nextRenewal.setMonth(nextRenewal.getMonth() + 1);
            setNextRenewalDate(nextRenewal.toLocaleDateString());
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

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("Email is required");
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
      if (!/^\d*$/.test(value)) {
        return;
      }
      
      const maxLength = getPhoneLengthForCountry(waliDetails.countryCode);
      
      if (value.length > maxLength) {
        return;
      }
    }
    
    if (name === 'email') {
      validateEmail(value);
    }
    
    setWaliDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCountryCodeChange = (value: string) => {
    setWaliDetails(prev => ({
      ...prev,
      countryCode: value,
      phone: ''
    }));
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    } catch (error) {
      console.error("Error logging out:", error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleManageSubscription = () => {
    navigate('/shop');
  };

  const handleRequestFeature = () => {
    window.location.href = "mailto:info@nikkahfirst.com?subject=Request%20a%20Feature";
    
    toast({
      title: "Feature Request",
      description: "Opening email client to send feature request.",
    });
  };

  const handleContactSupport = () => {
    window.location.href = "mailto:info@nikkahfirst.com?subject=Contact%20Support";
    
    toast({
      title: "Contact Support",
      description: "Opening email client to contact support.",
    });
  };

  const handleWaliDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'email') {
      validateEmail(value);
    }
    
    setWaliDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const updateWaliDetails = async () => {
    if (!user) return;
    
    if (!validateEmail(waliDetails.email)) {
      return;
    }
    
    setIsUpdatingWali(true);
    try {
      const cleanPhone = waliDetails.phone.replace(/\s+/g, '');
      const formattedPhone = waliDetails.countryCode + ' ' + cleanPhone;

      
      const { error } = await supabase
        .from('profiles')
        .update({
          wali_name: waliDetails.name,
          wali_phone: formattedPhone,
          wali_email: waliDetails.email
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setIsEditingWali(false);
      
      toast({
        title: "Success",
        description: "Wali details updated successfully",
      });
    } catch (error) {
      console.error("Error updating wali details:", error);
      toast({
        title: "Error",
        description: "Failed to update wali details",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingWali(false);
    }
  };

  const toggleEditMode = () => {
    setIsEditingWali(!isEditingWali);
    setEmailError("");
  };

  const cancelEdit = () => {
    if (user) {
      supabase
        .from('profiles')
        .select('wali_name, wali_phone, wali_email')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            let phoneNum = "";
            let countryCode = "";
            
            if (data.wali_phone) {
              if (data.wali_phone.startsWith('+') && data.wali_phone.includes(' ')) {
                const parts = data.wali_phone.split(' ');
                countryCode = parts[0];
                phoneNum = parts.slice(1).join(' ');
              } else {
                phoneNum = data.wali_phone;
                countryCode = "+1";
              }
            }
            
            setWaliDetails({
              name: data.wali_name || "",
              phone: phoneNum,
              email: data.wali_email || "",
              countryCode: countryCode || "+1"
            });
          }
        });
    }
    setIsEditingWali(false);
    setEmailError("");
  };

  const openPasswordDialog = () => {
    setPasswordDialogOpen(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
  };

  const closePasswordDialog = () => {
    setPasswordDialogOpen(false);
  };

  const validatePasswordForm = () => {
    setPasswordError("");
    
    if (!currentPassword) {
      setPasswordError("Current password is required");
      return false;
    }
    if (!newPassword) {
      setPasswordError("New password is required");
      return false;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return false;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) {
      return;
    }
    
    setIsChangingPassword(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword
      });
      
      if (signInError) {
        setPasswordError("Current password is incorrect");
        setIsChangingPassword(false);
        return;
      }
      
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) {
        if (updateError.message.includes("password")) {
          setPasswordError(updateError.message);
        } else {
          setPasswordError("Failed to update password: " + updateError.message);
        }
        return;
      }
      
      toast({
        title: "Success",
        description: "Your password has been updated successfully",
      });
      
      closePasswordDialog();
    } catch (error: any) {
      console.error("Error changing password:", error);
      setPasswordError("An unexpected error occurred. Please try again.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = () => {
    // Check if user has active subscription and is male
    if (userGender === 'male' && subscriptionStatus === 'active' && !isCancelled) {
      if (isOneTimePlan(subscriptionPlan)) {
        setShowSubscriptionWarning(true);
      } else {
        // Show the new cancellation dialog instead of toast
        setShowCancelSubscriptionDialog(true);
        return;
      }
    } else {
      setDeleteDialogOpen(true);
      setDeletionStep(1);
      setDeletionReason("");
      setDeletionFeedback("");
      setConfirmDeleteText("");
    }
  };

  const handleNextStep = () => {
    if (deletionStep === 1 && !deletionReason) {
      toast({
        title: "Please select a reason",
        description: "You must select a reason for deleting your account.",
        variant: "destructive",
      });
      return;
    }
    
    if (deletionStep === 2 && deletionFeedback.trim().length < 10) {
      toast({
        title: "Please provide more detail",
        description: "Please provide at least 10 characters of feedback.",
        variant: "destructive",
      });
      return;
    }
    
    setDeletionStep(deletionStep + 1);
  };

  const handlePreviousStep = () => {
    setDeletionStep(deletionStep - 1);
  };

  const handleSendFeedbackAndDelete = async () => {
    if (!user || confirmDeleteText !== "DELETE") {
      toast({
        title: "Verification failed",
        description: "Please type 'DELETE' to confirm account deletion.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingFeedback(true);
    
    try {
      console.log("Starting account deletion process for user:", user.id);

      // First, send the feedback email with corrected body format
      console.log("Sending deletion feedback with reason:", deletionReason, "and feedback length:", deletionFeedback.length);
      
      const { data: feedbackData, error: feedbackError } = await supabase.functions.invoke('send-deletion-feedback', {
        body: {
          reason: deletionReason,
          feedback: deletionFeedback
        }
      });

      if (feedbackError) {
        console.error("Error sending feedback:", feedbackError);
        
        // Show a more user-friendly error and allow them to continue
        const shouldContinue = window.confirm(
          "We couldn't send your feedback due to a technical issue. Would you like to continue with account deletion anyway?"
        );
        
        if (!shouldContinue) {
          toast({
            title: "Deletion cancelled",
            description: "Account deletion was cancelled. You can try again later.",
            variant: "destructive",
          });
          return;
        }
      } else {
        console.log("Feedback sent successfully:", feedbackData);
      }

      console.log("Proceeding with account deletion");

      // Now proceed with account deletion
      setIsDeletingAccount(true);

      const { data: deleteData, error: deleteError } = await supabase.functions.invoke('delete-user-account');

      if (deleteError) {
        console.error("Error deleting account:", deleteError);
        toast({
          title: "Error",
          description: deleteError.message || "Failed to delete account. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      if (deleteData?.error) {
        console.error("Server error deleting account:", deleteData.error);
        toast({
          title: "Error",
          description: deleteData.error || "Failed to delete account. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });

      // Clear any remaining auth state and redirect
      try {
        await signOut();
      } catch (signOutError) {
        console.warn("Error during sign out after deletion:", signOutError);
      }
      
      // Force a complete page reload to clear all state
      window.location.href = '/';
    } catch (error) {
      console.error("Exception when deleting account:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSendingFeedback(false);
      setIsDeletingAccount(false);
      setDeleteDialogOpen(false);
      setDeletionStep(1);
      setDeletionReason("");
      setDeletionFeedback("");
      setConfirmDeleteText("");
    }
  };

  const handleLifetimeWarningConfirm = () => {
    setShowSubscriptionWarning(false);
    setDeleteDialogOpen(true);
    setDeletionStep(1);
    setDeletionReason("");
    setDeletionFeedback("");
    setConfirmDeleteText("");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nikkah-pink"></div>
      </div>
    );
  }

  const isSubscriptionCancellable = (planName: string) => {
    return (planName === "Monthly Plan" || planName === "Annual Plan") && !isCancelled;
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
          <CardDescription>Your current subscription plan and remaining requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Plan:</span>
                
                <div className="flex items-center">
  <span className="text-sm">{subscriptionPlan}</span>
  {subscriptionStatus === 'active' && !isCancelled && (
    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
      Active
    </span>
  )}
  {isCancelled && (
    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">
      Cancelled
    </span>
  )}
  {isOneTimePlan(subscriptionPlan) && subscriptionStatus === 'active' && (
    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">
      Lifetime Access
    </span>
  )}
</div>

              </div>
             {!isOneTimePlan(subscriptionPlan) && (
  <div className="flex justify-between items-center">
    <span className="text-sm font-medium">Next Renewal:</span>
    <span className="text-sm">
      {isCancelled ? (
        <span className="text-orange-600 font-medium">Will not renew</span>
      ) : (
        nextRenewalDate || "Not applicable"
      )}
    </span>
  </div>
)}

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Requests Remaining:</span>
                <span className="text-sm font-bold">{requestsRemaining}</span>
              </div>
              {!isOneTimePlan(subscriptionPlan) && (
  <div className="flex justify-between items-center">
    <span className="text-sm font-medium">Monthly Allowance:</span>
    <span className="text-sm">
      {userGender === 'female' ? 
        '3 requests' : 
        subscriptionPlan === 'Monthly Plan' ? 
          '10 requests' : 
          subscriptionPlan === 'Annual Plan' ? 
            '15 requests' : 
            'Based on subscription'}
    </span>
  </div>
)}

            </div>
          </div>
        </CardContent>
        {userGender === 'male' && (
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2"
              onClick={handleManageSubscription}
            >
              <CreditCard className="h-4 w-4" />
              Manage Subscription
            </Button>
          </CardFooter>
        )}
      </Card>

      {userGender === 'female' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Wali Information</CardTitle>
              <CardDescription>Your Wali (guardian) contact details</CardDescription>
            </div>
            {!isEditingWali ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleEditMode}
                className="flex items-center gap-1"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={cancelEdit}
                  className="flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button 
                  variant="nikkah" 
                  size="sm" 
                  onClick={updateWaliDetails}
                  disabled={isUpdatingWali}
                  className="flex items-center gap-1"
                >
                  <Save className="h-3.5 w-3.5" />
                  {isUpdatingWali ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditingWali ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="wali-name">Wali Name</Label>
                  <Input 
                    id="wali-name" 
                    name="name" 
                    value={waliDetails.name} 
                    onChange={handleWaliDetailChange} 
                    placeholder="Your Wali's full name" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wali-phone">Wali Phone Number</Label>
                  <div className="flex space-x-2">
                    <Select 
                      value={waliDetails.countryCode} 
                      onValueChange={handleCountryCodeChange}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Code" />
                      </SelectTrigger>
                      <SelectContent>
                        {countryCodes.map((country) => (
                          <SelectItem key={country.dial_code} value={country.dial_code}>
                            <span>{country.flag} {country.dial_code}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input 
                      id="wali-phone" 
                      name="phone" 
                      value={waliDetails.phone} 
                      onChange={handleFormChange} 
                      placeholder="Phone number" 
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum {getPhoneLengthForCountry(waliDetails.countryCode)} digits for selected country
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wali-email">Wali Email<span className="text-red-500">*</span></Label>
                  <Input 
                    id="wali-email" 
                    name="email" 
                    type="email"
                    value={waliDetails.email} 
                    onChange={handleWaliDetailChange} 
                    placeholder="Your Wali's email address" 
                    required
                  />
                  {emailError && <p className="text-sm text-red-500 mt-1">{emailError}</p>}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Wali Name</Label>
                  <p className="text-base font-medium mt-1">
                    {waliDetails.name || <span className="text-muted-foreground italic">Not provided</span>}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Wali Phone Number</Label>
                  <p className="text-base font-medium mt-1">
                    {waliDetails.countryCode && waliDetails.phone ? 
                      `${waliDetails.countryCode} ${waliDetails.phone}` : 
                      <span className="text-muted-foreground italic">Not provided</span>}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Wali Email</Label>
                  <p className="text-base font-medium mt-1">
                    {waliDetails.email || <span className="text-muted-foreground italic">Not provided</span>}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Theme Settings</CardTitle>
          <CardDescription>Customize the appearance of the application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span>Dark Mode</span>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={handleRequestFeature}
          >
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            Request a Feature
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={handleContactSupport}
          >
            <Mail className="mr-2 h-4 w-4" />
            Contact Support
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={openPasswordDialog}
          >
            <Lock className="mr-2 h-4 w-4" />
            Change Password
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            onClick={handleDeleteAccount}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Account
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log Out
          </Button>
        </CardContent>
      </Card>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Update your account password. After changing your password, you'll remain logged in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters long
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {passwordError && (
              <div className="text-sm text-red-500">{passwordError}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closePasswordDialog}>
              Cancel
            </Button>
            <Button 
              variant="nikkah" 
              onClick={handleChangePassword}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account Deletion Warning for Lifetime Users */}
      <AlertDialog open={showSubscriptionWarning} onOpenChange={setShowSubscriptionWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lifetime Subscription Warning</AlertDialogTitle>
            <AlertDialogDescription>
              You have a lifetime subscription that will be permanently lost if you delete your account. 
              You will need to purchase a new subscription if you create another account in the future.
              <br /><br />
              Are you sure you want to proceed with deleting your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep My Account</AlertDialogCancel>
            <AlertDialogAction onClick={handleLifetimeWarningConfirm} className="bg-red-500 hover:bg-red-600">
              Delete Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Subscription Cancellation Dialog */}
      <Dialog open={showCancelSubscriptionDialog} onOpenChange={setShowCancelSubscriptionDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cancel Subscription Required</DialogTitle>
            <DialogDescription>
              You have an active subscription that must be cancelled before you can delete your account. 
              Please cancel your subscription first, then return to delete your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowCancelSubscriptionDialog(false)}
            >
              Close
            </Button>
            <Button 
              variant="nikkah"
              onClick={() => {
                setShowCancelSubscriptionDialog(false);
                navigate('/shop');
              }}
            >
              Go to Subscription Management
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Multi-Step Account Deletion Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Delete Account - Step {deletionStep} of 3</DialogTitle>
            <DialogDescription>
              {deletionStep === 1 && "Please tell us why you're leaving"}
              {deletionStep === 2 && "Help us improve by sharing your feedback"}
              {deletionStep === 3 && "Final confirmation required"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {/* Step 1: Reason Selection */}
            {deletionStep === 1 && (
              <div className="space-y-4">
                <Label htmlFor="deletion-reason">Why are you deleting your account?</Label>
                <Select value={deletionReason} onValueChange={setDeletionReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {deletionReasons.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Step 2: Written Feedback */}
            {deletionStep === 2 && (
              <div className="space-y-4">
                <Label htmlFor="deletion-feedback">
                  Please provide additional details about your experience
                  <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="deletion-feedback"
                  value={deletionFeedback}
                  onChange={(e) => setDeletionFeedback(e.target.value)}
                  placeholder="Your feedback helps us improve our service for other users..."
                  className="w-full min-h-[120px] p-3 border rounded-md resize-none"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  {deletionFeedback.length}/10 characters minimum
                </p>
              </div>
            )}

            {/* Step 3: Final Confirmation */}
            {deletionStep === 3 && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-800">
                  <h3 className="font-semibold">Final Warning</h3>
                  <p className="mt-2">
                    This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                  </p>
                  <p className="mt-2">
                    Your feedback will be sent to our team before your account is deleted.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-delete">Type "DELETE" to confirm:</Label>
                  <Input
                    id="confirm-delete"
                    value={confirmDeleteText}
                    onChange={(e) => setConfirmDeleteText(e.target.value)}
                    placeholder="Type DELETE here"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <div className="flex justify-between w-full">
              <div>
                {deletionStep > 1 && (
                  <Button variant="outline" onClick={() => setDeletionStep(deletionStep - 1)}>
                    Back
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  setDeleteDialogOpen(false);
                  setDeletionStep(1);
                  setDeletionReason("");
                  setDeletionFeedback("");
                  setConfirmDeleteText("");
                }}>
                  Cancel
                </Button>
                {deletionStep < 3 ? (
                  <Button onClick={() => {
                    if (deletionStep === 1 && !deletionReason) {
                      toast({
                        title: "Please select a reason",
                        description: "You must select a reason for deleting your account.",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    if (deletionStep === 2 && deletionFeedback.trim().length < 10) {
                      toast({
                        title: "Please provide more detail",
                        description: "Please provide at least 10 characters of feedback.",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    setDeletionStep(deletionStep + 1);
                  }} className="bg-red-500 hover:bg-red-600">
                    Next
                  </Button>
                ) : (
                  <Button 
                    onClick={handleSendFeedbackAndDelete}
                    disabled={confirmDeleteText !== "DELETE" || isSendingFeedback || isDeletingAccount}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    {isSendingFeedback ? "Sending Feedback..." : isDeletingAccount ? "Deleting..." : "Delete Account"}
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
