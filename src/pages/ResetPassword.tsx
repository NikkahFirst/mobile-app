
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import NavBar from "@/components/NavBar";
import { FormError } from "@/components/ui/form-error";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMobileNotification } from "@/hooks/use-mobile-notification";
import { supabase } from "@/lib/supabaseClient";

const ResetPassword = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { showNotification } = useMobileNotification();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Check if we're on a valid reset password flow
  useEffect(() => {
    const checkResetToken = async () => {
      try {
        // This checks if there's a valid reset password session
        const { data, error } = await supabase.auth.getSession();
        
        if (error || !data.session) {
          // Not a valid reset session, redirect to login
          navigate("/login", { replace: true });
        }
      } catch (err) {
        console.error("Error checking auth session:", err);
        navigate("/login", { replace: true });
      }
    };
    
    checkResetToken();
  }, [navigate]);
  
  const validatePassword = () => {
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error state
    setError("");
    
    if (!validatePassword()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        throw error;
      }
      
      setIsSuccess(true);
      
      const successMessage = "Password updated successfully";
      
      if (isMobile) {
        showNotification(successMessage, "success");
      } else {
        toast({
          title: "Success",
          description: successMessage,
        });
      }
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (error: any) {
      const errorMessage = error.message || "Failed to update password";
      
      setError(errorMessage);
      
      if (isMobile) {
        showNotification(errorMessage, "error");
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      
      <main className="flex-1 flex items-center justify-center py-12 px-4 hero-pattern">
        <Card className="w-full max-w-md shadow-lg border-none">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Heart className="h-10 w-10 fill-nikkah-pink text-nikkah-pink" />
            </div>
            <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
            <CardDescription>
              {isSuccess 
                ? "Your password has been updated successfully" 
                : "Enter your new password below"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {isSuccess ? (
              <div className="text-center space-y-4">
                <p className="text-green-600 dark:text-green-400">
                  You will be redirected to the login page in a few seconds.
                </p>
                <Button 
                  onClick={() => navigate("/login")} 
                  className="bg-nikkah-pink hover:bg-nikkah-pink/90"
                >
                  Go to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-destructive/10 p-3 rounded-md">
                    <FormError message={error} />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={error ? "border-red-500" : ""}
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters long
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={error ? "border-red-500" : ""}
                  />
                </div>
                
                <Button type="submit" className="w-full bg-nikkah-pink hover:bg-nikkah-pink/90" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Reset Password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ResetPassword;
