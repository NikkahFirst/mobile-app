
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Download, 
  ArrowUpDown, 
  Search,
  MoreVertical,
  BarChart2,
  LineChart,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Clock
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { AffiliateStats } from "@/components/AffiliateStats";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const CHART_COLORS = ['#10B981', '#3B82F6', '#A855F7', '#EC4899', '#F97316', '#EAB308'];

const AdminAffiliates = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [affiliates, setAffiliates] = useState([]);
  const [filteredAffiliates, setFilteredAffiliates] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [activeTab, setActiveTab] = useState("affiliates");
  const [processingPayoutIds, setProcessingPayoutIds] = useState([]);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("PayPal");
  const [paymentEmail, setPaymentEmail] = useState("");
  const [analyticsData, setAnalyticsData] = useState({
    monthlySignups: [],
    conversionsByPlan: [],
    totalRevenue: 0,
    totalCommissions: 0,
    conversionRate: 0
  });
  const [affiliateConversions, setAffiliateConversions] = useState([]);
  const [selectedAffiliateId, setSelectedAffiliateId] = useState(null);
  const [loadingConversions, setLoadingConversions] = useState(false);
  
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/admin');
          return;
        }
        
        const { data, error } = await supabase.functions.invoke('verify-admin', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        
        if (error || !data.isAdmin) {
          await supabase.auth.signOut();
          navigate('/admin');
        } else {
          loadAffiliateData();
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        navigate('/admin');
      }
    };
    
    checkAdminStatus();
  }, [navigate]);
  
  const loadAffiliateData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("You must be logged in to view affiliates");
      }
      
      // Get all affiliate users first using edge function to bypass RLS
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, gender, created_at')
        .eq('gender', 'affiliate');
      
      if (profilesError) {
        throw new Error(profilesError.message);
      }
      
      console.log("Affiliate profiles data:", profilesData);
      
      // Then get all registered affiliates using edge function
      const { data: affiliateResult, error: affiliateError } = await supabase.functions.invoke('fetch-affiliates', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (affiliateError) {
        throw new Error(affiliateError.message);
      }
      
      // Check if the result is valid
      if (!affiliateResult || !affiliateResult.data) {
        throw new Error("Failed to fetch affiliate data");
      }
      
      const affiliateData = affiliateResult.data;
      console.log("Raw affiliate data:", affiliateData);
      
      // Fetch profile details for each registered affiliate
      const affiliateProfiles = await Promise.all(
        affiliateData.map(async (affiliate) => {
          if (!affiliate.user_id) return { ...affiliate, profile: null };
          
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .eq('id', affiliate.user_id)
            .single();
          
          if (profileError) {
            console.error(`Error fetching profile for user ${affiliate.user_id}:`, profileError);
            return { ...affiliate, profile: null };
          }
          
          return { ...affiliate, profile: profileData };
        })
      );
      
      // Get conversion counts for each affiliate
      const affiliatesWithConversions = await Promise.all(
        affiliateProfiles.map(async (affiliate) => {
          const { count, error } = await supabase
            .from('affiliate_conversions')
            .select('id', { count: 'exact', head: true })
            .eq('affiliate_id', affiliate.id);
          
          if (error) {
            console.error(`Error fetching conversions for affiliate ${affiliate.id}:`, error);
          }
          
          return {
            ...affiliate,
            profiles: affiliate.profile, // To match the existing structure
            conversionCount: count || 0,
            balance: (affiliate.total_earned || 0) - (affiliate.total_paid || 0)
          };
        })
      );
      
      console.log("Processed affiliate data:", affiliatesWithConversions);
      
      // Process profiles that are not registered as affiliates yet
      const unregisteredAffiliates = profilesData
        .filter(profile => !affiliateProfiles.some(a => a.user_id === profile.id))
        .map(profile => ({
          id: profile.id + "-affiliate",
          user_id: profile.id,
          affiliate_code: "N/A",
          profiles: {
            id: profile.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email
          },
          created_at: profile.created_at,
          conversionCount: 0,
          total_earned: 0,
          total_paid: 0,
          balance: 0,
          payment_email: profile.email,
          payment_method: 'PayPal',
          isAffiliateUser: true
        }));
      
      const combinedAffiliates = [...affiliatesWithConversions, ...unregisteredAffiliates];
      
      setAffiliates(combinedAffiliates);
      setFilteredAffiliates(combinedAffiliates);
      
      // Get payout history
      const { data: payoutResult, error: payoutFnError } = await supabase.functions.invoke('fetch-affiliate-payouts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (payoutFnError) {
        throw new Error(payoutFnError.message);
      }
      
      const payoutData = payoutResult?.data || [];
      
      // For each payout, fetch affiliate details
      const enhancedPayouts = await Promise.all(
        payoutData.map(async (payout) => {
          const { data: affiliate, error: affiliateError } = await supabase
            .from('affiliates')
            .select('id, user_id')
            .eq('id', payout.affiliate_id)
            .single();
            
          if (affiliateError || !affiliate) {
            return payout;
          }
          
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', affiliate.user_id)
            .single();
            
          return {
            ...payout,
            affiliates: {
              id: affiliate.id,
              user_id: affiliate.user_id,
              profiles: profile || null
            }
          };
        })
      );
      
      setPayouts(enhancedPayouts);
    } catch (error) {
      console.error("Error loading affiliate data:", error);
      toast({
        title: "Error loading data",
        description: error.message || "Failed to load affiliate data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadAffiliateConversions = async (affiliateId) => {
    if (!affiliateId) return;
    
    setSelectedAffiliateId(affiliateId);
    setLoadingConversions(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("You must be logged in to view affiliate conversions");
      }
      
      const { data, error } = await supabase
        .from('affiliate_conversions')
        .select('*, profiles!affiliate_conversions_referred_user_id_fkey(first_name, last_name, email)')
        .eq('affiliate_id', affiliateId)
        .order('conversion_date', { ascending: false });
      
      if (error) throw error;
      
      console.log("Affiliate conversions:", data);
      setAffiliateConversions(data || []);
    } catch (error) {
      console.error("Error loading affiliate conversions:", error);
      toast({
        title: "Error loading conversions",
        description: error.message || "Failed to load affiliate conversions",
        variant: "destructive"
      });
    } finally {
      setLoadingConversions(false);
      setActiveTab('earnings');
    }
  };
  
  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    
    if (!query) {
      setFilteredAffiliates(affiliates);
    } else {
      const filtered = affiliates.filter(affiliate => 
        affiliate.profiles?.first_name?.toLowerCase().includes(query) ||
        affiliate.profiles?.last_name?.toLowerCase().includes(query) ||
        affiliate.profiles?.email?.toLowerCase().includes(query) ||
        (affiliate.affiliate_code && affiliate.affiliate_code.toLowerCase().includes(query))
      );
      setFilteredAffiliates(filtered);
    }
  };
  
  const handleRegisterAffiliate = async (userId) => {
    try {
      const { data, error } = await supabase.rpc('register_affiliate', {
        user_id: userId
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      toast({
        title: "Affiliate Registered",
        description: "User has been registered as an affiliate partner"
      });
      
      loadAffiliateData();
    } catch (error) {
      console.error("Error registering affiliate:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register user as affiliate",
        variant: "destructive"
      });
    }
  };
  
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    
    const sorted = [...filteredAffiliates].sort((a, b) => {
      let aValue = a[field];
      let bValue = b[field];
      
      if (field === 'name') {
        aValue = [a.profiles?.first_name, a.profiles?.last_name].filter(Boolean).join(' ');
        bValue = [b.profiles?.first_name, b.profiles?.last_name].filter(Boolean).join(' ');
      } else if (field === 'email') {
        aValue = a.profiles?.email;
        bValue = b.profiles?.email;
      }
      
      if (field === 'total_earned' || field === 'total_paid' || field === 'balance') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      if (typeof aValue === 'string') {
        if (sortDirection === 'asc') {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      }
      
      if (sortDirection === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
    
    setFilteredAffiliates(sorted);
  };
  
  const openPaymentDialog = (affiliate) => {
    setSelectedAffiliate(affiliate);
    setPaymentAmount(((affiliate.balance || 0) / 100).toFixed(2));
    setPaymentMethod(affiliate.payment_method || 'PayPal');
    setPaymentEmail(affiliate.payment_email || affiliate.profiles?.email || '');
    setIsPaymentDialogOpen(true);
  };
  
  const closePaymentDialog = () => {
    setIsPaymentDialogOpen(false);
    setSelectedAffiliate(null);
    setPaymentAmount("");
    setPaymentEmail("");
  };
  
  const handleProcessPayout = async () => {
    if (!selectedAffiliate) return;
    
    const amountInPence = Math.round(parseFloat(paymentAmount) * 100);
    
    if (isNaN(amountInPence) || amountInPence <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount",
        variant: "destructive"
      });
      return;
    }
    
    if (!paymentEmail) {
      toast({
        title: "Missing Payment Email",
        description: "Please enter a payment email address",
        variant: "destructive"
      });
      return;
    }
    
    setProcessingPayoutIds(prev => [...prev, selectedAffiliate.id]);
    closePaymentDialog();
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("You must be logged in to process payouts");
      }
      
      const { data, error } = await supabase.functions.invoke("process-affiliate-payout", {
        body: {
          affiliateId: selectedAffiliate.id,
          amount: amountInPence,
          paymentMethod,
          paymentDetails: paymentEmail
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (error) throw new Error(error.message || "Failed to process payout");
      
      toast({
        title: "Payout Processed",
        description: `Successfully processed payout of ${formatCurrency(amountInPence)}`
      });
      
      loadAffiliateData();
    } catch (error) {
      console.error("Error processing payout:", error);
      toast({
        title: "Payout Failed",
        description: error.message || "Failed to process payout",
        variant: "destructive"
      });
    } finally {
      setProcessingPayoutIds(prev => prev.filter(id => id !== selectedAffiliate.id));
    }
  };
  
  const handleUpdatePaymentInfo = async (affiliateId, newEmail, newMethod) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("You must be logged in to update payment information");
      }
      
      const { data, error } = await supabase.functions.invoke("update-affiliate-info", {
        body: {
          affiliateId,
          paymentEmail: newEmail,
          paymentMethod: newMethod
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (error) throw new Error(error.message || "Failed to update payment information");
      
      toast({
        title: "Payment Info Updated",
        description: "Successfully updated affiliate payment information"
      });
      
      loadAffiliateData();
    } catch (error) {
      console.error("Error updating payment info:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update payment information",
        variant: "destructive"
      });
    }
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2
    }).format(amount / 100);
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "dd MMM yyyy");
  };
  
  const exportToCSV = (data, filename) => {
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(item => Object.values(item).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  const exportAffiliates = () => {
    const exportData = affiliates.map(affiliate => ({
      Name: [affiliate.profiles?.first_name, affiliate.profiles?.last_name].filter(Boolean).join(' '),
      Email: affiliate.profiles?.email || '',
      PaymentEmail: affiliate.payment_email || affiliate.profiles?.email || '',
      PaymentMethod: affiliate.payment_method || 'PayPal',
      AffiliateCode: affiliate.affiliate_code || 'Not registered',
      ReferralCount: affiliate.conversionCount,
      TotalEarned: formatCurrency(affiliate.total_earned || 0).replace('£', ''),
      TotalPaid: formatCurrency(affiliate.total_paid || 0).replace('£', ''),
      Balance: formatCurrency(affiliate.balance || 0).replace('£', ''),
      JoinedDate: formatDate(affiliate.created_at)
    }));
    
    exportToCSV(exportData, 'nikkahfirst-affiliates.csv');
  };
  
  const exportPayouts = () => {
    const exportData = payouts.map(payout => ({
      Affiliate: [
        payout.affiliates?.profiles?.first_name,
        payout.affiliates?.profiles?.last_name
      ].filter(Boolean).join(' '),
      Email: payout.affiliates?.profiles?.email || '',
      Amount: formatCurrency(payout.amount || 0).replace('£', ''),
      PayoutDate: formatDate(payout.payout_date),
      Status: payout.status,
      PaymentMethod: payout.payment_method,
      PaymentDetails: payout.payment_details || '',
      PeriodStart: formatDate(payout.period_start),
      PeriodEnd: formatDate(payout.period_end)
    }));
    
    exportToCSV(exportData, 'nikkahfirst-affiliate-payouts.csv');
  };

  const exportConversions = () => {
    const exportData = affiliateConversions.map(conversion => ({
      ReferredUser: conversion.profiles?.first_name && conversion.profiles?.last_name 
        ? `${conversion.profiles.first_name} ${conversion.profiles.last_name}` 
        : 'Unknown',
      Email: conversion.profiles?.email || 'N/A',
      Plan: conversion.subscription_plan || 'Unknown',
      Amount: formatCurrency(conversion.commission_amount || 0).replace('£', ''),
      Date: formatDate(conversion.conversion_date),
      Status: conversion.is_paid ? 'Paid' : 'Unpaid',
      PayoutID: conversion.payment_id || 'N/A'
    }));
    
    exportToCSV(exportData, 'nikkahfirst-affiliate-conversions.csv');
  };
  
  const loadAnalyticsData = async () => {
    try {
      const lastSixMonths = Array.from({ length: 6 }, (_, i) => {
        const date = subMonths(new Date(), i);
        return {
          start: startOfMonth(date),
          end: endOfMonth(date),
          name: format(date, 'MMM yyyy')
        };
      }).reverse();
      
      const monthlySignupsPromises = lastSixMonths.map(async (month) => {
        const { count } = await supabase
          .from('affiliate_referrals')
          .select('id', { count: 'exact', head: true })
          .gte('signup_date', month.start.toISOString())
          .lte('signup_date', month.end.toISOString());
          
        return {
          name: month.name,
          signups: count || 0
        };
      });
      
      const { data: conversions } = await supabase
        .from('affiliate_conversions')
        .select('subscription_plan, commission_amount');
        
      const planMap = new Map();
      let totalCommissions = 0;
      
      if (conversions) {
        conversions.forEach(conversion => {
          totalCommissions += conversion.commission_amount;
          
          const plan = conversion.subscription_plan || 'Unknown';
          if (!planMap.has(plan)) {
            planMap.set(plan, { name: plan, value: 0, amount: 0 });
          }
          
          const planData = planMap.get(plan);
          planData.value += 1;
          planData.amount += conversion.commission_amount;
          planMap.set(plan, planData);
        });
      }
      
      const { count: referralCount } = await supabase
        .from('affiliate_referrals')
        .select('id', { count: 'exact', head: true });
        
      const { count: conversionCount } = await supabase
        .from('affiliate_conversions')
        .select('id', { count: 'exact', head: true });
        
      const conversionRate = referralCount > 0 
        ? (conversionCount / referralCount) * 100 
        : 0;
      
      setAnalyticsData({
        monthlySignups: await Promise.all(monthlySignupsPromises),
        conversionsByPlan: Array.from(planMap.values()),
        totalRevenue: totalCommissions,
        totalCommissions,
        conversionRate
      });
    } catch (error) {
      console.error("Error loading analytics data:", error);
    }
  };
  
  const updateAffiliatePaymentInfo = async (affiliateId, paymentEmail, paymentMethod) => {
    try {
      const { error } = await supabase
        .from('affiliates')
        .update({
          payment_email: paymentEmail,
          payment_method: paymentMethod
        })
        .eq('id', affiliateId);
        
      if (error) throw error;
      
      toast({
        title: "Payment Information Updated",
        description: "Affiliate payment details have been updated"
      });
      
      loadAffiliateData();
    } catch (error) {
      console.error("Error updating payment information:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update payment information",
        variant: "destructive"
      });
    }
  };
  
  useEffect(() => {
    if (activeTab === 'analytics' && !analyticsData.monthlySignups.length) {
      loadAnalyticsData();
    }
  }, [activeTab]);
  
  // Find the selected affiliate to display in earnings tab
  const selectedAffiliateDetails = affiliates.find(a => a.id === selectedAffiliateId);
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Affiliate Management</h1>
            </div>
            
            <Tabs defaultValue="affiliates" value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
                  <TabsTrigger value="earnings">Earnings</TabsTrigger>
                  <TabsTrigger value="payouts">Payout History</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>
                
                <div className="flex items-center gap-2">
                  {activeTab !== 'analytics' && (
                    <>
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="pl-8 w-60"
                          placeholder="Search..."
                          value={searchQuery}
                          onChange={handleSearch}
                        />
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={
                          activeTab === "affiliates" ? exportAffiliates : 
                          activeTab === "payouts" ? exportPayouts :
                          activeTab === "earnings" ? exportConversions : null
                        }
                      >
                        <Download className="mr-1 h-4 w-4" />
                        Export
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              <TabsContent value="affiliates">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Affiliate Partners</CardTitle>
                    <CardDescription>
                      Manage your affiliate partners and process commission payments
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="text-center py-6">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nikkah-pink mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading affiliate data...</p>
                      </div>
                    ) : filteredAffiliates.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                              <div className="flex items-center gap-1">
                                Name
                                {sortField === 'name' && (
                                  <ArrowUpDown className="h-4 w-4" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort('email')}>
                              <div className="flex items-center gap-1">
                                Email
                                {sortField === 'email' && (
                                  <ArrowUpDown className="h-4 w-4" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead>
                              <div className="flex items-center gap-1">
                                Payment Details
                              </div>
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort('affiliate_code')}>
                              <div className="flex items-center gap-1">
                                Referral Code
                                {sortField === 'affiliate_code' && (
                                  <ArrowUpDown className="h-4 w-4" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead className="cursor-pointer text-right" onClick={() => handleSort('conversionCount')}>
                              <div className="flex items-center gap-1 justify-end">
                                Referrals
                                {sortField === 'conversionCount' && (
                                  <ArrowUpDown className="h-4 w-4" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead className="cursor-pointer text-right" onClick={() => handleSort('total_earned')}>
                              <div className="flex items-center gap-1 justify-end">
                                Total Earned
                                {sortField === 'total_earned' && (
                                  <ArrowUpDown className="h-4 w-4" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead className="cursor-pointer text-right" onClick={() => handleSort('total_paid')}>
                              <div className="flex items-center gap-1 justify-end">
                                Total Paid
                                {sortField === 'total_paid' && (
                                  <ArrowUpDown className="h-4 w-4" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead className="cursor-pointer text-right" onClick={() => handleSort('balance')}>
                              <div className="flex items-center gap-1 justify-end">
                                Balance
                                {sortField === 'balance' && (
                                  <ArrowUpDown className="h-4 w-4" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAffiliates.map(affiliate => (
                            <TableRow key={affiliate.id}>
                              <TableCell>
                                {[affiliate.profiles?.first_name, affiliate.profiles?.last_name].filter(Boolean).join(' ') || 'Unknown'}
                              </TableCell>
                              <TableCell>{affiliate.profiles?.email || 'N/A'}</TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <div className="font-medium">
                                    {affiliate.payment_method || 'PayPal'}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {affiliate.payment_email || affiliate.profiles?.email || 'Not set'}
                                  </div>
                                  {!affiliate.isAffiliateUser && !affiliate.payment_email && (
                                    <Button 
                                      variant="link" 
                                      className="p-0 h-auto text-xs text-nikkah-pink" 
                                      onClick={() => {
                                        setSelectedAffiliate(affiliate);
                                        setPaymentEmail(affiliate.profiles?.email || '');
                                        setPaymentMethod(affiliate.payment_method || 'PayPal');
                                        setIsPaymentDialogOpen(true);
                                      }}
                                    >
                                      Set payment details
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {affiliate.affiliate_code || 'N/A'}
                                {affiliate.affiliate_code && affiliate.affiliate_code !== 'N/A' && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    https://app.nikkahfirst.com/signup?ref={affiliate.affiliate_code}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right">{affiliate.conversionCount}</TableCell>
                              <TableCell className="text-right">{formatCurrency(affiliate.total_earned || 0)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(affiliate.total_paid || 0)}</TableCell>
                              <TableCell className="text-right">
                                <span className={affiliate.balance > 0 ? "text-green-600 font-medium" : ""}>
                                  {formatCurrency(affiliate.balance || 0)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {affiliate.isAffiliateUser ? (
                                      <DropdownMenuItem onClick={() => handleRegisterAffiliate(affiliate.user_id)}>
                                        Register as Affiliate
                                      </DropdownMenuItem>
                                    ) : (
                                      <>
                                        <DropdownMenuItem onClick={() => loadAffiliateConversions(affiliate.id)}>
                                          View Earnings
                                        </DropdownMenuItem>
                                        {affiliate.balance > 0 && (
                                          <DropdownMenuItem onClick={() => openPaymentDialog(affiliate)}>
                                            Process Payout
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem onClick={() => {
                                          setSelectedAffiliate(affiliate);
                                          setPaymentEmail(affiliate.payment_email || affiliate.profiles?.email || '');
                                          setPaymentMethod(affiliate.payment_method || 'PayPal');
                                          setIsPaymentDialogOpen(true);
                                        }}>
                                          Update Payment Info
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-gray-500">No affiliates found matching your search criteria.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="earnings">
                {selectedAffiliateId ? (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <CardTitle>
                              {selectedAffiliateDetails ? 
                                [selectedAffiliateDetails.profiles?.first_name, selectedAffiliateDetails.profiles?.last_name].filter(Boolean).join(' ') :
                                'Affiliate'} Earnings
                            </CardTitle>
                            <CardDescription>
                              Detailed view of affiliate's earnings and commissions
                            </CardDescription>
                          </div>
                          <Button variant="outline" onClick={() => setSelectedAffiliateId(null)}>
                            Back to All Affiliates
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {selectedAffiliateDetails && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <Card>
                              <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Earned</p>
                                    <h3 className="text-2xl font-bold">{formatCurrency(selectedAffiliateDetails.total_earned || 0)}</h3>
                                  </div>
                                  <div className="bg-green-100 p-2 rounded-full">
                                    <DollarSign className="h-5 w-5 text-green-600" />
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                                    <h3 className="text-2xl font-bold">{formatCurrency(selectedAffiliateDetails.total_paid || 0)}</h3>
                                  </div>
                                  <div className="bg-blue-100 p-2 rounded-full">
                                    <CheckCircle className="h-5 w-5 text-blue-600" />
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Current Balance</p>
                                    <h3 className="text-2xl font-bold">{formatCurrency(selectedAffiliateDetails.balance || 0)}</h3>
                                  </div>
                                  <div className="bg-purple-100 p-2 rounded-full">
                                    <Clock className="h-5 w-5 text-purple-600" />
                                  </div>
                                </div>
                                {selectedAffiliateDetails.balance > 0 && (
                                  <Button 
                                    className="w-full mt-4" 
                                    onClick={() => openPaymentDialog(selectedAffiliateDetails)}
                                    disabled={processingPayoutIds.includes(selectedAffiliateDetails.id)}
                                  >
                                    {processingPayoutIds.includes(selectedAffiliateDetails.id) ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Processing...
                                      </>
                                    ) : (
                                      <>Pay via {selectedAffiliateDetails.payment_method || 'PayPal'}</>
                                    )}
                                  </Button>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        )}

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Conversion History</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {loadingConversions ? (
                              <div className="text-center py-6">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nikkah-pink mx-auto mb-4"></div>
                                <p className="text-gray-500">Loading conversion data...</p>
                              </div>
                            ) : affiliateConversions.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Plan</TableHead>
                                    <TableHead>Commission</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {affiliateConversions.map(conversion => (
                                    <TableRow key={conversion.id}>
                                      <TableCell>
                                        {conversion.profiles?.first_name && conversion.profiles?.last_name 
                                          ? `${conversion.profiles.first_name} ${conversion.profiles.last_name}` 
                                          : 'Unknown'}
                                      </TableCell>
                                      <TableCell>{conversion.profiles?.email || 'N/A'}</TableCell>
                                      <TableCell>
                                        <Badge variant={conversion.subscription_plan?.includes('Premium') ? 'default' : 'outline'}>
                                          {conversion.subscription_plan || 'Unknown'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>{formatCurrency(conversion.commission_amount || 0)}</TableCell>
                                      <TableCell>{formatDate(conversion.conversion_date)}</TableCell>
                                      <TableCell>
                                        <Badge variant={conversion.is_paid ? 'success' : 'secondary'}>
                                          {conversion.is_paid ? 'Paid' : 'Unpaid'}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <div className="text-center py-6">
                                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-gray-500">No conversions found for this affiliate.</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>Select an Affiliate</CardTitle>
                      <CardDescription>
                        Please select an affiliate from the Affiliates tab to view their earnings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center py-12">
                      <Button onClick={() => setActiveTab('affiliates')}>
                        Go to Affiliates
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="payouts">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Payout History</CardTitle>
                    <CardDescription>
                      View all payments made to affiliates
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="text-center py-6">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nikkah-pink mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading payout data...</p>
                      </div>
                    ) : payouts.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Affiliate</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Payment Method</TableHead>
                            <TableHead>Payment Details</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payouts.map(payout => (
                            <TableRow key={payout.id}>
                              <TableCell>
                                {payout.affiliates?.profiles 
                                  ? [payout.affiliates.profiles.first_name, payout.affiliates.profiles.last_name].filter(Boolean).join(' ') 
                                  : 'Unknown'}
                              </TableCell>
                              <TableCell>
                                {payout.affiliates?.profiles?.email || 'N/A'}
                              </TableCell>
                              <TableCell>
                                <span className="font-medium">{formatCurrency(payout.amount || 0)}</span>
                              </TableCell>
                              <TableCell>{payout.payment_method || 'PayPal'}</TableCell>
                              <TableCell>{payout.payment_details || 'N/A'}</TableCell>
                              <TableCell>{formatDate(payout.payout_date)}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  payout.status === 'completed' ? 'success' : 
                                  payout.status === 'pending' ? 'secondary' : 
                                  'destructive'
                                }>
                                  {payout.status || 'pending'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-gray-500">No payout history found.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="analytics">
                <Card>
                  <CardHeader>
                    <CardTitle>Affiliate Program Analytics</CardTitle>
                    <CardDescription>
                      Overview of your affiliate program performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                              <h3 className="text-2xl font-bold">{formatCurrency(analyticsData.totalRevenue || 0)}</h3>
                            </div>
                            <div className="bg-green-100 p-2 rounded-full">
                              <DollarSign className="h-5 w-5 text-green-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Total Commissions Paid</p>
                              <h3 className="text-2xl font-bold">{formatCurrency(analyticsData.totalCommissions || 0)}</h3>
                            </div>
                            <div className="bg-blue-100 p-2 rounded-full">
                              <DollarSign className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                              <h3 className="text-2xl font-bold">{analyticsData.conversionRate.toFixed(1)}%</h3>
                            </div>
                            <div className="bg-purple-100 p-2 rounded-full">
                              <BarChart2 className="h-5 w-5 text-purple-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Monthly Referrals</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={analyticsData.monthlySignups}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <RechartsTooltip />
                                <Bar dataKey="signups" fill="#3B82F6" name="Referrals" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Conversions by Plan</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={analyticsData.conversionsByPlan}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="value"
                                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                  {analyticsData.conversionsByPlan.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                  ))}
                                </Pie>
                                <RechartsTooltip 
                                  formatter={(value, name, props) => [`${value} conversions (${formatCurrency(props.payload.amount)})`, name]}
                                />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Top Performing Affiliates</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead className="text-right">Referrals</TableHead>
                              <TableHead className="text-right">Conversions</TableHead>
                              <TableHead className="text-right">Earnings</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {affiliates
                              .filter(a => !a.isAffiliateUser)
                              .sort((a, b) => (b.total_earned || 0) - (a.total_earned || 0))
                              .slice(0, 5)
                              .map(affiliate => (
                                <TableRow key={affiliate.id}>
                                  <TableCell>
                                    {[affiliate.profiles?.first_name, affiliate.profiles?.last_name].filter(Boolean).join(' ') || 'Unknown'}
                                  </TableCell>
                                  <TableCell>{affiliate.profiles?.email || 'N/A'}</TableCell>
                                  <TableCell className="text-right">{affiliate.conversionCount}</TableCell>
                                  <TableCell className="text-right">{affiliate.conversionCount}</TableCell>
                                  <TableCell className="text-right font-medium">{formatCurrency(affiliate.total_earned || 0)}</TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {selectedAffiliate?.payment_email ? "Update Payment Information" : "Process Affiliate Payout"}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedAffiliate?.payment_email ? 
                      "Update the payment method and email for this affiliate." : 
                      "Enter the payout details to process a payment to this affiliate."}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment-method">Payment Method</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={paymentMethod === "PayPal" ? "default" : "outline"}
                        className="w-full"
                        onClick={() => setPaymentMethod("PayPal")}
                      >
                        PayPal
                      </Button>
                      <Button
                        type="button"
                        variant={paymentMethod === "Bank Transfer" ? "default" : "outline"}
                        className="w-full"
                        onClick={() => setPaymentMethod("Bank Transfer")}
                      >
                        Bank Transfer
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment-email">
                      {paymentMethod === "PayPal" ? "PayPal Email" : "Payment Details"}
                    </Label>
                    <Input
                      id="payment-email"
                      value={paymentEmail}
                      onChange={(e) => setPaymentEmail(e.target.value)}
                      placeholder={paymentMethod === "PayPal" ? "email@example.com" : "Account details..."}
                    />
                  </div>

                  {!selectedAffiliate?.payment_email && (
                    <div className="space-y-2">
                      <Label htmlFor="payment-amount">Amount (£)</Label>
                      <Input
                        id="payment-amount"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0.00"
                        type="number"
                        step="0.01"
                        min="0"
                      />
                      {selectedAffiliate && (
                        <p className="text-xs text-muted-foreground">
                          Available balance: {formatCurrency(selectedAffiliate.balance || 0)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={closePaymentDialog}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={selectedAffiliate?.payment_email ? 
                      () => handleUpdatePaymentInfo(selectedAffiliate.id, paymentEmail, paymentMethod) : 
                      handleProcessPayout
                    }
                    disabled={!paymentEmail || (!selectedAffiliate?.payment_email && (!paymentAmount || parseFloat(paymentAmount) <= 0))}
                  >
                    {selectedAffiliate?.payment_email ? "Update Information" : "Process Payout"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminAffiliates;
