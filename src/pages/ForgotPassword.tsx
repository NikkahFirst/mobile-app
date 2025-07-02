
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import NavBar from "@/components/NavBar";
import { useAuth } from "@/context/AuthContext";
import { FormError } from "@/components/ui/form-error";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMobileNotification } from "@/hooks/use-mobile-notification";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ForgotPassword = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { resetPassword, isLoading } = useAuth();
  const isMobile = useIsMobile();
  const { showNotification } = useMobileNotification();
  
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");
  
  const validateEmail = (email: string) => {
    return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error state
    setError("");
    
    // Validate email
    if (!email) {
      setError("Email is required");
      return;
    }
    
    if (!validateEmail(email)) {
      setError("Invalid email address");
      return;
    }
    
    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        throw error;
      }
      
      setEmailSent(true);
      
      const successMessage = "Password reset instructions have been sent to your email";
      
      if (isMobile) {
        showNotification(successMessage, "success");
      } else {
        toast({
          title: "Email sent",
          description: successMessage,
        });
      }
    } catch (error: any) {
      const errorMessage = error.message || "Failed to send password reset email";
      
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
              Enter your email and we'll send you instructions to reset your password
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {emailSent ? (
              <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <AlertDescription className="text-center py-2">
                  Password reset instructions have been sent to your email. Please check your inbox.
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-destructive/10 p-3 rounded-md">
                    <FormError message={error} />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={error ? "border-red-500" : ""}
                  />
                </div>
                
                <Button type="submit" className="w-full bg-nikkah-pink hover:bg-nikkah-pink/90" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send Reset Instructions"}
                </Button>
              </form>
            )}
          </CardContent>
          
          <CardFooter className="justify-center">
            <p className="text-sm text-gray-600">
              Remember your password?{" "}
              <Link to="/login" className="text-nikkah-pink font-medium hover:underline">
                Back to Login
              </Link>
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
};

export default ForgotPassword;
