
-- Create function to find personality-based matches
CREATE OR REPLACE FUNCTION public.find_personality_match(
  user_id UUID,
  opposite_gender TEXT,
  min_age INTEGER DEFAULT 18,
  max_age INTEGER DEFAULT 65,
  countries TEXT[] DEFAULT NULL,
  ethnicities TEXT[] DEFAULT NULL,
  open_to_all_countries BOOLEAN DEFAULT FALSE,
  open_to_all_ethnicities BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  id UUID,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  age INTEGER,
  personality_compatibility INTEGER,
  photos TEXT[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_type_code TEXT;
BEGIN
  -- Get the user's personality type
  SELECT type_code INTO user_type_code
  FROM personality_results
  WHERE user_id = find_personality_match.user_id;

  -- Return early if user hasn't taken the quiz
  IF user_type_code IS NULL THEN
    RETURN;
  END IF;

  -- Find potential matches
  RETURN QUERY
  WITH 
  -- Get previous match requests to exclude
  previous_matches AS (
    SELECT 
      requested_id as profile_id
    FROM match_requests
    WHERE requester_id = find_personality_match.user_id
    UNION
    SELECT
      requester_id as profile_id
    FROM match_requests
    WHERE requested_id = find_personality_match.user_id
  ),
  -- Calculate age from date of birth
  aged_profiles AS (
    SELECT
      p.id,
      p.first_name,
      p.last_name,
      p.display_name,
      p.photos,
      p.ethnicity,
      p.country,
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.date_of_birth))::INTEGER as age
    FROM profiles p
    WHERE p.gender = find_personality_match.opposite_gender
      AND p.onboarding_completed = true
      AND p.can_be_fetched = true
      AND p.id NOT IN (SELECT profile_id FROM previous_matches)
      AND p.id <> find_personality_match.user_id
      AND p.date_of_birth IS NOT NULL
  )
  SELECT 
    aged.id,
    aged.first_name,
    aged.last_name,
    aged.display_name,
    aged.age,
    COALESCE(pc.compatibility_score, 50) as personality_compatibility,
    aged.photos
  FROM aged_profiles aged
  JOIN personality_results pr ON aged.id = pr.user_id
  LEFT JOIN personality_compatibility pc ON 
    (pc.type_one = user_type_code AND pc.type_two = pr.type_code)
    OR (pc.type_one = pr.type_code AND pc.type_two = user_type_code)
  WHERE aged.age BETWEEN find_personality_match.min_age AND find_personality_match.max_age
    AND (
      find_personality_match.open_to_all_countries
      OR aged.country = ANY(find_personality_match.countries)
      OR find_personality_match.countries IS NULL
      OR find_personality_match.countries = '{}'
    )
    AND (
      find_personality_match.open_to_all_ethnicities
      OR aged.ethnicity && find_personality_match.ethnicities
      OR find_personality_match.ethnicities IS NULL
      OR find_personality_match.ethnicities = '{}'
    )
  ORDER BY 
    personality_compatibility DESC,
    aged.age ASC
  LIMIT 5;
END;
$$;

-- Grant function execution permission to authenticated users
GRANT EXECUTE ON FUNCTION public.find_personality_match TO authenticated;
