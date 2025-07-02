
import { Brain, MessageSquare, Heart, Users } from "lucide-react";

const OnboardingHowItWorks = () => {
  const steps = [
    {
      icon: MessageSquare,
      title: "Take the Quiz",
      description: "Answer questions based on MBTI with Islamic context",
      color: "bg-blue-100 text-blue-600"
    },
    {
      icon: Brain,
      title: "Get Your Type",
      description: "Discover your Islamic personality type with insights",
      color: "bg-green-100 text-green-600"
    },
    {
      icon: Users,
      title: "Find Matches",
      description: "AI analyzes compatibility for best matches",
      color: "bg-purple-100 text-purple-600"
    },
    {
      icon: Heart,
      title: "Connect",
      description: "Understand compatibility and build relationships",
      color: "bg-pink-100 text-pink-600"
    }
  ];

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-bold text-gray-900">
          How It Works
        </h2>
        <p className="text-gray-600 text-sm">
          A simple 4-step process to find compatible matches
        </p>
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => {
          const IconComponent = step.icon;
          return (
            <div key={index} className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${step.color}`}>
                <IconComponent className="h-4 w-4" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-nikkah-pink">Step {index + 1}</span>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">{step.title}</h3>
                <p className="text-gray-600 text-xs leading-relaxed">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-gradient-to-r from-pink-50 to-blue-50 rounded-lg p-3 border border-pink-100 mt-4">
        <p className="text-xs text-gray-700 text-center">
          <span className="font-semibold">Note:</span> All matching respects Islamic values 
          and the importance of character compatibility.
        </p>
      </div>
    </div>
  );
};

export default OnboardingHowItWorks;
