
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import OnboardingWelcome from "./onboarding/OnboardingWelcome";
import OnboardingHowItWorks from "./onboarding/OnboardingHowItWorks";
import OnboardingGetStarted from "./onboarding/OnboardingGetStarted";

interface PersonalityOnboardingProps {
  onComplete: () => void;
  isHelpMode?: boolean;
}

const PersonalityOnboarding = ({ onComplete, isHelpMode = false }: PersonalityOnboardingProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    { component: OnboardingWelcome, title: "Welcome" },
    { component: OnboardingHowItWorks, title: "How It Works" },
    { component: OnboardingGetStarted, title: "Get Started" }
  ];

  const CurrentStepComponent = steps[currentStep].component;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-hidden">
      <Card className="w-full max-w-md mx-auto max-h-[90vh] flex flex-col relative">
        {/* Close button for help mode */}
        {isHelpMode && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onComplete}
            className="absolute top-4 right-4 z-10"
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        <CardContent className="p-6 flex flex-col h-full overflow-hidden">
          {/* Progress indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentStep
                      ? 'bg-nikkah-pink scale-125'
                      : index < currentStep
                      ? 'bg-nikkah-pink/60'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Step content - scrollable if needed */}
          <div className="flex-1 overflow-y-auto mb-6">
            <CurrentStepComponent />
          </div>

          {/* Navigation - fixed at bottom */}
          <div className="flex items-center justify-between mt-auto">
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="flex items-center gap-3">
              {!isHelpMode && currentStep < steps.length - 1 && (
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  className="text-sm"
                >
                  Skip
                </Button>
              )}
              
              <Button
                onClick={handleNext}
                className="bg-nikkah-pink hover:bg-nikkah-pink/90 flex items-center gap-2"
              >
                {currentStep === steps.length - 1 ? (
                  isHelpMode ? 'Close' : 'Start Quiz'
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PersonalityOnboarding;
