
import { Home, Search, Heart, User, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Dispatch, SetStateAction } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileNavProps {
  activeTab: string;
  setActiveTab: Dispatch<SetStateAction<string>>;
}

export function MobileNav({ activeTab, setActiveTab }: MobileNavProps) {
  const location = useLocation();
  const isMobile = useIsMobile();

  const isActive = (path: string) => {
    if (path === '/dashboard' && location.pathname === '/dashboard' && !location.search) return true;
    if (path === '/dashboard?tab=search' && location.search.includes('tab=search')) return true;
    if (path === '/dashboard?tab=matches' && location.search.includes('tab=matches')) return true;
    if (path === '/dashboard?tab=profile' && location.search.includes('tab=profile')) return true;
    if (path === '/dashboard?tab=settings' && location.search.includes('tab=settings')) return true;
    return false;
  };

  const handleNavClick = (tab: string, path: string) => {
    setActiveTab(tab);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
      <div className="flex justify-between p-2">
        <Link
          to="/dashboard"
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 transform",
            isActive('/dashboard') 
              ? "text-nikkah-pink bg-nikkah-pink/10 scale-110" 
              : "text-muted-foreground hover:text-nikkah-pink hover:bg-muted/30"
          )}
          onClick={() => handleNavClick("dashboard", "/dashboard")}
        >
          <div className={cn(
            "relative p-2 rounded-full transition-all duration-300",
            isActive('/dashboard') ? "bg-nikkah-pink/20" : ""
          )}>
            <Home className="h-5 w-5" />
          </div>
          <span className="text-xs mt-1 font-medium">Home</span>
        </Link>
        
        <Link
          to="/dashboard?tab=search"
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 transform",
            isActive('/dashboard?tab=search') 
              ? "text-nikkah-pink bg-nikkah-pink/10 scale-110" 
              : "text-muted-foreground hover:text-nikkah-pink hover:bg-muted/30"
          )}
          onClick={() => handleNavClick("search", "/dashboard?tab=search")}
        >
          <div className={cn(
            "relative p-2 rounded-full transition-all duration-300",
            isActive('/dashboard?tab=search') ? "bg-nikkah-pink/20" : ""
          )}>
            <Search className="h-5 w-5" />
          </div>
          <span className="text-xs mt-1 font-medium">Search</span>
        </Link>
        
        <Link
          to="/dashboard?tab=matches"
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 transform",
            isActive('/dashboard?tab=matches') 
              ? "text-nikkah-pink bg-nikkah-pink/10 scale-110" 
              : "text-muted-foreground hover:text-nikkah-pink hover:bg-muted/30"
          )}
          onClick={() => handleNavClick("matches", "/dashboard?tab=matches")}
        >
          <div className={cn(
            "relative p-2 rounded-full transition-all duration-300",
            isActive('/dashboard?tab=matches') ? "bg-nikkah-pink/20" : ""
          )}>
            <Heart className="h-5 w-5" />
          </div>
          <span className="text-xs mt-1 font-medium">Matches</span>
        </Link>
        
        <Link
          to="/dashboard?tab=profile"
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 transform",
            isActive('/dashboard?tab=profile') 
              ? "text-nikkah-pink bg-nikkah-pink/10 scale-110" 
              : "text-muted-foreground hover:text-nikkah-pink hover:bg-muted/30"
          )}
          onClick={() => handleNavClick("profile", "/dashboard?tab=profile")}
        >
          <div className={cn(
            "relative p-2 rounded-full transition-all duration-300",
            isActive('/dashboard?tab=profile') ? "bg-nikkah-pink/20" : ""
          )}>
            <User className="h-5 w-5" />
          </div>
          <span className="text-xs mt-1 font-medium">Profile</span>
        </Link>
        
        <Link
          to="/dashboard?tab=settings"
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 transform",
            isActive('/dashboard?tab=settings') 
              ? "text-nikkah-pink bg-nikkah-pink/10 scale-110" 
              : "text-muted-foreground hover:text-nikkah-pink hover:bg-muted/30"
          )}
          onClick={() => handleNavClick("settings", "/dashboard?tab=settings")}
        >
          <div className={cn(
            "relative p-2 rounded-full transition-all duration-300",
            isActive('/dashboard?tab=settings') ? "bg-nikkah-pink/20" : ""
          )}>
            <Settings className="h-5 w-5" />
          </div>
          <span className="text-xs mt-1 font-medium">Settings</span>
        </Link>
      </div>
    </nav>
  );
}
