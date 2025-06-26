-- Migration: Create loan calculator functionality

-- Create loan_calculations table
CREATE TABLE IF NOT EXISTS loan_calculations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_amount DECIMAL(12,2) NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL,
  term_months INTEGER NOT NULL,
  monthly_payment DECIMAL(12,2) NOT NULL,
  total_interest DECIMAL(12,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  loan_purpose TEXT NOT NULL DEFAULT 'personal',
  saved BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE loan_calculations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own loan calculations" ON loan_calculations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own loan calculations" ON loan_calculations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own loan calculations" ON loan_calculations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own loan calculations" ON loan_calculations
  FOR DELETE USING (auth.uid() = user_id);

-- Create calculate_loan_payment function
CREATE OR REPLACE FUNCTION calculate_loan_payment(
  principal DECIMAL,
  annual_rate DECIMAL,
  term_months INTEGER
)
RETURNS TABLE (
  monthly_payment DECIMAL,
  total_interest DECIMAL,
  total_amount DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  monthly_rate DECIMAL;
  payment DECIMAL;
  total_interest DECIMAL;
  total_amount DECIMAL;
BEGIN
  -- Convert annual rate to monthly rate
  monthly_rate := annual_rate / 100 / 12;
  
  -- Calculate monthly payment using the loan payment formula
  -- P = L[c(1 + c)^n]/[(1 + c)^n - 1]
  -- Where: P = monthly payment, L = loan amount, c = monthly interest rate, n = number of payments
  IF monthly_rate = 0 THEN
    -- Handle zero interest case
    payment := principal / term_months;
  ELSE
    payment := principal * (monthly_rate * POWER(1 + monthly_rate, term_months)) / 
               (POWER(1 + monthly_rate, term_months) - 1);
  END IF;
  
  -- Calculate total amount and interest
  total_amount := payment * term_months;
  total_interest := total_amount - principal;
  
  RETURN QUERY SELECT 
    ROUND(payment, 2),
    ROUND(total_interest, 2),
    ROUND(total_amount, 2);
END;
$$;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_loan_calculations_updated_at 
  BEFORE UPDATE ON loan_calculations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 