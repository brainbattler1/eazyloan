-- Fix Credit Score Functionality
-- Create credit_scores table
CREATE TABLE IF NOT EXISTS credit_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 300 AND score <= 850),
  score_band text NOT NULL CHECK (score_band IN ('poor', 'fair', 'good', 'very_good', 'excellent')),
  factors jsonb,
  recommendations jsonb,
  bureau_source text DEFAULT 'internal',
  is_current boolean DEFAULT true,
  calculated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE credit_scores ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_credit_scores_user_id ON credit_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_scores_current ON credit_scores(user_id, is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_credit_scores_calculated_at ON credit_scores(calculated_at);

-- RLS Policies
CREATE POLICY "Users can view their own credit scores" ON credit_scores
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit scores" ON credit_scores
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit scores" ON credit_scores
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to get current credit score
CREATE OR REPLACE FUNCTION get_current_credit_score(check_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  score integer,
  score_band text,
  factors jsonb,
  recommendations jsonb,
  bureau_source text,
  is_current boolean,
  calculated_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT cs.id, cs.user_id, cs.score, cs.score_band, cs.factors, cs.recommendations, cs.bureau_source, cs.is_current, cs.calculated_at
  FROM credit_scores cs
  WHERE cs.user_id = check_user_id AND cs.is_current = true
  ORDER BY cs.calculated_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate credit score
CREATE OR REPLACE FUNCTION calculate_credit_score(check_user_id uuid)
RETURNS integer AS $$
DECLARE
  base_score integer := 650;
  payment_bonus integer := 0;
  loan_bonus integer := 0;
  income_bonus integer := 0;
  final_score integer;
BEGIN
  -- Calculate payment history bonus (based on successful payments)
  SELECT COALESCE(COUNT(*) * 5, 0) INTO payment_bonus
  FROM payments p
  WHERE p.user_id = check_user_id 
    AND p.status = 'completed'
    AND p.payment_date >= now() - interval '2 years';
  
  -- Calculate loan history bonus (based on approved loans)
  SELECT COALESCE(COUNT(*) * 10, 0) INTO loan_bonus
  FROM loan_applications la
  WHERE la.user_id = check_user_id 
    AND la.status = 'approved'
    AND la.created_at >= now() - interval '3 years';
  
  -- Calculate income bonus (based on monthly income)
  SELECT COALESCE(
    CASE 
      WHEN monthly_income >= 100000 THEN 50
      WHEN monthly_income >= 50000 THEN 30
      WHEN monthly_income >= 25000 THEN 20
      WHEN monthly_income >= 10000 THEN 10
      ELSE 0
    END, 0
  ) INTO income_bonus
  FROM user_profiles up
  WHERE up.user_id = check_user_id;
  
  -- Calculate final score
  final_score := base_score + payment_bonus + loan_bonus + income_bonus;
  
  -- Ensure score is within valid range (300-850)
  final_score := GREATEST(300, LEAST(850, final_score));
  
  RETURN final_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample data for testing
INSERT INTO credit_scores (user_id, score, score_band, factors, recommendations, bureau_source, is_current)
SELECT 
  u.id,
  650 + (random() * 200)::integer,
  CASE 
    WHEN score >= 800 THEN 'excellent'
    WHEN score >= 740 THEN 'very_good'
    WHEN score >= 670 THEN 'good'
    WHEN score >= 580 THEN 'fair'
    ELSE 'poor'
  END,
  '{"payment_history": 85, "credit_utilization": 70, "length_of_history": 60, "credit_mix": 75, "new_credit": 80}'::jsonb,
  '[]'::jsonb,
  'internal',
  true
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM credit_scores cs WHERE cs.user_id = u.id AND cs.is_current = true
)
LIMIT 10; 