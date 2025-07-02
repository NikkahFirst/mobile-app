import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Search, CheckCircle, Shield, User, Users, MessageCircle, HelpCircle } from "lucide-react";
import NavBar from "@/components/NavBar";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const Index = () => {
  const {
    user,
    signOut
  } = useAuth();
  const isLoggedIn = !!user;
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleGoogleRedirect = async () => {
      const fromGoogle = sessionStorage.getItem("fromGoogleLogin");
      if (fromGoogle && user) {
        console.log("[GOOGLE REDIRECT] Detected return from Google login");
        sessionStorage.removeItem("fromGoogleLogin");
        navigate("/signup?step=2&fromGoogle=true");
      }
    };
    handleGoogleRedirect();
  }, [user, navigate]);

  useEffect(() => {
    const checkIfAffiliate = async () => {
      if (user) {
        try {
          const {
            data,
            error
          } = await supabase.from('profiles').select('gender').eq('id', user.id).single();
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

  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (user) {
        const {
          data,
          error
        } = await supabase.from('profiles').select('first_name, last_name, gender, date_of_birth').eq('id', user.id).single();
        if (!error && data) {
          const {
            first_name,
            last_name,
            gender,
            date_of_birth
          } = data;
          if (!first_name || !last_name || !gender || !date_of_birth) {
            setNeedsProfileCompletion(true);
          }
        }
      }
    };
    checkProfileCompletion();
  }, [user]);

  const handleDashboardClick = e => {
    if (isAffiliate) {
      e.preventDefault();
      navigate('/affiliate/dashboard');
    }
  };

  return <div className="flex min-h-screen flex-col">
      <NavBar />
      
      {/* Hero Section with New Background Image */}
      <section className="relative text-white">
        <div className="absolute inset-0 z-0">
          <img src="/lovable-uploads/868b9e16-c102-467c-a169-672c089f5f11.png" alt="Wedding rings background" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-indigo-950/60"></div>
        </div>
        
        <div className="container relative z-10 px-4 py-20 md:py-32 mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="md:w-1/2 animate-fade-in">
              <div className="inline-block bg-white/10 backdrop-blur-sm text-white rounded-full px-4 py-2 text-sm font-medium mb-6">
                For Those Serious About Marriage
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
                Making the <span className="text-nikkah-pink">Halal</span> Easy
              </h1>
              
              <p className="text-xl mb-8 text-white/90">NikkahFirst helps Muslims around the world find compatible spouses while honouring their faith.</p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                {user ? <>
                    <Link to={isAffiliate ? "/affiliate/dashboard" : needsProfileCompletion ? "/signup?step=2&fromGoogle=true" : "/dashboard"} onClick={handleDashboardClick}>
                      <Button size="lg" className="bg-nikkah-pink hover:bg-nikkah-pink/90 w-full sm:w-auto">
                        {needsProfileCompletion ? "Complete Account" : "Go to Dashboard"}
                      </Button>
                    </Link>

                    <Button size="lg" variant="outline" className="w-full sm:w-auto bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => signOut()}>
                      Log Out
                    </Button>
                  </> : <>
                    <Link to="/signup">
                      <Button size="lg" className="bg-nikkah-pink hover:bg-nikkah-pink/90 w-full sm:w-auto">
                        Find Your Match
                      </Button>
                    </Link>
                    <Link to="/login">
                      <Button size="lg" variant="outline" className="w-full sm:w-auto bg-white/10 border-white/20 text-white hover:bg-white/20">
                        Sign In
                      </Button>
                    </Link>
                  </>}
              </div>
              
              {!user && <p className="mt-4 text-white/70 font-medium">
                  Free For Sisters, Simple Plans For Brothers
                </p>}
            </div>
            
            <div className="md:w-1/2 flex justify-center">
              <img src="/lovable-uploads/53d901c8-2624-4d22-9ac6-6b02dc8ea757.png" alt="Muslim couple silhouette at sunset" className="w-full md:w-3/4 h-auto object-contain rounded-xl drop-shadow-lg" />
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 120" className="fill-white">
            <path d="M0,64L80,80C160,96,320,128,480,128C640,128,800,96,960,80C1120,64,1280,64,1440,64L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"></path>
          </svg>
        </div>
      </section>

      {/* Content for both logged-in and non-logged-in users */}
      {user ?
    // Content for logged-in users
    <section className="py-16 bg-white">
          <div className="container px-4 mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Welcome Back</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                {isAffiliate ? "Continue managing your NikkahFirst affiliate account." : "Continue your journey to finding a compatible spouse, in sha Allah."}
              </p>
            </div>
            
            {isAffiliate ?
        // Content for affiliate users
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Link to="/affiliate/dashboard">
                  <Card className="border-none shadow-lg hover:shadow-xl transition-all h-full">
                    <CardContent className="pt-10 text-center h-full flex flex-col">
                      <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-nikkah-blue/10 mb-6">
                        <Users className="h-6 w-6 text-nikkah-blue" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Affiliate Dashboard</h3>
                      <p className="text-gray-600 mb-6 flex-grow">
                        Manage your affiliate account and track your earnings.
                      </p>
                      <Button className="w-full bg-nikkah-blue hover:bg-nikkah-blue/90 mt-auto">
                        Go to Dashboard
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              </div> :
        // Content for regular users
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Link to="/dashboard?tab=search">
                  <Card className="border-none shadow-lg hover:shadow-xl transition-all h-full">
                    <CardContent className="pt-10 text-center h-full flex flex-col">
                      <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-nikkah-blue/10 mb-6">
                        <Search className="h-6 w-6 text-nikkah-blue" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Search Profiles</h3>
                      <p className="text-gray-600 mb-6 flex-grow">
                        Find potential matches based on your preferences and criteria.
                      </p>
                      <Button className="w-full bg-nikkah-blue hover:bg-nikkah-blue/90 mt-auto">
                        Search Now
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
                
                <Link to="/dashboard?tab=matches">
                  <Card className="border-none shadow-lg hover:shadow-xl transition-all h-full">
                    <CardContent className="pt-10 text-center h-full flex flex-col">
                      <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-nikkah-pink/10 mb-6">
                        <Heart className="h-6 w-6 text-nikkah-pink" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">View Matches</h3>
                      <p className="text-gray-600 mb-6 flex-grow">
                        Check your current matches and connection requests.
                      </p>
                      <Button className="w-full bg-nikkah-pink hover:bg-nikkah-pink/90 mt-auto">
                        View Matches
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
                
                <Link to="/dashboard?tab=profile">
                  <Card className="border-none shadow-lg hover:shadow-xl transition-all h-full">
                    <CardContent className="pt-10 text-center h-full flex flex-col">
                      <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-purple-100 mb-6">
                        <User className="h-6 w-6 text-purple-600" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Update Profile</h3>
                      <p className="text-gray-600 mb-6 flex-grow">
                        Complete or update your profile to increase your chances of finding a match.
                      </p>
                      <Button className="w-full bg-purple-600 hover:bg-purple-700 mt-auto">
                        Edit Profile
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              </div>}
          </div>
        </section> :
    // Content for non-logged in users
    <>
          {/* How It Works Section */}
          <section className="py-20 bg-white">
            <div className="container px-4 mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold mb-4">How NikkahFirst Works</h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">Our platform makes it easy to find your perfect match while staying true to your religion.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="border-none shadow-lg">
                  <CardContent className="pt-10 text-center">
                    <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-nikkah-pink/10 mb-6">
                      <User className="h-6 w-6 text-nikkah-pink" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Create Your Profile</h3>
                    <p className="text-gray-600">
                      Build a detailed profile showcasing your background, interests, and what you're looking for in a spouse.
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="border-none shadow-lg">
                  <CardContent className="pt-10 text-center">
                    <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-nikkah-blue/10 mb-6">
                      <Search className="h-6 w-6 text-nikkah-blue" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Discover Matches</h3>
                    <p className="text-gray-600">
                      Our algorithm suggests compatible matches based on your preferences and values.
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="border-none shadow-lg">
                  <CardContent className="pt-10 text-center">
                    <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-nikkah-pink/10 mb-6">
                      <MessageCircle className="h-6 w-6 text-nikkah-pink" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Connect Respectfully</h3>
                    <p className="text-gray-600">
                      Men can initiate contact with the woman's Wali (guardian) to begin the marriage process the halal way.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Pricing Section */}
          <section className="py-20 bg-gray-50">
            <div className="container px-4 mx-auto">
              <div className="text-center mb-16">
                <div className="inline-block bg-pink-50 text-nikkah-pink px-4 py-2 rounded-full text-sm font-medium mb-4">
                  100% Free for Sisters
                </div>
                <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Women join completely free. Men choose from flexible subscription options.
                </p>
              </div>
              
              <div className="flex flex-col md:flex-row gap-8 items-start justify-center">
                <Card className="w-full md:w-80 border-none shadow-lg text-center">
                  <div className="bg-nikkah-pink text-white py-6 px-4">
                    <h2 className="text-xl font-bold">For Sisters</h2>
                    <div className="mt-4 mb-2">
                      <span className="text-4xl font-bold">£0</span>
                    </div>
                    <p className="text-white/90">Forever Free</p>
                  </div>
                  <CardContent className="p-6">
                    <ul className="space-y-4 text-left mb-8">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-nikkah-pink flex-shrink-0 mt-0.5" />
                        <span>Create a detailed profile</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-nikkah-pink flex-shrink-0 mt-0.5" />
                        <span>Browse potential matches</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-nikkah-pink flex-shrink-0 mt-0.5" />
                        <span>Respond to interested brothers</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-nikkah-pink flex-shrink-0 mt-0.5" />
                        <span>Wali protection system</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-nikkah-pink flex-shrink-0 mt-0.5" />
                        <span>Access to all platform features</span>
                      </li>
                    </ul>
                    <Link to="/signup?gender=female">
                      <Button className="w-full bg-nikkah-pink hover:bg-nikkah-pink/90">
                        Sign Up Now
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
                
                <div className="w-full md:w-auto grid gap-6">
                  <div className="text-center md:text-left">
                    <h2 className="text-2xl font-bold">For Brothers</h2>
                    <p className="text-gray-600 mt-2">
                      Choose the plan that works best for your journey.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="pt-6 pb-6 text-center">
                        <h3 className="text-xl font-bold mb-2">Monthly Plan</h3>
                        <div className="mt-4 mb-6">
                          <span className="text-4xl font-bold">£9.99</span>
                          <span className="text-gray-600">/month</span>
                        </div>
                        <ul className="space-y-3 mb-8 text-left px-4">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-nikkah-pink flex-shrink-0 mt-0.5" />
                            <span>10 photo requests per month</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-nikkah-pink flex-shrink-0 mt-0.5" />
                            <span>Full access to all profiles</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-nikkah-pink flex-shrink-0 mt-0.5" />
                            <span>Advanced search filters</span>
                          </li>
                        </ul>
                        <Link to="/signup?plan=monthly">
                          <Button className="w-full bg-nikkah-blue hover:bg-nikkah-blue/90">
                            Get Started
                          </Button>
                        </Link>
                        <p className="text-xs text-gray-500 mt-4">
                          £9.99 billed monthly
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="border border-nikkah-pink shadow-lg relative">
                      <div className="absolute top-0 right-0 bg-nikkah-pink text-white py-1 px-3 text-xs font-medium rounded-bl-lg">
                        MOST POPULAR
                      </div>
                      <CardContent className="pt-6 pb-6 text-center">
                        <h3 className="text-xl font-bold mb-2">Lifetime</h3>
                        <div className="mt-4 mb-6">
                          <span className="text-4xl font-bold">£99.99</span>
                          <span className="text-gray-600"> one-time</span>
                        </div>
                        <ul className="space-y-3 mb-8 text-left px-4">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-nikkah-pink flex-shrink-0 mt-0.5" />
                            <span>Unlimited requests</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-nikkah-pink flex-shrink-0 mt-0.5" />
                            <span>Full access to all profiles</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-nikkah-pink flex-shrink-0 mt-0.5" />
                            <span>Lifetime access to platform</span>
                          </li>
                        </ul>
                        <Link to="/signup?plan=lifetime">
                          <Button className="w-full bg-nikkah-pink hover:bg-nikkah-pink/90">
                            Best Value
                          </Button>
                        </Link>
                        <p className="text-xs text-gray-500 mt-4">
                          One-time payment, no renewals
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="pt-6 pb-6 text-center">
                        <h3 className="text-xl font-bold mb-2">Yearly</h3>
                        <div className="mt-4 mb-6">
                          <span className="text-4xl font-bold">£74.99</span>
                          <span className="text-gray-600">/year</span>
                        </div>
                        <ul className="space-y-3 mb-8 text-left px-4">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-nikkah-pink flex-shrink-0 mt-0.5" />
                            <span>15 photo requests per month</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-nikkah-pink flex-shrink-0 mt-0.5" />
                            <span>Full access to all profiles</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-nikkah-pink flex-shrink-0 mt-0.5" />
                            <span>Save 37% vs monthly plan</span>
                          </li>
                        </ul>
                        <Link to="/signup?plan=yearly">
                          <Button className="w-full bg-nikkah-blue hover:bg-nikkah-blue/90">
                            Get Started
                          </Button>
                        </Link>
                        <p className="text-xs text-gray-500 mt-4">
                          £74.99 billed annually
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>}
      
      {/* Success Stories Section */}
      <section className="py-20 bg-gradient-to-b from-indigo-950 via-indigo-900 to-indigo-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 opacity-10 bg-[url('/lovable-uploads/53d901c8-2624-4d22-9ac6-6b02dc8ea757.png')] bg-center bg-no-repeat bg-cover"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/70 to-indigo-900/70"></div>
        </div>
        
        <div className="container relative z-10 px-4 mx-auto">
          <div className="max-w-xl mx-auto text-center">
            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl border border-white/10">
              <h3 className="text-2xl font-bold">Success Stories</h3>
              <p className="mb-6 text-white/80">
                Found your spouse through NikkahFirst? Let us know about your success story and receive a special gift to celebrate your marriage!
              </p>
              <Link to="/success-story">
                <Button className="bg-nikkah-pink hover:bg-nikkah-pink/90">
                  Share Your Story
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center bg-pink-100 p-3 rounded-full mb-4">
              <HelpCircle className="h-6 w-6 text-nikkah-pink" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to know about finding your perfect match on NikkahFirst.
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-b border-gray-200">
                <AccordionTrigger className="text-left py-5 hover:no-underline">
                  <span className="text-lg font-medium">How does NikkahFirst work?</span>
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-5">
                  NikkahFirst is a marriage platform that connects Muslims seeking marriage while adhering to Islamic principles. 
                  We facilitate connections through Walis (guardians) to ensure the process remains halal.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-2" className="border-b border-gray-200">
                <AccordionTrigger className="text-left py-5 hover:no-underline">
                  <span className="text-lg font-medium">Is it free for women?</span>
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-5">
                  Yes! NikkahFirst is completely free for women. We believe in making our platform accessible to sisters seeking marriage.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-3" className="border-b border-gray-200">
                <AccordionTrigger className="text-left py-5 hover:no-underline">
                  <span className="text-lg font-medium">How is privacy maintained?</span>
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-5">
                  We take privacy seriously. Photos are blurred by default and can only be viewed with explicit permission. 
                  All communications go through the Wali system to maintain Islamic principles.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-4" className="border-b border-gray-200">
                <AccordionTrigger className="text-left py-5 hover:no-underline">
                  <span className="text-lg font-medium">What payment options are available?</span>
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-5">
                  We offer various subscription plans for brothers, including monthly, yearly, and lifetime options. 
                  All major credit cards and debit cards are accepted for secure online payments.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-5" className="border-b border-gray-200">
                <AccordionTrigger className="text-left py-5 hover:no-underline">
                  <span className="text-lg font-medium">Can I cancel my subscription?</span>
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-5">
                  Yes, you can cancel your subscription at any time. For men, the subscription will remain active 
                  until the end of the billing period. Women's accounts are always free.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="container px-4 mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Find Your Spouse?</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Join thousands of Muslims who have found their match on NikkahFirst.
          </p>
          {user ? <Link to="/dashboard">
              <Button size="lg" className="bg-nikkah-pink hover:bg-nikkah-pink/90">
                Go to Dashboard
              </Button>
            </Link> : <Link to="/signup">
              <Button size="lg" className="bg-nikkah-pink hover:bg-nikkah-pink/90">
                Sign Up
              </Button>
            </Link>}
        </div>
      </section>

      {/* Admin link */}
      <div className="bg-gray-100 py-2 text-center border-t mt-auto">
        <Link to="/admin" className="text-xs text-gray-500 hover:text-nikkah-blue flex items-center justify-center">
          <Shield className="h-3 w-3 mr-1" />
          Admin Portal
        </Link>
      </div>
    </div>;
};
export default Index;
