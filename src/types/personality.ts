
export interface PersonalityQuestion {
  id: string;
  question: string;
  trait_type: string;
  created_at: string;
}

export interface PersonalityAnswer {
  id: string;
  user_id: string;
  question_id: string;
  answer_value: number;
  created_at: string;
}

export interface PersonalityType {
  id: string;
  type_code: string;
  islamic_name: string;
  description: string;
  created_at: string;
}

export interface PersonalityResult {
  id: string;
  user_id: string;
  e_i_score: number;
  s_n_score: number;
  t_f_score: number;
  j_p_score: number;
  type_code: string;
  created_at: string;
  updated_at: string;
}
