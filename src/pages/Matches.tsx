
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserMatches } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Matches from "@/components/Matches";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Heart, LogOut, Settings, User, Bell, Search, ArchiveX } from "lucide-react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MatchesPage = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  
  useEffect(() => {
    // Initial page load
    document.title = "Your Matches | NikkahFirst";
  }, []);

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
              <Heart className="h-6 w-6 fill-nikkah-pink text-nikkah-pink" />
              <span className="text-xl font-bold tracking-tight">
                <span className="text-nikkah-pink">Nikkah</span>
                <span className="text-nikkah-blue">First</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
            </Link>
            <div className="border-l h-6 mx-2"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-nikkah-blue text-white flex items-center justify-center uppercase font-bold">
                {user?.user_metadata?.firstName?.charAt(0) || "U"}
              </div>
              <span className="hidden md:inline-block font-medium">
                {user?.user_metadata?.firstName || "User"}
              </span>
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex-1 container py-8 px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
          <div className="hidden md:block">
            <div className="space-y-1">
              <Button 
                variant="ghost"
                className="w-full justify-start"
                asChild
              >
                <Link to="/dashboard">
                  <Heart className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <Button 
                variant="ghost"
                className="w-full justify-start"
                asChild
              >
                <Link to="/search">
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Link>
              </Button>
              <Button 
                variant="default"
                className="w-full justify-start bg-nikkah-pink hover:bg-nikkah-pink/90"
              >
                <Heart className="mr-2 h-4 w-4" />
                Matches
              </Button>
              <Button 
                variant="ghost"
                className="w-full justify-start"
                asChild
              >
                <Link to="/dashboard">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </Button>
              <Button 
                variant="ghost"
                className="w-full justify-start"
                asChild
              >
                <Link to="/dashboard">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </Button>
            </div>
            <div className="mt-8">
              <Button variant="outline" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </Button>
            </div>
          </div>
          
          <div className="flex overflow-x-auto md:hidden mb-6 pb-4 border-b">
            <Button variant="outline" className="mr-2" asChild>
              <Link to="/dashboard">
                <Heart className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Button variant="outline" className="mr-2" asChild>
              <Link to="/search">
                <Search className="mr-2 h-4 w-4" />
                Search
              </Link>
            </Button>
            <Button variant="default" className="mr-2 bg-nikkah-pink hover:bg-nikkah-pink/90">
              <Heart className="mr-2 h-4 w-4" />
              Matches
            </Button>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold mb-6">Your Matches</h2>
            
            <Tabs defaultValue="active" className="w-full" onValueChange={setActiveTab} value={activeTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="active">
                  <Heart className="h-4 w-4 mr-2" />
                  Active Matches
                </TabsTrigger>
                <TabsTrigger value="previous">
                  <ArchiveX className="h-4 w-4 mr-2" />
                  Previous Matches
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="active">
                <Matches />
              </TabsContent>
              
              <TabsContent value="previous">
                <Matches showInactive={true} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default MatchesPage;
