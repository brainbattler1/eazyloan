-- Simplify credit score calculation to work with basic data
CREATE OR REPLACE FUNCTION calculate_credit_score(check_user_id uuid)
RETURNS integer AS $$
DECLARE
  base_score integer := 650;
  user_age_bonus integer := 0;
  email_verified_bonus integer := 0;
  final_score integer;
BEGIN
  -- Calculate age bonus (older accounts get better scores)
  SELECT COALESCE(
    CASE 
      WHEN EXTRACT(EPOCH FROM (now() - created_at)) / 86400 >= 365 THEN 50
      WHEN EXTRACT(EPOCH FROM (now() - created_at)) / 86400 >= 180 THEN 30
      WHEN EXTRACT(EPOCH FROM (now() - created_at)) / 86400 >= 90 THEN 20
      WHEN EXTRACT(EPOCH FROM (now() - created_at)) / 86400 >= 30 THEN 10
      ELSE 0
    END, 0
  ) INTO user_age_bonus
  FROM auth.users
  WHERE id = check_user_id;
  
  -- Email verification bonus
  SELECT COALESCE(
    CASE 
      WHEN email_confirmed_at IS NOT NULL THEN 20
      ELSE 0
    END, 0
  ) INTO email_verified_bonus
  FROM auth.users
  WHERE id = check_user_id;
  
  -- Calculate final score
  final_score := base_score + user_age_bonus + email_verified_bonus;
  
  -- Add some randomness for demo purposes
  final_score := final_score + (random() * 100)::integer;
  
  -- Ensure score is within valid range (300-850)
  final_score := GREATEST(300, LEAST(850, final_score));
  
  RETURN final_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 