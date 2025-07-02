import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  CreditCard, 
  Calendar, 
  RefreshCw,
  Filter,
  ArrowUpDown,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart4,
  Users,
  Wallet
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, subDays, parseISO, isValid } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Input } from "@/components/ui/input";

// Bar chart from recharts
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

// Define interface for financial metrics
interface FinancialMetrics {
  totalRevenue: number;
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
  monthOverMonthGrowth: number;
  averageOrderValue: number;
  subscriptionCount: number;
  maleSubscribers: number;
  femaleSubscribers: number;
  conversionRate: number;
  monthlyRevenueData: Array<{
    date: string;
    revenue: number;
  }>;
}

// Interface for payment data
interface PaymentData {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
  description: string;
}

const AdminPayments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    totalRevenue: 0,
    revenueToday: 0,
    revenueThisWeek: 0,
    revenueThisMonth: 0,
    monthOverMonthGrowth: 0,
    averageOrderValue: 0,
    subscriptionCount: 0,
    maleSubscribers: 0,
    femaleSubscribers: 0,
    conversionRate: 0,
    monthlyRevenueData: []
  });
  
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTimeframe, setFilterTimeframe] = useState<string>("all");
  const [filterAmount, setFilterAmount] = useState<string>("");
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Format currency
  const formatCurrency = (amount: number, currency: string = "GBP") => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };
  
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/admin');
          return;
        }
        
        // Call the admin verify function to check if the user is an admin
        const { data, error } = await supabase.functions.invoke('verify-admin', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        
        if (error || !data.isAdmin) {
          // If not an admin, sign out and navigate to login
          await supabase.auth.signOut();
          navigate('/admin');
          return;
        }
        
        fetchFinancialData(session.access_token);
      } catch (error) {
        console.error("Error checking admin status:", error);
        navigate('/admin');
      }
    };
    
    checkAdminStatus();
  }, [navigate, toast]);
  
  const fetchFinancialData = async (accessToken: string) => {
    setIsLoading(true);
    
    try {
      // Create custom edge function to get financial metrics and data
      const { data, error } = await supabase.functions.invoke('admin-financial-metrics', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: {
          page: currentPage,
          limit: itemsPerPage,
          filterStatus,
          filterTimeframe,
          filterAmount: filterAmount ? parseFloat(filterAmount) : null,
          sortField,
          sortDirection
        }
      });
      
      if (error) {
        throw error;
      }
      
      setMetrics(data.metrics);
      setPayments(data.payments);
    } catch (error: any) {
      console.error("Error fetching financial data:", error);
      toast({
        title: "Failed to load financial data",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    const sessionResponse = await supabase.auth.getSession();
    const session = sessionResponse.data.session;
    if (session) {
      fetchFinancialData(session.access_token);
    }
  };
  
  const handleFilter = async () => {
    const sessionResponse = await supabase.auth.getSession();
    const session = sessionResponse.data.session;
    if (session) {
      fetchFinancialData(session.access_token);
    }
  };
  
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    
    // Refetch with new sorting
    handleFilter();
  };
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    handleFilter();
  };
  
  // Prepare chart data
  const chartData = metrics.monthlyRevenueData.map(item => ({
    month: format(isValid(new Date(item.date)) ? new Date(item.date) : new Date(), 'MMM'),
    revenue: item.revenue
  }));

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 overflow-auto">
          <header className="bg-white dark:bg-gray-800 shadow-sm p-4 md:p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">Financial Management</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage and monitor all financial transactions on NikkahFirst</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center space-x-1"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </header>
          
          <main className="p-4 md:p-6">
            {/* Financial Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-2 text-green-500" />
                    {isLoading ? (
                      <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                    ) : (
                      <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Today's Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                    {isLoading ? (
                      <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                    ) : (
                      <div className="text-2xl font-bold">{formatCurrency(metrics.revenueToday)}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
                    {isLoading ? (
                      <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                    ) : (
                      <div className="text-2xl font-bold">{formatCurrency(metrics.revenueThisWeek)}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-violet-500" />
                    {isLoading ? (
                      <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                    ) : (
                      <div className="text-2xl font-bold">{formatCurrency(metrics.revenueThisMonth)}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    {metrics.monthOverMonthGrowth >= 0 ? (
                      <TrendingUp className="w-4 h-4 mr-2 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 mr-2 text-red-500" />
                    )}
                    {isLoading ? (
                      <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                    ) : (
                      <div className={`text-2xl font-bold ${metrics.monthOverMonthGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {metrics.monthOverMonthGrowth >= 0 ? '+' : ''}{metrics.monthOverMonthGrowth.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Order Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <BarChart4 className="w-4 h-4 mr-2 text-amber-500" />
                    {isLoading ? (
                      <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                    ) : (
                      <div className="text-2xl font-bold">{formatCurrency(metrics.averageOrderValue)}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Wallet className="w-4 h-4 mr-2 text-nikkah-blue" />
                    {isLoading ? (
                      <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                    ) : (
                      <div className="text-2xl font-bold">{metrics.subscriptionCount}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2 text-pink-500" />
                    {isLoading ? (
                      <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                    ) : (
                      <div className="text-2xl font-bold">{metrics.conversionRate.toFixed(1)}%</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Revenue Chart */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Monthly Revenue</CardTitle>
                <CardDescription>Revenue trends over the past 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {isLoading ? (
                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis 
                          tickFormatter={(value) => `£${value}`} 
                          width={80}
                        />
                        <Tooltip 
                          formatter={(value) => [`£${value}`, 'Revenue']}
                          labelFormatter={(label) => `Month: ${label}`}
                        />
                        <Legend />
                        <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Payments Table with Filtering and Sorting */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Payment Transactions</CardTitle>
                <CardDescription>View and manage all payment transactions</CardDescription>
                
                <div className="flex flex-col md:flex-row gap-4 mt-4">
                  <div className="flex flex-row gap-4">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-[180px]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="succeeded">Succeeded</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={filterTimeframe} onValueChange={setFilterTimeframe}>
                      <SelectTrigger className="w-[180px]">
                        <Calendar className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Timeframe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="year">This Year</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="Min Amount"
                        className="w-[120px]"
                        value={filterAmount}
                        onChange={(e) => setFilterAmount(e.target.value)}
                      />
                    </div>
                    
                    <Button variant="outline" onClick={handleFilter}>
                      <Filter className="w-4 h-4 mr-2" />
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead onClick={() => handleSort("user_name")} className="cursor-pointer">
                          <div className="flex items-center">
                            Customer
                            {sortField === "user_name" && (
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead onClick={() => handleSort("amount")} className="cursor-pointer">
                          <div className="flex items-center">
                            Amount
                            {sortField === "amount" && (
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead onClick={() => handleSort("created_at")} className="cursor-pointer">
                          <div className="flex items-center">
                            Date
                            {sortField === "created_at" && (
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array(5).fill(0).map((_, index) => (
                          <TableRow key={index}>
                            <TableCell colSpan={6}>
                              <div className="h-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-full"></div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : payments.length > 0 ? (
                        payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{payment.user_name || 'Unknown User'}</span>
                                <span className="text-sm text-muted-foreground">{payment.user_email}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(payment.amount / 100, payment.currency.toUpperCase())}
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                payment.payment_status === 'succeeded' 
                                  ? 'bg-green-100 text-green-800' 
                                  : payment.payment_status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {payment.payment_status}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <CreditCard className="w-4 h-4 mr-2 text-gray-500" />
                                <span className="capitalize">{payment.payment_method || 'Card'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-2 text-gray-500" />
                                <span>{format(new Date(payment.created_at), 'PPp')}</span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {payment.description || 'Payment transaction'}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No payment transactions found matching your criteria
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    {payments.length > 0 ? `Showing ${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, payments.length + ((currentPage - 1) * itemsPerPage))}` : "No transactions found"}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || isLoading}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={(payments.length < itemsPerPage) || isLoading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminPayments;
