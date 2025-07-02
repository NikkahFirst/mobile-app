
import { Heart, Sparkles, Users } from "lucide-react";

const OnboardingWelcome = () => {
  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-16 h-16 bg-gradient-to-br from-nikkah-pink to-purple-400 rounded-full flex items-center justify-center">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <Sparkles className="h-5 w-5 text-nikkah-pink absolute -top-1 -right-1" />
        </div>
      </div>

      <div className="space-y-3">
        <h1 className="text-xl font-bold text-gray-900">
          Welcome to AI Personality Matching
        </h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          Discover your Islamic personality type and find your perfect match through 
          advanced compatibility analysis rooted in Islamic values.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-6">
        <div className="text-center">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 text-xs mb-1">Smart Matching</h3>
          <p className="text-xs text-gray-600">AI-powered analysis</p>
        </div>
        
        <div className="text-center">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Heart className="h-5 w-5 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 text-xs mb-1">Islamic Context</h3>
          <p className="text-xs text-gray-600">Rooted in values</p>
        </div>
        
        <div className="text-center">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-900 text-xs mb-1">Deep Insights</h3>
          <p className="text-xs text-gray-600">Understand compatibility</p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWelcome;
