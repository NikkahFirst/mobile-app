
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

const GoogleErrorPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="max-w-md text-center space-y-6">
        <div className="flex items-center justify-center bg-red-100 rounded-full w-20 h-20 mx-auto">
          <AlertTriangle className="text-red-500 w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Something Went Wrong</h1>
        <p className="text-gray-600">
          We couldn't complete your Google sign-in. This could be due to a popup blocker, network issue, or expired session.
        </p>
        <div className="flex flex-col space-y-3 mt-6">
          <Button asChild className="w-full bg-nikkah-pink hover:bg-nikkah-pink/90">
            <Link to="/signup">Try Again</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">Back to Login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GoogleErrorPage;
