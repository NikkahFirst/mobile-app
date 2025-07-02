
// AffiliateDashboard.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Copy, PlusCircle, Share2, User, Users, AlertCircle, Check, Star, StarOff, Trash2 } from 'lucide-react';
import { z } from 'zod';

// Payment method validation schemas
const emailSchema = z.string().email("Please enter a valid email address");

const AffiliateDashboard = () => {
  const { user, signOut } = useAuth();
  const [affiliateData, setAffiliateData] = useState<any>(null);
  const [signupStats, setSignupStats] = useState<{ maleSignups: number; subscribedMales: number }>({
  maleSignups: 0,
  subscribedMales: 0
});

  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tab, setTab] = useState("dashboard");
  
  // Payment method state
  const [paymentInfo, setPaymentInfo] = useState({
    method: '',
    paypalEmail: '',
    wiseEmail: '',
    preferredMethod: ''
  });
  
  // Form validation errors
  const [errors, setErrors] = useState({
    paypalEmail: '',
    wiseEmail: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      try {
        const { data: affiliates } = await supabase
          .from('affiliates')
          .select('*')
          .eq('user_id', user.id)
          .limit(1);
        const affiliate = affiliates?.[0];
        if (!affiliate) return;
        setAffiliateData(affiliate);
        
        // Set payment method state based on database values
        setPaymentInfo({
          method: affiliate.payment_method || '',
          paypalEmail: affiliate.payment_email || affiliate.paypal_email || '',
          wiseEmail: affiliate.wise_email || '',
          preferredMethod: affiliate.preferred_payment_method || affiliate.payment_method || ''
        });

        const { data: referred } = await supabase
  .from('affiliate_referrals')
  .select('*')
  .eq('affiliate_id', affiliate.id);

setReferrals(referred || []);
setSignupStats({
  maleSignups: (referred || []).filter(r => r.referred_user_gender === 'male').length,
  subscribedMales: (referred || []).filter(
    r => r.referred_user_gender === 'male' && r.subscription_date
  ).length,
});


        const { data: payouts } = await supabase
          .from('affiliate_payouts')
          .select('*')
          .eq('affiliate_id', affiliate.id);
        setPayoutHistory(payouts || []);

      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const referralLink = `https://nikkahfirst.com/signup?ref=${affiliateData?.affiliate_code}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
    setTimeout(() => setCopied(false), 1500);
  };
  
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join NikkahFirst',
          text: 'Find your perfect match with NikkahFirst - the premium Muslim matrimony service!',
          url: referralLink,
        });
        toast({ title: "Shared!", description: "Your referral link has been shared" });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      handleCopy();
    }
  };

  const validateForm = (methodType: string) => {
    let isValid = true;
    const newErrors = { ...errors };
    
    // Reset all errors first
    Object.keys(newErrors).forEach(key => {
      newErrors[key as keyof typeof newErrors] = '';
    });
    
    // Validate based on selected payment method
    if (methodType === 'paypal') {
      try {
        emailSchema.parse(paymentInfo.paypalEmail);
      } catch (err) {
        if (err instanceof z.ZodError) {
          newErrors.paypalEmail = err.errors[0].message;
          isValid = false;
        }
      }
    } else if (methodType === 'wise') {
      try {
        emailSchema.parse(paymentInfo.wiseEmail);
      } catch (err) {
        if (err instanceof z.ZodError) {
          newErrors.wiseEmail = err.errors[0].message;
          isValid = false;
        }
      }
    }
    
    setErrors(newErrors);
    return isValid;
  };

  const handlePaymentUpdate = async () => {
    // First validate form based on selected method
    if (!validateForm(paymentInfo.method)) {
      toast({ title: 'Validation Error', description: 'Please correct the errors in the form', variant: 'destructive' });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Call the Edge Function to update affiliate info
      const { data: response, error } = await supabase.functions.invoke('update-affiliate-info', {
        body: {
          affiliateId: affiliateData.id,
          paymentMethod: paymentInfo.method,
          paymentEmail: paymentInfo.method === 'paypal' ? paymentInfo.paypalEmail : null,
          wiseEmail: paymentInfo.method === 'wise' ? paymentInfo.wiseEmail : null,
          preferredPaymentMethod: paymentInfo.preferredMethod || paymentInfo.method
        }
      });

      if (error) {
        throw new Error(error.message);
      }
      
      // Update affiliate data in state to reflect changes
      setAffiliateData(prev => ({
        ...prev,
        payment_method: paymentInfo.method,
        payment_email: paymentInfo.method === 'paypal' ? paymentInfo.paypalEmail : prev.payment_email,
        paypal_email: paymentInfo.method === 'paypal' ? paymentInfo.paypalEmail : prev.paypal_email,
        wise_email: paymentInfo.method === 'wise' ? paymentInfo.wiseEmail : prev.wise_email,
        preferred_payment_method: paymentInfo.preferredMethod || paymentInfo.method
      }));
      
      toast({ title: 'Updated', description: 'Payment info updated successfully' });
    } catch (err: any) {
      console.error(err);
      toast({ 
        title: 'Error', 
        description: err.message || 'Failed to update payment info', 
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeletePaymentMethod = async (method: string) => {
    if (!confirm(`Are you sure you want to delete your ${method} payment details?`)) {
      return;
    }
    
    setIsSaving(true);
    
    try {
      let updates: any = {};
      
      // If deleting the preferred method, also reset preferred_payment_method
      if (method === paymentInfo.preferredMethod) {
        updates.preferredPaymentMethod = null;
      }
      
      // Set specific fields to null based on method
      if (method === 'paypal') {
        updates.paymentEmail = null;
        if (paymentInfo.method === method) {
          updates.paymentMethod = null;
        }
      } else if (method === 'wise') {
        updates.wiseEmail = null;
        if (paymentInfo.method === method) {
          updates.paymentMethod = null;
        }
      }
      
      // Call the Edge Function to update affiliate info
      const { data: response, error } = await supabase.functions.invoke('update-affiliate-info', {
        body: {
          affiliateId: affiliateData.id,
          ...updates
        }
      });

      if (error) {
        throw new Error(error.message);
      }
      
      // Update state to reflect deleted payment method
      const newPaymentInfo = { ...paymentInfo };
      
      if (method === 'paypal') newPaymentInfo.paypalEmail = '';
      else if (method === 'wise') newPaymentInfo.wiseEmail = '';
      
      if (method === newPaymentInfo.preferredMethod) {
        newPaymentInfo.preferredMethod = '';
      }
      
      if (method === newPaymentInfo.method) {
        newPaymentInfo.method = '';
      }
      
      setPaymentInfo(newPaymentInfo);
      
      // Update affiliate data in state
      setAffiliateData(prev => {
        const updatedData = { ...prev };
        if (method === 'paypal') {
          updatedData.payment_email = null;
          updatedData.paypal_email = null;
        } else if (method === 'wise') {
          updatedData.wise_email = null;
        }
        
        if (method === updatedData.preferred_payment_method) {
          updatedData.preferred_payment_method = null;
        }
        
        if (method === updatedData.payment_method) {
          updatedData.payment_method = null;
        }
        
        return updatedData;
      });
      
      toast({ title: 'Deleted', description: `${method} payment details removed successfully` });
    } catch (err: any) {
      console.error(err);
      toast({ 
        title: 'Error', 
        description: err.message || 'Failed to delete payment method', 
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const setPreferredMethod = async (method: string) => {
    setIsSaving(true);
    
    try {
      // Call the Edge Function to update affiliate info
      const { data: response, error } = await supabase.functions.invoke('update-affiliate-info', {
        body: {
          affiliateId: affiliateData.id,
          preferredPaymentMethod: method
        }
      });

      if (error) {
        throw new Error(error.message);
      }
      
      setPaymentInfo(prev => ({ ...prev, preferredMethod: method }));
      setAffiliateData(prev => ({
        ...prev,
        preferred_payment_method: method
      }));
      toast({ title: 'Updated', description: `${method} set as preferred payment method` });
    } catch (err: any) {
      console.error(err);
      toast({ 
        title: 'Error', 
        description: err.message || 'Failed to set preferred payment method', 
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to format payment method display name
  const formatMethodName = (method: string) => {
    return method.charAt(0).toUpperCase() + method.slice(1);
  };
  
  const renderPaymentMethodBadge = (method: string) => {
    const isSaved = 
      (method === 'paypal' && paymentInfo.paypalEmail) ||
      (method === 'wise' && paymentInfo.wiseEmail);
      
    const isPreferred = paymentInfo.preferredMethod === method;
    
    if (!isSaved) return null;
    
    return (
      <div className="flex space-x-2 mt-2">
        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
          <Check className="h-3 w-3 mr-1" />
          Saved
        </span>
        
        {isPreferred ? (
          <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            <Star className="h-3 w-3 mr-1" />
            Preferred
          </span>
        ) : (
          <button 
            onClick={() => setPreferredMethod(method)}
            className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full hover:bg-blue-100 hover:text-blue-800"
          >
            <StarOff className="h-3 w-3 mr-1" />
            Set as preferred
          </button>
        )}
        
        <button 
          onClick={() => handleDeletePaymentMethod(method)}
          className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full hover:bg-red-200"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Delete
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white shadow-lg p-4 flex flex-col justify-between">
        <div>
          <h2 className="text-lg font-semibold mb-6">Affiliate Dashboard</h2>
          <ul className="space-y-2">
            <li><Button variant={tab === 'dashboard' ? "default" : "ghost"} onClick={() => setTab('dashboard')} className="w-full justify-start"><PlusCircle className="mr-2 h-4 w-4" /> Dashboard</Button></li>
            <li><Button variant={tab === 'how' ? "default" : "ghost"} onClick={() => setTab('how')} className="w-full justify-start"><AlertCircle className="mr-2 h-4 w-4" /> How It Works</Button></li>
            <li><Button variant={tab === 'payment' ? "default" : "ghost"} onClick={() => setTab('payment')} className="w-full justify-start"><Share2 className="mr-2 h-4 w-4" /> Payment Settings</Button></li>
            <li><Button variant={tab === 'earnings' ? "default" : "ghost"} onClick={() => setTab('earnings')} className="w-full justify-start"><Users className="mr-2 h-4 w-4" /> Referrals & Earnings</Button></li>
          </ul>
        </div>
        <Button variant="destructive" onClick={signOut} className="mt-4">Log Out</Button>
      </aside>

      <main className="flex-1 p-6 bg-gray-50">
        {tab === 'dashboard' && affiliateData && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Welcome, {user?.email}</h1>
            </div>
            
            <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold mb-2">Your Referral Link</h2>
                    <p className="text-indigo-100 mb-4">Share this link to earn commission when users subscribe</p>
                  </div>
                  <div className="flex gap-2 mt-4 md:mt-0">
                    <Button variant="secondary" onClick={handleCopy} size="sm">
                      <Copy className="mr-2 h-4 w-4" />
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                    
                  </div>
                </div>
                <div className="mt-4 bg-white/10 rounded p-3 break-all">
                  {referralLink}
                </div>
              </CardContent>
            </Card>
  
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">Total Earned</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">£{(affiliateData.total_earned / 100).toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">Lifetime earnings</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">Total Paid</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">£{(affiliateData.total_paid / 100).toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">Received payouts</p>
                </CardContent>
              </Card>

              <Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-sm text-gray-500">Subscribed Males</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-2xl font-bold">{signupStats.subscribedMales}</p>

    <p className="text-xs text-gray-500 mt-1">Male users who subscribed</p>
  </CardContent>
</Card>

              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">Male Signups</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{signupStats.maleSignups}</p>
                  <p className="text-xs text-gray-500 mt-1">Total referred male users</p>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {referrals.length > 0 ? (
                  <div className="space-y-4">
                    {referrals.slice(0, 5).map((r, i) => (
                      <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0">
                        <div className="flex items-center">
                          <div className="bg-gray-100 p-2 rounded-full mr-3">
                            <User className="h-4 w-4 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium">
  {r.referred_user_gender === 'male' ? 'Male' : 'Female'} user{' '}
  {r.subscription_date ? 'subscribed 💰' : 'signed up'}
</p>

                            <p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
  {r.subscription_date ? 'Subscribed 💰' : 'Signed Up'}
</span>

                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">No referral activity yet. Share your link to start earning!</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === 'how' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">How to Join the NF Affiliate Program</h1>

            {/* YouTube Video */}
            <div className="aspect-video">
              <iframe
                className="w-full h-full rounded shadow-lg"
                src="https://www.youtube.com/embed/YOUR_VIDEO_ID"
                title="How to Become an Affiliate"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* Instructions */}
            <div className="space-y-8 mt-8">
              {[1, 2, 3, 4].map((step, index) => {
                const content = [
                  {
                    title: "Create Social Accounts",
                    text: "Create a TikTok, Instagram, or YouTube account. The name should include 'NikkahFirst' or 'NF', and you must use our logo as your profile pic.",
                  },
                  {
                    title: "Download Our Logo",
                    text: "Click the button below to download and use our official logo on your profile.",
                  },
                  {
                    title: "Post Marriage Content",
                    text: "Use engaging clips or quotes about marriage to promote your referral link effectively.",
                  },
                  {
                    title: "Get Inspired",
                    text: "Check our official accounts to see what works best:",
                  },
                ][index];

                return (
                  <div className="flex gap-4 items-start" key={step}>
                    <div className="bg-indigo-100 rounded-full w-10 h-10 flex items-center justify-center shrink-0">
                      <span className="font-bold text-indigo-700">{step}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{content.title}</h3>
                      <p className="text-gray-600 mt-1">{content.text}</p>
                      {step === 2 && (
                        <Button 
                          className="mt-3 bg-nikkah-pink hover:bg-nikkah-pink/90"
                          onClick={() => window.open('/nikkahfirst-logo.png', '_blank')}
                        >
                          Download Logo
                        </Button>
                      )}
                      {step === 4 && (
                        <div className="mt-4 flex flex-wrap gap-4">
                          {/* TikTok */}
                          <a
                            href="https://www.tiktok.com/@nikkahfirst"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 bg-black text-white rounded-xl shadow hover:bg-gray-800 transition"
                          >
                            <svg
                              className="w-5 h-5 mr-2"
                              viewBox="0 0 256 256"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="currentColor"
                            >
                              <path d="M168 32c0 26.51 21.49 48 48 48v32c-17.67 0-34.06-5.73-47.18-15.38l-.82 71.38c0 35.29-28.71 64-64 64s-64-28.71-64-64 28.71-64 64-64v32c-17.67 0-32 14.33-32 32s14.33 32 32 32 32-14.33 32-32V32h32z" />
                            </svg>
                            TikTok
                          </a>

                          {/* Instagram */}
                          <a
                            href="https://www.instagram.com/nikkahfirst/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-pink-500 to-yellow-500 text-white rounded-xl shadow hover:opacity-90 transition"
                          >
                            <svg
                              className="w-5 h-5 mr-2"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M7 2C4.2 2 2 4.2 2 7v10c0 2.8 2.2 5 5 5h10c2.8 0 5-2.2 5-5V7c0-2.8-2.2-5-5-5H7zm10 2c1.6 0 3 1.3 3 3v10c0 1.6-1.3 3-3 3H7c-1.6 0-3-1.3-3-3V7c0-1.6 1.3-3 3-3h10zM12 7.2c-2.6 0-4.8 2.1-4.8 4.8S9.4 16.8 12 16.8s4.8-2.1 4.8-4.8S14.6 7.2 12 7.2zm0 2c1.5 0 2.8 1.3 2.8 2.8S13.5 14.8 12 14.8 9.2 13.5 9.2 12 10.5 9.2 12 9.2zM17.8 6.2c0 .6-.5 1.1-1.1 1.1s-1.1-.5-1.1-1.1.5-1.1 1.1-1.1 1.1.5 1.1 1.1z" />
                            </svg>
                            Instagram
                          </a>

                          {/* YouTube */}
                          <a
                            href="https://www.youtube.com/@Nikkahfirst"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-xl shadow hover:bg-red-700 transition"
                          >
                            <svg
                              className="w-5 h-5 mr-2"
                              viewBox="0 0 576 512"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="currentColor"
                            >
                              <path d="M549.7 124.1c-6.3-23.8-25-42.5-48.8-48.8C456.5 64 288 64 288 64s-168.5 0-212.9 11.3c-23.8 6.3-42.5 25-48.8 48.8C16 168.5 16 256 16 256s0 87.5 10.3 131.9c6.3 23.8 25 42.5 48.8 48.8C119.5 448 288 448 288 448s168.5 0 212.9-11.3c23.8-6.3 42.5-25 48.8-48.8C560 343.5 560 256 560 256s0-87.5-10.3-131.9zM232 336V176l142 80-142 80z" />
                            </svg>
                            YouTube
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'payment' && (
          <div className="space-y-6 max-w-xl">
            <h1 className="text-2xl font-bold">Payment Settings</h1>
            <p className="text-gray-600">Select a payment method and fill in your details below.</p>

            <Tabs value={paymentInfo.method} onValueChange={(method) => setPaymentInfo((p) => ({ ...p, method }))}>
              <TabsList className="grid grid-cols-2 w-full">
                {['paypal', 'wise'].map((method) => (
                  <TabsTrigger key={method} value={method} className="capitalize">
                    {method}
                  </TabsTrigger>
                ))}
              </TabsList>

              {['paypal', 'wise'].map((method) => (
                <TabsContent key={method} value={method} className="space-y-4 pt-4">
                  <div className="flex items-center gap-2">
                    {(method === 'paypal' && paymentInfo.paypalEmail) || 
                     (method === 'wise' && paymentInfo.wiseEmail) ? (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full flex items-center">
                        <Check className="w-3 h-3 mr-1" /> Saved
                      </span>
                    ) : null}
                    {paymentInfo.preferredMethod === method ? (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full flex items-center">
                        <Star className="w-3 h-3 mr-1" /> Preferred
                      </span>
                    ) : null}
                  </div>

                  <Label>Email</Label>
                  <Input
                    value={
                      method === 'paypal' ? paymentInfo.paypalEmail :
                      paymentInfo.wiseEmail
                    }
                    onChange={(e) => setPaymentInfo((p) => ({ 
                      ...p, 
                      [`${method}Email`]: e.target.value 
                    }))}
                    placeholder={`your-${method}@example.com`}
                  />
                  {errors[`${method}Email` as keyof typeof errors] && (
                    <p className="text-red-500 text-sm">{errors[`${method}Email` as keyof typeof errors]}</p>
                  )}

                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={handlePaymentUpdate}
                      disabled={isSaving}
                      className="bg-nikkah-blue hover:bg-nikkah-blue/90"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                    {paymentInfo.preferredMethod !== method && 
                     ((method === 'paypal' && paymentInfo.paypalEmail) || 
                      (method === 'wise' && paymentInfo.wiseEmail)) && (
                      <Button variant="outline" onClick={() => setPreferredMethod(method)}>
                        Set as Preferred
                      </Button>
                    )}
                    {((method === 'paypal' && paymentInfo.paypalEmail) || 
                      (method === 'wise' && paymentInfo.wiseEmail)) && (
                      <Button variant="destructive" onClick={() => handleDeletePaymentMethod(method)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            {paymentInfo.preferredMethod && (
              <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-800">
                <h3 className="font-semibold flex items-center">
                  <Star className="h-4 w-4 mr-2" />
                  Preferred Payment Method
                </h3>
                <p className="mt-2">
                  We'll use <strong>{formatMethodName(paymentInfo.preferredMethod)}</strong> for all payouts.
                </p>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm text-yellow-800">
              <h3 className="font-semibold">Important Information</h3>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Payouts are made on the 1st and 15th of each month.</li>
                <li>Please ensure your payment details are accurate to avoid delays.</li>
                <li>You are responsible for declaring income for tax purposes.</li>
              </ul>
            </div>
          </div>
        )}

        {tab === 'earnings' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Referrals & Earnings</h1>
            <p className="text-gray-600">Track your referrals and commission earnings.</p>
            
            <Tabs defaultValue="referrals">
              <TabsList>
                <TabsTrigger value="referrals">Referred Users</TabsTrigger>
                <TabsTrigger value="payouts">Payout History</TabsTrigger>
              </TabsList>
              
              <TabsContent value="referrals">
                <Card>
                  <CardContent className="pt-6">
                    {referrals.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-300 mx-auto" />
                        <p className="mt-4 text-gray-500">No referrals yet.</p>
                        <p className="text-sm text-gray-500">Share your referral link to start earning commission!</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="text-left text-sm text-gray-500 border-b">
                              <th className="pb-2">Date</th>
                              <th className="pb-2">Gender</th>
                              <th className="pb-2">Status</th>
                              <th className="pb-2 text-right">Commission</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {referrals.map((r, i) => (
                              <tr key={i} className="text-sm">
                                <td className="py-3">{new Date(r.created_at).toLocaleDateString()}</td>
                                <td className="py-3">{r.referred_user_gender === 'male' ? 'Male' : 'Female'}</td>
<td className="py-3">
  <span className={`inline-block px-2 py-1 rounded-full text-xs ${
    r.subscription_date 
      ? 'bg-green-100 text-green-800' 
      : 'bg-gray-100 text-gray-800'
  }`}>
    {r.subscription_date ? 'Subscribed' : 'Signed Up'}
  </span>
</td>
<td className="py-3 text-right">{r.subscription_date ? '£5.00' : '£0.00'}</td>

                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="payouts">
                <Card>
                  <CardContent className="pt-6">
                    {payoutHistory.length === 0 ? (
                      <div className="text-center py-8">
                        <AlertCircle className="h-12 w-12 text-gray-300 mx-auto" />
                        <p className="mt-4 text-gray-500">No payouts yet.</p>
                        <p className="text-sm text-gray-500">Payments are processed on the 1st and 15th of each month.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="text-left text-sm text-gray-500 border-b">
                              <th className="pb-2">Date</th>
                              <th className="pb-2">Amount</th>
                              <th className="pb-2">Method</th>
                              <th className="pb-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {payoutHistory.map((p, i) => (
                              <tr key={i} className="text-sm">
                                <td className="py-3">{new Date(p.date).toLocaleDateString()}</td>
                                <td className="py-3">£{(p.amount / 100).toFixed(2)}</td>
                                <td className="py-3">{p.method || 'Bank Transfer'}</td>
                                <td className="py-3">
                                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                                    p.status === 'Paid' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {p.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
};

export default AffiliateDashboard;
