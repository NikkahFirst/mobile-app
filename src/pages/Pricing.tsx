import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, CheckCircle, Heart, Clock } from "lucide-react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

const Pricing = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      
      <main className="flex-1">
        {/* Header */}
        <section className="relative text-white py-20 px-4">
          <div className="absolute inset-0 z-0">
            <img 
              src="/lovable-uploads/868b9e16-c102-467c-a169-672c089f5f11.png" 
              alt="Wedding rings background" 
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-indigo-950/60"></div>
          </div>
          <div className="container mx-auto text-center relative z-10">
            <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              We believe in making the marriage process accessible to everyone in our community.
            </p>
          </div>
        </section>
        
        {/* Pricing options */}
        <section className="py-20">
          <div className="container px-4 mx-auto">
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
                      <Check className="h-5 w-5 text-nikkah-pink flex-shrink-0 mt-0.5" />
                      <span>Create a detailed profile</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-nikkah-pink flex-shrink-0 mt-0.5" />
                      <span>Browse potential matches</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-nikkah-pink flex-shrink-0 mt-0.5" />
                      <span>Respond to interested brothers</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-nikkah-pink flex-shrink-0 mt-0.5" />
                      <span>Wali protection system</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-nikkah-pink flex-shrink-0 mt-0.5" />
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
                    <CardContent className="pt-10 pb-10 text-center">
                      <div className="mb-4">
                        <Clock className="h-8 w-8 text-nikkah-blue mx-auto" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Monthly Plan</h3>
                      <div className="mt-4 mb-6">
                        <span className="text-4xl font-bold">£9.99</span>
                        <span className="text-gray-600">/month</span>
                      </div>
                      <ul className="space-y-3 mb-8 text-left pl-6">
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
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-nikkah-pink flex-shrink-0 mt-0.5" />
                          <span>Cancel anytime</span>
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
                    <CardContent className="pt-10 pb-10 text-center">
                      <div className="mb-4">
                        <Heart className="h-8 w-8 text-nikkah-pink mx-auto fill-nikkah-pink/30" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Lifetime</h3>
                      <div className="mt-4 mb-6">
                        <span className="text-4xl font-bold">£99.99</span>
                        <span className="text-gray-600"> one-time</span>
                      </div>
                      <ul className="space-y-3 mb-8 text-left pl-6">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-nikkah-pink flex-shrink-0 mt-0.5" />
                          <span>Unlimited requests</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-nikkah-pink flex-shrink-0 mt-0.5" />
                          <span>Lifetime access to the platform</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-nikkah-pink flex-shrink-0 mt-0.5" />
                          <span>Full access to all profiles</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-nikkah-pink flex-shrink-0 mt-0.5" />
                          <span>Best value in the long term</span>
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
                    <CardContent className="pt-10 pb-10 text-center">
                      <div className="mb-4">
                        <Clock className="h-8 w-8 text-nikkah-blue mx-auto" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Yearly</h3>
                      <div className="mt-4 mb-6">
                        <span className="text-4xl font-bold">£74.99</span>
                        <span className="text-gray-600">/year</span>
                      </div>
                      <ul className="space-y-3 mb-8 text-left pl-6">
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
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-nikkah-pink flex-shrink-0 mt-0.5" />
                          <span>Annual billing</span>
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
        
        {/* FAQ Section */}
        <section className="py-20 bg-gray-50">
          <div className="container px-4 mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-center">Frequently Asked Questions</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div>
                <h3 className="text-xl font-bold mb-3">Why is it free for sisters?</h3>
                <p className="text-gray-600">
                  In Islamic tradition, men typically take the lead in the marriage process. Our pricing model reflects this tradition while ensuring the platform remains accessible to all.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3">Can I cancel my subscription?</h3>
                <p className="text-gray-600">
                  Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3">What is the Wali system?</h3>
                <p className="text-gray-600">
                  The Wali system ensures that when a brother is interested in a sister, he must contact her Wali (guardian) first, following Islamic principles for marriage.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3">Is my information secure?</h3>
                <p className="text-gray-600">
                  Yes, we take privacy very seriously. Your personal information is encrypted and protected. You control who can see your profile and photos.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3">What if I find my spouse quickly?</h3>
                <p className="text-gray-600">
                  If you find your spouse before your subscription ends, congratulations! You can keep your account active or cancel your subscription.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3">Do you offer refunds?</h3>
                <p className="text-gray-600">
                  We offer a 7-day money-back guarantee if you're not satisfied with our service. Please contact our support team for assistance.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-20 bg-white text-center">
          <div className="container px-4 mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold mb-4">Begin Your Journey Today</h2>
            <p className="text-xl text-gray-600 mb-8">
              Take the first step towards finding your spouse according to Islamic values.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button size="lg" className="bg-nikkah-pink hover:bg-nikkah-pink/90 w-full sm:w-auto">
                  Create Your Account
                </Button>
              </Link>
              <Link to="/about">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Pricing;
