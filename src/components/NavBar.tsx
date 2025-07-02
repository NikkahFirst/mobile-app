
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import NotificationBell from "@/components/notifications/NotificationBell";

const NavBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const [isAffiliate, setIsAffiliate] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    const checkIfAffiliate = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('gender')
            .eq('id', user.id)
            .single();
          
          if (!error && data) {
            setIsAffiliate(data.gender === 'affiliate');
          }
        } catch (err) {
          console.error("Error checking if user is affiliate:", err);
        }
      }
    };

    checkIfAffiliate();
  }, [user]);

  const handleDashboardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isAffiliate) {
      e.preventDefault();
      navigate('/affiliate/dashboard');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex-none">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <img 
              src="/lovable-uploads/e492f048-5b1b-401a-99be-ca849afa5116.png" 
              alt="NikkahFirst Logo" 
              className="h-14" 
            />
          </Link>
        </div>

        {/* Desktop navigation - centered */}
        <nav className={`${isMobile ? 'hidden' : 'absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center'}`}>
          <div className="flex gap-8">
            <Link to="/" className="text-sm font-medium transition-colors hover:text-nikkah-pink">
              Home
            </Link>
            <Link to="/success-story" className="text-sm font-medium transition-colors hover:text-nikkah-pink">
              Success Stories
            </Link>
          </div>
        </nav>

        <div className={`${isMobile ? 'hidden' : 'flex'} items-center gap-4 justify-end`}>
          {user ? (
            <>
              <NotificationBell />
              <Link 
                to={isAffiliate ? "/affiliate/dashboard" : "/dashboard"}
              >
                <Button variant="outline">{isAffiliate ? "Affiliate Dashboard" : "Dashboard"}</Button>
              </Link>
              <Button 
                onClick={() => signOut()} 
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="outline">Log in</Button>
              </Link>
              <Link to="/signup">
                <Button className="bg-nikkah-pink hover:bg-nikkah-pink/90">Sign up</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <div className={`${isMobile ? 'flex' : 'hidden'} items-center gap-2`}>
          {user && <NotificationBell />}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile navigation */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="flex flex-col space-y-3 p-4">
            <div className="flex flex-col items-center space-y-3 mb-2">
              <Link 
                to="/" 
                className="text-sm font-medium transition-colors hover:text-nikkah-pink"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/success-story" 
                className="text-sm font-medium transition-colors hover:text-nikkah-pink"
                onClick={() => setIsMenuOpen(false)}
              >
                Success Stories
              </Link>
            </div>
            <div className="flex flex-col space-y-2 pt-2">
              {user ? (
                <>
                  <Link 
                    to={isAffiliate ? "/affiliate/dashboard" : "/dashboard"}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Button variant="outline" className="w-full">
                      {isAffiliate ? "Affiliate Dashboard" : "Dashboard"}
                    </Button>
                  </Link>
                  <Button 
                    onClick={() => {
                      signOut();
                      setIsMenuOpen(false);
                    }}
                    variant="outline"
                    className="w-full border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="w-full">Log in</Button>
                  </Link>
                  <Link to="/signup" onClick={() => setIsMenuOpen(false)}>
                    <Button className="w-full bg-nikkah-pink hover:bg-nikkah-pink/90">Sign up</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default NavBar;
