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
  User, 
  Calendar, 
  Activity, 
  RefreshCw,
  Filter,
  ArrowUpDown,
  Mail,
  UserPlus,
  Search,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, subDays } from "date-fns";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";

// Define interface for user metrics
interface UserMetrics {
  totalUsers: number;
  maleUsers: number;
  femaleUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  verifiedProfiles: number;
  completedProfiles: number;
}

// Interface for user data
interface UserData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  gender: string;
  created_at: string;
  onboarding_completed: boolean;
  last_online: string | null;
  subscription_status: string;
}

const AdminUsers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [metrics, setMetrics] = useState<UserMetrics>({
    totalUsers: 0,
    maleUsers: 0,
    femaleUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
    verifiedProfiles: 0,
    completedProfiles: 0
  });
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGender, setFilterGender] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
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
        
        fetchUserData(session.access_token);
      } catch (error) {
        console.error("Error checking admin status:", error);
        navigate('/admin');
      }
    };
    
    checkAdminStatus();
  }, [navigate, toast]);
  
  const fetchUserData = async (accessToken: string) => {
    setIsLoading(true);
    
    try {
      // Create custom edge function to get user metrics and data
      const { data, error } = await supabase.functions.invoke('admin-users-metrics', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: {
          page: currentPage,
          limit: itemsPerPage,
          search: searchQuery,
          filterGender,
          filterStatus,
          sortField,
          sortDirection
        }
      });
      
      if (error) {
        throw error;
      }
      
      setMetrics(data.metrics);
      setUsers(data.users);
    } catch (error: any) {
      console.error("Error fetching user data:", error);
      toast({
        title: "Failed to load user data",
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
      fetchUserData(session.access_token);
    }
  };
  
  const handleSearch = async () => {
    const sessionResponse = await supabase.auth.getSession();
    const session = sessionResponse.data.session;
    if (session) {
      fetchUserData(session.access_token);
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
    handleSearch();
  };
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    handleSearch();
  };

  // Calculate time elapsed since last online
  const getTimeElapsed = (lastOnline: string | null) => {
    if (!lastOnline) return "Never";
    
    const lastOnlineDate = new Date(lastOnline);
    const now = new Date();
    const diffInMs = now.getTime() - lastOnlineDate.getTime();
    
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInMins < 60) return `${diffInMins} min${diffInMins !== 1 ? "s" : ""} ago`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
    return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 overflow-auto">
          <header className="bg-white dark:bg-gray-800 shadow-sm p-4 md:p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">User Management</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage and monitor all users on NikkahFirst</p>
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
            {/* User Metrics Cards */}
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
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active Users (24h)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Activity className="w-4 h-4 mr-2 text-green-500" />
                    {isLoading ? (
                      <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                    ) : (
                      <div className="text-2xl font-bold">{metrics.activeUsers}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">New Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <UserPlus className="w-4 h-4 mr-2 text-teal-500" />
                    {isLoading ? (
                      <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                    ) : (
                      <div className="text-2xl font-bold">{metrics.newUsersToday}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">New This Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
                    {isLoading ? (
                      <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                    ) : (
                      <div className="text-2xl font-bold">{metrics.newUsersThisWeek}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">New This Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-violet-500" />
                    {isLoading ? (
                      <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                    ) : (
                      <div className="text-2xl font-bold">{metrics.newUsersThisMonth}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Completed Profiles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2 text-amber-500" />
                    {isLoading ? (
                      <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                    ) : (
                      <div className="text-2xl font-bold">{metrics.completedProfiles}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Users Table with Filtering and Sorting */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>Manage and view all registered users</CardDescription>
                
                <div className="flex flex-col md:flex-row gap-4 mt-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search by name or email..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-row gap-4">
                    <Select value={filterGender} onValueChange={setFilterGender}>
                      <SelectTrigger className="w-[150px]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Genders</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-[180px]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Subscribed</SelectItem>
                        <SelectItem value="inactive">Not Subscribed</SelectItem>
                        <SelectItem value="completed">Profile Completed</SelectItem>
                        <SelectItem value="incomplete">Profile Incomplete</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button variant="outline" onClick={handleSearch}>
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
                        <TableHead onClick={() => handleSort("name")} className="cursor-pointer">
                          <div className="flex items-center">
                            Name
                            {sortField === "name" && (
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead onClick={() => handleSort("email")} className="cursor-pointer">
                          <div className="flex items-center">
                            Email
                            {sortField === "email" && (
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead onClick={() => handleSort("created_at")} className="cursor-pointer">
                          <div className="flex items-center">
                            Joined
                            {sortField === "created_at" && (
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead onClick={() => handleSort("last_online")} className="cursor-pointer">
                          <div className="flex items-center">
                            Last Active
                            {sortField === "last_online" && (
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead>Status</TableHead>
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
                      ) : users.length > 0 ? (
                        users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-2">
                                  <User className="w-4 h-4 text-gray-500" />
                                </div>
                                <span>{user.first_name} {user.last_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Mail className="w-4 h-4 mr-2 text-gray-500" />
                                <span className="max-w-[200px] truncate">{user.email}</span>
                              </div>
                            </TableCell>
                            <TableCell className="capitalize">
                              {user.gender === 'male' ? '👨 Male' : '👩 Female'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                                <span>{format(new Date(user.created_at), 'PP')}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-2 text-gray-500" />
                                <span>{getTimeElapsed(user.last_online)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                {user.onboarding_completed ? (
                                  <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                    Completed
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800">
                                    Incomplete
                                  </span>
                                )}
                                
                                {user.subscription_status === 'active' ? (
                                  <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                    Subscribed
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                                    Free
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No users found matching your criteria
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    {users.length > 0 ? `Showing ${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, metrics.totalUsers)} of ${metrics.totalUsers} users` : "No users found"}
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
                      disabled={currentPage * itemsPerPage >= metrics.totalUsers || isLoading}
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

export default AdminUsers;
