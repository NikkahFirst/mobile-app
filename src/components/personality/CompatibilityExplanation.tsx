
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface CompatibilityExplanationProps {
  userPersonalityType: string;
  matchPersonalityType: string;
  compatibilityScore: number;
}

const CompatibilityExplanation = ({ 
  userPersonalityType, 
  matchPersonalityType, 
  compatibilityScore 
}: CompatibilityExplanationProps) => {
  const [explanation, setExplanation] = useState<string>("");
  const [strengths, setStrengths] = useState<string[]>([]);

  useEffect(() => {
    generateCompatibilityExplanation();
  }, [userPersonalityType, matchPersonalityType]);

  const generateCompatibilityExplanation = () => {
    const explanations = getCompatibilityExplanations(userPersonalityType, matchPersonalityType);
    setExplanation(explanations.main);
    setStrengths(explanations.strengths);
  };

  const getCompatibilityExplanations = (type1: string, type2: string) => {
    // Generate Islamic-focused compatibility explanations based on MBTI types
    const compatibilityMap: { [key: string]: { main: string; strengths: string[] } } = {
      // Example combinations - you can expand this
      "INTJ-ENFJ": {
        main: "Your strategic thinking complements their warm guidance, creating a balanced approach to family decisions and Islamic household management.",
        strengths: [
          "Balanced leadership in religious matters",
          "Complementary strengths in planning family goals",
          "Harmonious approach to raising righteous children"
        ]
      },
      "ISFJ-ESTP": {
        main: "Your nurturing nature pairs beautifully with their energetic spirit, fostering a home filled with both stability and joy.",
        strengths: [
          "Balance between stability and adventure in marriage",
          "Complementary approaches to family activities",
          "Natural harmony in daily Islamic practices"
        ]
      },
      "ENFP-INTJ": {
        main: "Your enthusiasm and their strategic mind create a powerful partnership for building a strong Islamic family foundation.",
        strengths: [
          "Inspiring each other in spiritual growth",
          "Balanced decision-making for family matters",
          "Complementary strengths in community involvement"
        ]
      },
      // Default explanation for any unlisted combination
      "DEFAULT": {
        main: "Your personalities complement each other beautifully, creating opportunities for mutual growth in faith and family life.",
        strengths: [
          "Natural balance in your approaches to life",
          "Complementary strengths that support each other",
          "Potential for spiritual and personal growth together"
        ]
      }
    };

    // Try direct match or reverse match
    const key1 = `${type1}-${type2}`;
    const key2 = `${type2}-${type1}`;
    
    return compatibilityMap[key1] || compatibilityMap[key2] || compatibilityMap["DEFAULT"];
  };

  return (
    <Card className="mt-4 border-pink-100 bg-gradient-to-r from-pink-50 to-rose-50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="h-4 w-4 text-nikkah-pink" />
          <h4 className="font-semibold text-gray-800">Why You're Compatible</h4>
          <Sparkles className="h-4 w-4 text-nikkah-pink" />
        </div>
        
        <p className="text-sm text-gray-700 mb-3 leading-relaxed">
          {explanation}
        </p>
        
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600 mb-2">Relationship Strengths:</p>
          {strengths.map((strength, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-nikkah-pink rounded-full mt-1.5 flex-shrink-0" />
              <p className="text-xs text-gray-600 leading-relaxed">{strength}</p>
            </div>
          ))}
        </div>
        
        <div className="mt-3 pt-2 border-t border-pink-100">
          <p className="text-xs text-gray-500 text-center">
            Compatibility is a guide - true connection comes from shared values and mutual respect
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompatibilityExplanation;
