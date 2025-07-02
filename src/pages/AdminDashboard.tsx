
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
  Users, 
  Activity, 
  Heart, 
  DollarSign, 
  Clock, 
  User, 
  RefreshCw 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";

// Define the types for our metrics
interface DashboardMetrics {
  totalUsers: number;
  maleUsers: number;
  femaleUsers: number;
  usersOnline: number;
  activeMatches: number;
  totalRevenue: number;
}

interface RecentUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  gender: string;
  created_at: string;
}

interface RecentPayment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
  description: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalUsers: 0,
    maleUsers: 0,
    femaleUsers: 0,
    usersOnline: 0,
    activeMatches: 0,
    totalRevenue: 0
  });
  
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
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
        
        // If password reset is required, show a message
        if (data.needsPasswordReset) {
          toast({
            title: "Password reset required",
            description: "Please reset your password through the link that was sent to your email",
            duration: 10000,
          });
        }
        
        // Fetch dashboard metrics
        fetchDashboardData(session.access_token);
      } catch (error) {
        console.error("Error checking admin status:", error);
        navigate('/admin');
      }
    };
    
    checkAdminStatus();
  }, [navigate, toast]);
  
  const fetchDashboardData = async (accessToken: string) => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('admin-dashboard-metrics', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      if (error) {
        throw error;
      }
      
      setMetrics(data.metrics);
      setRecentUsers(data.recentUsers || []);
      setRecentPayments(data.recentPayments || []);
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Failed to load dashboard data",
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
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      fetchDashboardData(session.access_token);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 overflow-auto">
          <header className="bg-white dark:bg-gray-800 shadow-sm p-4 md:p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Welcome to the NikkahFirst Admin Dashboard</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2 text-nikkah-blue" />
                    {isLoading ? (
                      <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                    ) : (
                      <div className="text-2xl font-bold">{metrics.totalUsers}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Male Users 👨</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2 text-blue-500" />
                    {isLoading ? (
                      <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                    ) : (
                      <div className="text-2xl font-bold">{metrics.maleUsers}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Female Users 👩</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2 text-pink-500" />
                    {isLoading ? (
                      <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                    ) : (
                      <div className="text-2xl font-bold">{metrics.femaleUsers}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Users Online</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Activity className="w-4 h-4 mr-2 text-green-500" />
                    {isLoading ? (
                      <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                    ) : (
                      <div className="text-2xl font-bold">{metrics.usersOnline}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active Matches</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Heart className="w-4 h-4 mr-2 text-nikkah-pink" />
                    {isLoading ? (
                      <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                    ) : (
                      <div className="text-2xl font-bold">{metrics.activeMatches}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-2 text-emerald-500" />
                    {isLoading ? (
                      <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                    ) : (
                      <div className="text-2xl font-bold">£{metrics.totalRevenue.toFixed(2)}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Users</CardTitle>
                  <CardDescription>New users who have joined recently</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Gender</TableHead>
                            <TableHead>Joined</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentUsers.length > 0 ? (
                            recentUsers.map((user) => (
                              <TableRow key={user.id}>
                                <TableCell>
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-2">
                                      <User className="w-4 h-4 text-gray-500" />
                                    </div>
                                    <span>{user.first_name} {user.last_name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="max-w-[150px] truncate">{user.email}</TableCell>
                                <TableCell className="capitalize">
                                  {user.gender === 'male' ? '👨 Male' : '👩 Female'}
                                </TableCell>
                                <TableCell>{format(new Date(user.created_at), 'PP')}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                                No users found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Recent Payments</CardTitle>
                  <CardDescription>Latest transactions on the platform</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentPayments.length > 0 ? (
                            recentPayments.map((payment) => (
                              <TableRow key={payment.id}>
                                <TableCell className="font-medium">
                                  {(payment.currency || 'GBP').toUpperCase()} {(payment.amount / 100).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <span 
                                    className={`px-2 py-1 rounded-full text-xs ${
                                      payment.payment_status === 'succeeded' 
                                        ? 'bg-green-100 text-green-800' 
                                        : payment.payment_status === 'pending'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {payment.payment_status}
                                  </span>
                                </TableCell>
                                <TableCell className="max-w-[150px] truncate">{payment.description || 'Payment'}</TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <Clock className="w-4 h-4 mr-2 text-gray-500" />
                                    <span>{format(new Date(payment.created_at), 'PP')}</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                                No payments found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
