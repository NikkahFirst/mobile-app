import { useNavigate, Link } from "react-router-dom"; // 🛠️ import Link
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/MobileNav";
import RequestedProfilesComponent from "@/components/RequestedProfiles";

const RequestedProfiles = () => {
  const navigate = useNavigate();
  
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            {/* 🔥 Change a to Link */}
            <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
              <img 
                src="/lovable-uploads/35ae8a8d-0a2d-496e-9894-ed867e4bd95b.png" 
                alt="NikkahFirst Logo" 
                className="h-14" 
              />
            </Link>
          </div>
        </div>
      </header>
      
      <div className="flex-1 container py-4 md:py-8 px-4 md:px-8 pb-20 md:pb-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            className="mr-2 p-2"
            onClick={() => navigate("/dashboard")}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Button>
        </div>

        {/* ✏️ Add a title */}
        <h2 className="text-xl md:text-2xl font-bold mb-6">Profiles You Requested</h2>

        <RequestedProfilesComponent />
      </div>

      {/* ❓ If you want to keep MobileNav here, it's ok. Otherwise, you can remove */}
      <div className="md:hidden">
        <MobileNav activeTab="dashboard" setActiveTab={() => {}} />
      </div>
    </div>
  );
};

export default RequestedProfiles;
