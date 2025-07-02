
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Loader } from "lucide-react";

interface Question {
  id: string;
  question: string;
  trait_type: string;
}

const PersonalityQuiz = ({ onComplete }: { onComplete: (results: any) => void }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isRetaking, setIsRetaking] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const { data, error } = await supabase
          .from('personality_questions')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) throw error;
        setQuestions(data || []);
        
        if (data && data.length > 0) {
          await checkForPreviousAnswers(data);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching questions:', error);
        toast({
          title: "Error loading questions",
          description: "Please try again later.",
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [toast]);

  const checkForPreviousAnswers = async (questions: Question[]) => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      // Check if user has previous results
      const { data: existingResults, error: resultsError } = await supabase
        .from('personality_results')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (resultsError && resultsError.code !== 'PGRST116') {
        throw resultsError;
      }

      if (existingResults) {
        setIsRetaking(true);
        // Don't load previous answers when retaking - start fresh
      }
    } catch (error) {
      console.error('Error checking previous answers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (questions.length > 0) {
      setProgress(Math.round((currentQuestionIndex / questions.length) * 100));
    }
  }, [currentQuestionIndex, questions.length]);

  const handleAnswerSelection = (value: string) => {
    if (!questions[currentQuestionIndex]) return;

    const questionId = questions[currentQuestionIndex].id;
    const numericValue = parseInt(value);

    setAnswers(prev => ({
      ...prev,
      [questionId]: numericValue
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const calculateResults = () => {
    let e_i_score = 0;
    let s_n_score = 0;
    let t_f_score = 0;
    let j_p_score = 0;

    questions.forEach(question => {
      const answer = answers[question.id] || 0;

      switch (question.trait_type) {
        case 'IE':
          e_i_score += answer;
          break;
        case 'SN':
          s_n_score += answer;
          break;
        case 'TF':
          t_f_score += answer;
          break;
        case 'JP':
          j_p_score += answer;
          break;
        default:
          break;
      }
    });

    let type_code = '';
    type_code += e_i_score >= 0 ? 'I' : 'E';
    type_code += s_n_score >= 0 ? 'N' : 'S';
    type_code += t_f_score >= 0 ? 'F' : 'T';
    type_code += j_p_score >= 0 ? 'P' : 'J';

    return {
      e_i_score,
      s_n_score,
      t_f_score,
      j_p_score,
      type_code
    };
  };

  const handleSubmit = async () => {
    if (!user) return;

    setSubmitting(true);
    try {
      // Clear existing data if retaking
      if (isRetaking) {
        await supabase
          .from('personality_answers')
          .delete()
          .eq('user_id', user.id);

        await supabase
          .from('personality_results')
          .delete()
          .eq('user_id', user.id);
      }

      // Calculate new results
      const results = calculateResults();
      
      // Add small delay to ensure deletion completed
      await new Promise(resolve => setTimeout(resolve, 300));

      // Save new answers
      const answerInserts = Object.entries(answers).map(([questionId, value]) => ({
        user_id: user.id,
        question_id: questionId,
        answer_value: value
      }));

      const { error: answersError } = await supabase
        .from('personality_answers')
        .insert(answerInserts);

      if (answersError) throw answersError;

      // Save personality result
      const { error: resultError } = await supabase
        .from('personality_results')
        .insert({
          user_id: user.id,
          e_i_score: results.e_i_score,
          s_n_score: results.s_n_score,
          t_f_score: results.t_f_score,
          j_p_score: results.j_p_score,
          type_code: results.type_code
        });

      if (resultError) throw resultError;

      // Fetch result details
      const { data: typeDetails, error: typeError } = await supabase
        .from('personality_types')
        .select('*')
        .eq('type_code', results.type_code)
        .single();

      if (typeError) {
        console.warn('Could not fetch type details:', typeError);
      }

      const completeResults = {
        ...results,
        islamic_name: typeDetails?.islamic_name || 'Unknown Type',
        description: typeDetails?.description || 'No description available'
      };

      toast({
        title: isRetaking ? "Quiz retaken successfully!" : "Quiz completed!",
        description: `Your personality type is ${results.type_code}`,
      });

      onComplete(completeResults);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast({
        title: "Error saving results",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader className="h-8 w-8 animate-spin text-nikkah-pink" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">No questions available.</p>
      </Card>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const hasAnswered = currentQuestion && answers[currentQuestion.id] !== undefined;

  return (
    <Card className="p-6 shadow-md">
      {isRetaking && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700">
            You are retaking the personality quiz. Your previous results will be replaced.
          </p>
        </div>
      )}
      
      <div className="mb-4">
        <Progress value={progress} className="w-full h-2" />
        <p className="text-sm text-right mt-1 text-muted-foreground">
          {currentQuestionIndex + 1} of {questions.length}
        </p>
      </div>

      <div className="mt-6 mb-8">
        <h3 className="text-lg font-medium mb-4">{currentQuestion?.question}</h3>

        <RadioGroup
          value={answers[currentQuestion?.id]?.toString() || ''}
          onValueChange={handleAnswerSelection}
          className="space-y-3"
        >
          <div className="flex items-center justify-between pb-2">
            <span className="text-sm text-muted-foreground">Strongly Disagree</span>
            <span className="text-sm text-muted-foreground">Strongly Agree</span>
          </div>

          <div className="flex justify-between space-x-1">
            {[-2, -1, 0, 1, 2].map((value) => (
              <div key={value} className="flex flex-col items-center">
                <RadioGroupItem
                  value={value.toString()}
                  id={`q${currentQuestionIndex}-a${value}`}
                  className="mb-1"
                />
                <Label 
                  htmlFor={`q${currentQuestionIndex}-a${value}`}
                  className="text-xs font-normal cursor-pointer"
                >
                  {value === -2 && "1"}
                  {value === -1 && "2"}
                  {value === 0 && "3"}
                  {value === 1 && "4"}
                  {value === 2 && "5"}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </div>

      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </Button>

        {currentQuestionIndex < questions.length - 1 ? (
          <Button
            onClick={handleNext}
            disabled={!hasAnswered}
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!hasAnswered || submitting}
            className="bg-nikkah-pink hover:bg-nikkah-pink/90"
          >
            {submitting ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" /> 
                {isRetaking ? "Updating Results..." : "Completing Quiz..."}
              </>
            ) : (
              isRetaking ? "Update Results" : "Complete Quiz"
            )}
          </Button>
        )}
      </div>
    </Card>
  );
};

export default PersonalityQuiz;
