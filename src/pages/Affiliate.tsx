import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import NavBar from "@/components/NavBar";
import { FormError } from "@/components/ui/form-error";
import { ArrowRight, DollarSign, HandshakeIcon, Link, Users, CheckCheck, HelpCircle } from "lucide-react";
import { SignedPhoto } from "@/types/photo";

const Affiliate = () => {
  const {
    user,
    signUp,
    signIn
  } = useAuth();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState("signup");

  // Form states
  const [signupData, setSignupData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // If user is already logged in, redirect to affiliate dashboard
  useEffect(() => {
    if (user) {
      navigate('/affiliate/dashboard');
    }
  }, [user, navigate]);
  const handleSignupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {
      name,
      value
    } = e.target;
    setSignupData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = {
          ...prev
        };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {
      name,
      value
    } = e.target;
    setLoginData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = {
          ...prev
        };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  const validateSignupForm = () => {
    const newErrors: Record<string, string> = {};
    if (!signupData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }
    if (!signupData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }
    if (!signupData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(signupData.email)) {
      newErrors.email = "Invalid email address";
    }
    if (!signupData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (signupData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (signupData.password !== signupData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const validateLoginForm = () => {
    const newErrors: Record<string, string> = {};
    if (!loginData.email.trim()) {
      newErrors.email = "Email is required";
    }
    if (!loginData.password.trim()) {
      newErrors.password = "Password is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignupForm()) {
      return;
    }
    setIsLoading(true);
    try {
      // Add a current date for date_of_birth to prevent Google fix redirects
      const { error } = await signUp(signupData.email, signupData.password, {
        data: {
          firstName: signupData.firstName,
          lastName: signupData.lastName,
          gender: 'affiliate', 
          date_of_birth: new Date().toISOString().split('T')[0] // Add current date to satisfy the requirement
        }
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Account created!",
        description: "You're now registered as an affiliate. Please log in."
      });

      // Switch to login tab after successful signup
      setCurrentTab("login");
      setLoginData({
        email: signupData.email,
        password: ""
      });
    } catch (error: any) {
      console.error("Error during signup:", error);
      toast({
        title: "Signup Failed",
        description: error.message || "There was an error creating your account.",
        variant: "destructive"
      });
      setErrors({
        general: error.message || "Signup failed. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLoginForm()) {
      return;
    }
    setIsLoading(true);
    try {
      const {
        error
      } = await signIn(loginData.email, loginData.password);
      if (error) {
        throw error;
      }
      toast({
        title: "Logged in successfully",
        description: "Welcome to the NikkahFirst affiliate program!"
      });

      // Redirect to dedicated affiliate dashboard
      navigate('/affiliate/dashboard');
    } catch (error: any) {
      console.error("Error during login:", error);
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive"
      });
      setErrors({
        general: error.message || "Login failed. Please check your credentials."
      });
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="flex min-h-screen flex-col">
      <NavBar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-indigo-950 to-indigo-900 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">🤑 Earn Money By Helping Others Get Married</h1>
          <p className="text-xl opacity-90 max-w-3xl mx-auto mb-8">Join the NikkahFirst affiliate program and earn commission for every successful subscription created!</p>
          <Button onClick={() => {
          document.getElementById('auth-section')?.scrollIntoView({
            behavior: 'smooth'
          });
        }} size="lg" className="bg-nikkah-pink hover:bg-nikkah-pink/90">
            Become an Affiliate <ArrowRight className="ml-2" />
          </Button>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section className="py-20 bg-white" id="how-it-works">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How The Affiliate Program Works</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              NikkahFirst's affiliate program makes it easy to earn money while helping Muslims find their perfect match.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Link className="text-indigo-700" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Share Your Link</h3>
              <p className="text-gray-600">
                Get your unique referral link from your dashboard and share it with your community.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="text-indigo-700" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Users Sign Up</h3>
              <p className="text-gray-600">
                When someone uses your link to sign up for NikkahFirst, they're connected to your affiliate account.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="text-indigo-700" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Earn Commission</h3>
              <p className="text-gray-600">
                Earn £5 every time a male user you referred signs up and subscribes to NikkahFirst.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Benefits of Being an Affiliate</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Why join the NikkahFirst affiliate program? Here are just a few reasons:
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <Card className="border-none shadow-md">
              <CardContent className="pt-6">
                <div className="bg-pink-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  <DollarSign className="text-pink-700" size={20} />
                </div>
                <h3 className="text-lg font-semibold mb-2">Passive Income</h3>
                <p className="text-gray-600 text-sm">
                  Earn money with minimal effort. Just share your link and watch the commissions roll in.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-md">
              <CardContent className="pt-6">
                <div className="bg-pink-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  <HandshakeIcon className="text-pink-700" size={20} />
                </div>
                <h3 className="text-lg font-semibold mb-2">Help Your Community</h3>
                <p className="text-gray-600 text-sm">
                  Connect Muslims with potential spouses while earning rewards for your efforts.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-md">
              <CardContent className="pt-6">
                <div className="bg-pink-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  <CheckCheck className="text-pink-700" size={20} />
                </div>
                <h3 className="text-lg font-semibold mb-2">Welcome Editors</h3>
                <p className="text-gray-600 text-sm">If you're a content editor or clipper, this is your chance to earn from the videos you cut. </p>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-md">
              <CardContent className="pt-6">
                <div className="bg-pink-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  <HelpCircle className="text-pink-700" size={20} />
                </div>
                <h3 className="text-lg font-semibold mb-2">Full Support</h3>
                <p className="text-gray-600 text-sm">
                  Get help whenever you need it. Our team is always available to assist you.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Got questions about the NikkahFirst affiliate program? Here are some answers:
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto divide-y">
            <div className="py-5">
              <h3 className="text-lg font-medium text-gray-900 mb-2">How do I get paid as an affiliate?</h3>
              <p className="text-gray-600">
                You'll be paid via your chosen method (PayPal or bank transfer) on the 1st and 15th of each month for all qualifying referrals.
              </p>
            </div>
            
            <div className="py-5">
              <h3 className="text-lg font-medium text-gray-900 mb-2">When do I receive commission?</h3>
              <p className="text-gray-600">
                You earn commission when a male user you've referred subscribes to NikkahFirst. Commission is calculated and added to your balance immediately.
              </p>
            </div>
            
            <div className="py-5">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Is there a minimum payout threshold?</h3>
              <p className="text-gray-600">No, there's NO minimum threshold for payouts. We pay out every 2 weeks.</p>
            </div>
            
            <div className="py-5">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Can I track my referrals?</h3>
              <p className="text-gray-600">
                Yes! Your affiliate dashboard provides detailed reports on your referrals, conversions, and earnings in real-time.
              </p>
            </div>
            
            <div className="py-5">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Who can become an affiliate?</h3>
              <p className="text-gray-600">
                Anyone can join our affiliate program! Whether you're an individual with a social media following or an Islamic organization, you're welcome to join.
              </p>
            </div>
          </div>
        </div>
      </section>

      
      
      {/* Call to Action + Auth Section */}
      <section className="py-16 bg-white" id="auth-section">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Earning?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Create your affiliate account now and start earning money by helping others find love!
            </p>
          </div>
          
          <div className="max-w-md mx-auto">
            <Tabs value={currentTab} onValueChange={setCurrentTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                <TabsTrigger value="login">Log In</TabsTrigger>
              </TabsList>
              
              {/* Sign Up Form */}
              <TabsContent value="signup">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-center">Create Your Affiliate Account</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSignup} className="space-y-4">
                      {errors.general && <FormError message={errors.general} />}
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input id="firstName" name="firstName" value={signupData.firstName} onChange={handleSignupChange} error={!!errors.firstName} />
                          {errors.firstName && <FormError message={errors.firstName} />}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input id="lastName" name="lastName" value={signupData.lastName} onChange={handleSignupChange} error={!!errors.lastName} />
                          {errors.lastName && <FormError message={errors.lastName} />}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signupEmail">Email</Label>
                        <Input id="signupEmail" name="email" type="email" value={signupData.email} onChange={handleSignupChange} error={!!errors.email} />
                        {errors.email && <FormError message={errors.email} />}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signupPassword">Password</Label>
                        <Input id="signupPassword" name="password" type="password" value={signupData.password} onChange={handleSignupChange} error={!!errors.password} />
                        {errors.password && <FormError message={errors.password} />}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input id="confirmPassword" name="confirmPassword" type="password" value={signupData.confirmPassword} onChange={handleSignupChange} error={!!errors.confirmPassword} />
                        {errors.confirmPassword && <FormError message={errors.confirmPassword} />}
                      </div>
                      
                      <Button type="submit" className="w-full bg-nikkah-blue hover:bg-nikkah-blue/90" disabled={isLoading}>
                        {isLoading ? "Creating Account..." : "Create Affiliate Account"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Log In Form */}
              <TabsContent value="login">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-center">Log In to Your Affiliate Account</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                      {errors.general && <FormError message={errors.general} />}
                      
                      <div className="space-y-2">
                        <Label htmlFor="loginEmail">Email</Label>
                        <Input id="loginEmail" name="email" type="email" value={loginData.email} onChange={handleLoginChange} error={!!errors.email} />
                        {errors.email && <FormError message={errors.email} />}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="loginPassword">Password</Label>
                        <Input id="loginPassword" name="password" type="password" value={loginData.password} onChange={handleLoginChange} error={!!errors.password} />
                        {errors.password && <FormError message={errors.password} />}
                      </div>
                      
                      <Button type="submit" className="w-full bg-nikkah-pink hover:bg-nikkah-pink/90" disabled={isLoading}>
                        {isLoading ? "Logging In..." : "Log In"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>
    </div>;
};
export default Affiliate;
