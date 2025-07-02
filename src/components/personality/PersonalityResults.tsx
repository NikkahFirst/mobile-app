
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Loader } from "lucide-react";

interface PersonalityResult {
  e_i_score: number;
  s_n_score: number;
  t_f_score: number;
  j_p_score: number;
  type_code: string;
  islamic_name?: string;
  description?: string;
}

interface PersonalityResultsProps {
  results?: PersonalityResult;
  onRetake?: () => void;
}

const PersonalityResults = ({ results: propResults, onRetake }: PersonalityResultsProps) => {
  const [results, setResults] = useState<PersonalityResult | null>(propResults || null);
  const [loading, setLoading] = useState(!propResults);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (propResults) {
      setResults(propResults);
      return;
    }

    const fetchResults = async () => {
      if (!user) return;

      try {
        // Get user's results
        const { data, error } = await supabase
          .from('personality_results')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        
        if (data) {
          // Get personality type details
          const { data: typeDetails, error: typeError } = await supabase
            .from('personality_types')
            .select('*')
            .eq('type_code', data.type_code)
            .single();

          if (typeError) throw typeError;

          setResults({
            ...data,
            islamic_name: typeDetails?.islamic_name,
            description: typeDetails?.description
          });
        }
      } catch (error) {
        console.error('Error fetching personality results:', error);
        toast({
          title: "Error loading results",
          description: "Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [user, toast, propResults]);

  const renderTraitBar = (score: number, label1: string, label2: string) => {
    // Normalize score to 0-100 (for display purposes)
    const normalizedScore = Math.min(Math.max((score + 10) * 5, 0), 100);
    const percentage = Math.abs(score) * 10;
    const leftLabel = score < 0 ? `${label1} ${percentage}%` : '';
    const rightLabel = score > 0 ? `${label2} ${percentage}%` : '';
    const centerLabel = score === 0 ? 'Balanced' : '';

    return (
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <div className="font-medium">{label1}</div>
          <div className="font-medium">{label2}</div>
        </div>
        <div className="relative h-4 bg-gray-200 rounded-full">
          <div 
            className={`absolute top-0 bottom-0 ${score < 0 ? 'right-1/2' : 'left-1/2'} ${score < 0 ? 'bg-blue-500' : 'bg-green-500'} rounded-full`}
            style={{
              width: `${normalizedScore === 50 ? 0 : Math.abs(normalizedScore - 50)}%`
            }}
          ></div>
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-400"></div>
          <div className="absolute top-5 left-1/2 transform -translate-x-1/2 text-xs font-medium">
            {leftLabel || rightLabel || centerLabel}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader className="h-8 w-8 animate-spin text-nikkah-pink" />
      </div>
    );
  }

  if (!results) {
    return (
      <Card className="p-6">
        <CardHeader>
          <CardTitle className="text-center">No Results Found</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-6 text-muted-foreground">
            You haven't taken the personality quiz yet.
          </p>
          {onRetake && (
            <Button
              onClick={onRetake}
              className="bg-nikkah-pink hover:bg-nikkah-pink/90"
            >
              Take the Quiz
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-center">
          <div className="text-2xl font-bold text-nikkah-pink mb-1">{results.type_code}</div>
          <div className="text-xl">{results.islamic_name}</div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="mb-8 text-muted-foreground text-center">
          {results.description}
        </div>

        <div className="my-8">
          <h4 className="text-sm font-semibold mb-4">YOUR PERSONALITY TRAITS</h4>
          {renderTraitBar(results.e_i_score / 10, "Extraversion (E)", "Introversion (I)")}
          {renderTraitBar(results.s_n_score / 10, "Sensing (S)", "Intuition (N)")}
          {renderTraitBar(results.t_f_score / 10, "Thinking (T)", "Feeling (F)")}
          {renderTraitBar(results.j_p_score / 10, "Judging (J)", "Perceiving (P)")}
        </div>

        {onRetake && (
          <div className="flex justify-center mt-8">
            <Button
              onClick={onRetake}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Retake Quiz
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PersonalityResults;
