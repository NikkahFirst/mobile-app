
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Lock, Shield, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FormError } from "@/components/ui/form-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const AdminLogin = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});

  // Check if already authenticated as admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Call the admin verify function to check if the user is an admin
          const { data, error } = await supabase.functions.invoke('verify-admin', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          });
          
          if (!error && data && data.isAdmin) {
            navigate('/admin/dashboard');
          }
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
      }
    };
    
    checkAdminStatus();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user types
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof typeof errors];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }
    
    if (!formData.password) {
      newErrors.password = "Password is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      
      if (error) {
        throw error;
      }
      
      // Get the session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("No session after login");
      }
      
      // Call the admin verify function to check if the user is an admin
      const { data, error: verifyError } = await supabase.functions.invoke('verify-admin', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (verifyError) {
        throw verifyError;
      }
      
      if (!data || !data.isAdmin) {
        // If not an admin, sign out and show error
        await supabase.auth.signOut();
        throw new Error("You do not have admin privileges");
      }
      
      toast({
        title: "Login successful",
        description: "Welcome to the NikkahFirst admin panel",
      });
      
      // Navigate to dashboard
      navigate('/admin/dashboard');
    } catch (error: any) {
      setErrors({
        general: error.message || "Failed to log in. Please check your credentials.",
      });
      
      toast({
        title: "Login failed",
        description: error.message || "Failed to log in. Please check your credentials.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    setPasswordCopied(true);
    
    toast({
      title: "Password copied",
      description: "Password copied to clipboard",
    });
    
    setTimeout(() => {
      setPasswordCopied(false);
    }, 3000);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 dark:bg-gray-900">
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Shield className="h-10 w-10 text-nikkah-blue" />
            </div>
            <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
            <CardDescription>
              Access the NikkahFirst admin panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.general && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>
                    <FormError message={errors.general} />
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  error={!!errors.email}
                  required
                />
                <FormError message={errors.email} />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  error={!!errors.password}
                  required
                />
                <FormError message={errors.password} />
              </div>
              
              <Button type="submit" className="w-full bg-nikkah-blue hover:bg-nikkah-blue/90" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Log in"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <p className="text-xs text-muted-foreground text-center mt-2">
              This portal is only for authorized administrators
            </p>
          </CardFooter>
        </Card>
      </main>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Admin Account Created</DialogTitle>
            <DialogDescription>
              Save this password in a secure location. You'll need it to log in to the admin account.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <p className="text-sm text-green-800 dark:text-green-300 mb-2">
              Admin user created successfully! Here is the generated password:
            </p>
            <div className="relative">
              <Input
                readOnly
                value={generatedPassword}
                className="pr-24 font-mono text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                className="absolute right-1 top-1 h-7"
                onClick={copyPassword}
              >
                {passwordCopied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {passwordCopied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setShowPasswordDialog(false)}
              className="w-full sm:w-auto"
            >
              I've saved the password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLogin;
