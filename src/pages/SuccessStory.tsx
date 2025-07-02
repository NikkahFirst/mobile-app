import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import NavBar from "@/components/NavBar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Heart, Users, Calendar, MessageSquare, Gift } from "lucide-react";
const SuccessStory = () => {
  const {
    toast
  } = useToast();
  const {
    user
  } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    partnerName: "",
    marriageDate: "",
    story: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({
        ...prev,
        email: user.email
      }));
    }
  }, [user]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const {
      name,
      value
    } = e.target;
    if (name === 'email' && user?.email) return;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const {
        error
      } = await supabase.functions.invoke("send-notification-email", {
        body: {
          to: "info@nikkahfirst.com",
          type: "success_story",
          senderName: formData.name,
          recipientName: "NikkahFirst Team",
          subject: "Success Story",
          storyData: {
            name: formData.name,
            email: formData.email,
            partnerName: formData.partnerName,
            marriageDate: formData.marriageDate,
            story: formData.story
          }
        }
      });
      if (error) {
        console.error("Error sending success story:", error);
        toast({
          title: "Error",
          description: "There was a problem submitting your story. Please try again.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
      setIsSubmitted(true);
      setFormData({
        name: "",
        email: "",
        partnerName: "",
        marriageDate: "",
        story: ""
      });
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } catch (error) {
      console.error("Error in form submission:", error);
      toast({
        title: "Error",
        description: "There was a problem submitting your story. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };
  return <div className="flex min-h-screen flex-col">
      <NavBar />
      
      <main className="flex-1">
        <section className="relative bg-gradient-to-b from-pink-50 to-white pt-20 pb-16">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center justify-center bg-pink-100 p-3 rounded-full mb-6">
              <Heart className="h-8 w-8 text-nikkah-pink" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">NikkahFirst Success Stories </h1>
            <p className="text-lg md:text-xl text-gray-700 max-w-2xl mx-auto mb-8">
              Discover how NikkahFirst has helped Muslim couples find their perfect match and 
              build beautiful marriages based on Islamic principles. 💕
            </p>
            <a href="#share-story" className="inline-flex items-center bg-nikkah-pink text-white px-6 py-3 rounded-md font-medium hover:bg-nikkah-pink/90 transition-colors">
              Share Your Story 📖
            </a>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent"></div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Featured Success Stories 🌟</h2>
            
            <div className="flex items-center justify-center w-full">
              <div className="text-center bg-gray-50 p-8 rounded-lg">
                <h3 className="text-2xl font-semibold text-gray-700 mb-4">Coming Soon 🚀</h3>
                <p className="text-gray-500 mb-4">
                  We're working on collecting and sharing inspiring success stories from our community.
                  Stay tuned for heartwarming journeys of couples who found their match through NikkahFirst! ❤️
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Our Impact 📊</h2>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="inline-flex items-center justify-center bg-pink-100 p-4 rounded-full mb-4">
                  <Heart className="h-8 w-8 text-nikkah-pink" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">100+</h3>
                <p className="text-gray-600">Successful Matches ✨</p>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center bg-pink-100 p-4 rounded-full mb-4">
                  <Users className="h-8 w-8 text-nikkah-pink" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">10,000+</h3>
                <p className="text-gray-600">Active Members 👥</p>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center bg-pink-100 p-4 rounded-full mb-4">
                  <MessageSquare className="h-8 w-8 text-nikkah-pink" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">98%</h3>
                <p className="text-gray-600">Satisfaction Rate 😊</p>
              </div>
            </div>
          </div>
        </section>

        <section id="share-story" className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="font-bold mb-4 text-4xl">We Are Giving Away Wedding Gifts! Share Your NikkahFirrst Story 🎉</h2>
                <p className="text-gray-600 flex items-center justify-center gap-2">
                  Share your story and receive a special gift to celebrate your marriage! 
                  <Gift className="h-6 w-6 text-nikkah-pink" />
                </p>
              </div>
              
              {isSubmitted ? <div className="bg-white shadow-lg rounded-lg p-8 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-green-600 mb-2">Thank You! 🙌</h2>
                  <p className="text-gray-600 mb-4">
                    We've received your story! Our team will review it and contact you about your gift soon. 🎁
                  </p>
                  <Button onClick={() => setIsSubmitted(false)} className="bg-nikkah-pink hover:bg-nikkah-pink/90">
                    Submit Another Story 📝
                  </Button>
                </div> : <div className="bg-white shadow-lg rounded-lg p-8">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Your Name</Label>
                      <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Your full name" required />
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="your.email@example.com" required readOnly={!!user?.email} className={user?.email ? "bg-gray-100 cursor-not-allowed" : ""} />
                      {user?.email && <p className="text-xs text-gray-500 mt-1">
                          Your email is locked to your account for tracking purposes.
                        </p>}
                    </div>
                    
                    <div>
                      <Label htmlFor="partnerName">Partner's Name</Label>
                      <Input id="partnerName" name="partnerName" value={formData.partnerName} onChange={handleChange} placeholder="Your spouse's full name" required />
                    </div>
                    
                    <div>
                      <Label htmlFor="marriageDate">Marriage Date</Label>
                      <Input id="marriageDate" name="marriageDate" type="date" value={formData.marriageDate} onChange={handleChange} required />
                    </div>
                    
                    <div>
                      <Label htmlFor="story">Your Story</Label>
                      <Textarea id="story" name="story" value={formData.story} onChange={handleChange} placeholder="Tell us how you met on NikkahFirst and your journey to marriage..." className="min-h-[150px]" required />
                    </div>
                    
                    <Button type="submit" className="w-full bg-nikkah-pink hover:bg-nikkah-pink/90" disabled={isLoading}>
                      {isLoading ? "Submitting..." : "Share Your Story"}
                    </Button>
                  </form>
                </div>}
            </div>
          </div>
        </section>
      </main>
    </div>;
};
export default SuccessStory;