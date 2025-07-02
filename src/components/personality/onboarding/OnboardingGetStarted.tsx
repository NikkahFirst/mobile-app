
import { CheckCircle, Clock, Users, Zap } from "lucide-react";

const OnboardingGetStarted = () => {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-bold text-gray-900">
          Ready to Find Your Match?
        </h2>
        <p className="text-gray-600 text-sm">
          You're minutes away from discovering your personality type
        </p>
      </div>

      <div className="bg-gradient-to-r from-nikkah-pink/10 to-purple-100 rounded-lg p-4 border border-nikkah-pink/20">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
          <Zap className="h-4 w-4 text-nikkah-pink" />
          What to Expect
        </h3>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
            <span className="text-xs text-gray-700">
              <strong>Quick Quiz:</strong> 16 questions (5-7 minutes)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
            <span className="text-xs text-gray-700">
              <strong>Your Results:</strong> Personality type with Islamic context
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
            <span className="text-xs text-gray-700">
              <strong>Smart Matching:</strong> Compatible matches with explanations
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
          <Clock className="h-6 w-6 text-blue-600 mx-auto mb-1" />
          <div className="text-lg font-bold text-blue-600">5-7</div>
          <div className="text-xs text-blue-700">Minutes</div>
        </div>
        
        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
          <Users className="h-6 w-6 text-green-600 mx-auto mb-1" />
          <div className="text-lg font-bold text-green-600">2</div>
          <div className="text-xs text-green-700">Daily matches</div>
        </div>
      </div>

      <div className="text-center bg-gray-50 rounded-lg p-3 border border-gray-200">
        <p className="text-xs text-gray-600">
          <strong>Privacy:</strong> Your data is confidential and only used 
          to improve your NikkahFirst matching experience.
        </p>
      </div>
    </div>
  );
};

export default OnboardingGetStarted;
