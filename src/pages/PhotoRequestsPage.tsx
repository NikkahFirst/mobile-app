
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BookmarkIcon, Heart, User, Settings, Search, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const PhotoRequestsPage = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

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
                onClick={() => navigate("/dashboard")}
              >
                <Heart className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start" 
                onClick={() => navigate("/dashboard?tab=search")}
              >
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start"
                onClick={() => navigate("/dashboard?tab=matches")}
              >
                <Heart className="mr-2 h-4 w-4" />
                Matches
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start" 
                onClick={() => navigate("/dashboard?tab=saved")}
              >
                <BookmarkIcon className="mr-2 h-4 w-4" />
                Saved Profiles
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start" 
                onClick={() => navigate("/dashboard?tab=profile")}
              >
                <User className="mr-2 h-4 w-4" />
                Profile
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start" 
                onClick={() => navigate("/dashboard?tab=settings")}
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </div>
            <div className="mt-8">
              <Button variant="outline" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </Button>
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold mb-6">Photo Feature Removed</h1>
            <p className="text-gray-600">
              The photo request feature has been removed from the application. Please use the navigation to visit other sections.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoRequestsPage;
