/*
  # Payment Center, Credit Score, and Calculator Features

  1. New Tables
    - `payments` - Track loan payments and transactions
    - `credit_scores` - Store user credit score history
    - `loan_calculations` - Save loan calculator results
    - `support_tickets` - Expert support system
    - `payment_schedules` - Automated payment schedules

  2. Security
    - Enable RLS on all new tables
    - Add policies for user data access
    - Admin policies for management

  3. Functions
    - Payment processing functions
    - Credit score calculation
    - Loan calculation utilities
    - Support ticket management
*/

-- =============================================
-- PAYMENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  loan_application_id uuid REFERENCES loan_applications(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_type text NOT NULL DEFAULT 'loan_payment',
  payment_method text NOT NULL DEFAULT 'mpesa',
  transaction_id text UNIQUE,
  mpesa_receipt_number text,
  status text NOT NULL DEFAULT 'pending',
  scheduled_date date,
  paid_date timestamptz,
  due_date date,
  late_fee numeric DEFAULT 0,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_payment_types CHECK (payment_type = ANY (ARRAY['loan_payment'::text, 'late_fee'::text, 'processing_fee'::text, 'insurance'::text])),
  CONSTRAINT valid_payment_methods CHECK (payment_method = ANY (ARRAY['mpesa'::text, 'bank_transfer'::text, 'cash'::text, 'card'::text])),
  CONSTRAINT valid_payment_status CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'refunded'::text]))
);

-- =============================================
-- CREDIT SCORES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS credit_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  score integer NOT NULL CHECK (score >= 300 AND score <= 850),
  score_band text NOT NULL,
  factors jsonb DEFAULT '{}',
  recommendations jsonb DEFAULT '{}',
  bureau_source text DEFAULT 'internal',
  calculated_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_current boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  CONSTRAINT valid_score_bands CHECK (score_band = ANY (ARRAY['poor'::text, 'fair'::text, 'good'::text, 'very_good'::text, 'excellent'::text]))
);

-- =============================================
-- LOAN CALCULATIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS loan_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_amount numeric NOT NULL CHECK (loan_amount > 0),
  interest_rate numeric NOT NULL CHECK (interest_rate >= 0),
  term_months integer NOT NULL CHECK (term_months > 0),
  monthly_payment numeric NOT NULL,
  total_interest numeric NOT NULL,
  total_amount numeric NOT NULL,
  loan_purpose text,
  calculation_type text DEFAULT 'standard',
  saved boolean DEFAULT false,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_calculation_types CHECK (calculation_type = ANY (ARRAY['standard'::text, 'compound'::text, 'simple'::text, 'reducing_balance'::text]))
);

-- =============================================
-- SUPPORT TICKETS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ticket_number text UNIQUE NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid REFERENCES auth.users(id),
  resolution text,
  satisfaction_rating integer CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  tags text[] DEFAULT '{}',
  attachments jsonb DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT valid_categories CHECK (category = ANY (ARRAY['general'::text, 'loan_application'::text, 'payments'::text, 'technical'::text, 'account'::text, 'complaint'::text])),
  CONSTRAINT valid_priorities CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])),
  CONSTRAINT valid_status CHECK (status = ANY (ARRAY['open'::text, 'in_progress'::text, 'waiting_customer'::text, 'resolved'::text, 'closed'::text]))
);

-- =============================================
-- PAYMENT SCHEDULES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS payment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  loan_application_id uuid REFERENCES loan_applications(id) ON DELETE CASCADE NOT NULL,
  schedule_type text NOT NULL DEFAULT 'monthly',
  amount numeric NOT NULL CHECK (amount > 0),
  start_date date NOT NULL,
  end_date date NOT NULL,
  frequency_days integer NOT NULL DEFAULT 30,
  auto_debit boolean DEFAULT false,
  mpesa_number text,
  is_active boolean DEFAULT true,
  next_payment_date date,
  total_payments integer,
  completed_payments integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_schedule_types CHECK (schedule_type = ANY (ARRAY['weekly'::text, 'bi_weekly'::text, 'monthly'::text, 'quarterly'::text]))
);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CREATE INDEXES
-- =============================================

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_loan_application_id ON payments(loan_application_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);

-- Credit scores indexes
CREATE INDEX IF NOT EXISTS idx_credit_scores_user_id ON credit_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_scores_current ON credit_scores(user_id, is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_credit_scores_calculated_at ON credit_scores(calculated_at);

-- Loan calculations indexes
CREATE INDEX IF NOT EXISTS idx_loan_calculations_user_id ON loan_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_calculations_saved ON loan_calculations(user_id, saved) WHERE saved = true;
CREATE INDEX IF NOT EXISTS idx_loan_calculations_created_at ON loan_calculations(created_at);

-- Support tickets indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_number ON support_tickets(ticket_number);

-- Payment schedules indexes
CREATE INDEX IF NOT EXISTS idx_payment_schedules_user_id ON payment_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_loan_id ON payment_schedules(loan_application_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_next_payment ON payment_schedules(next_payment_date) WHERE is_active = true;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Payments policies
CREATE POLICY "Users can view their own payments"
  ON payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments"
  ON payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage all payments"
  ON payments FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

-- Credit scores policies
CREATE POLICY "Users can view their own credit scores"
  ON credit_scores FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all credit scores"
  ON credit_scores FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage credit scores"
  ON credit_scores FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

-- Loan calculations policies
CREATE POLICY "Users can manage their own calculations"
  ON loan_calculations FOR ALL TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all calculations"
  ON loan_calculations FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- Support tickets policies
CREATE POLICY "Users can view their own tickets"
  ON support_tickets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tickets"
  ON support_tickets FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets"
  ON support_tickets FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage all tickets"
  ON support_tickets FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

-- Payment schedules policies
CREATE POLICY "Users can view their own schedules"
  ON payment_schedules FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own schedules"
  ON payment_schedules FOR ALL TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all schedules"
  ON payment_schedules FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage all schedules"
  ON payment_schedules FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to calculate loan payment
CREATE OR REPLACE FUNCTION calculate_loan_payment(
  principal numeric,
  annual_rate numeric,
  term_months integer
)
RETURNS TABLE(
  monthly_payment numeric,
  total_interest numeric,
  total_amount numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
  monthly_rate numeric;
  payment numeric;
  total numeric;
  interest numeric;
BEGIN
  -- Convert annual rate to monthly rate
  monthly_rate := annual_rate / 100 / 12;
  
  -- Calculate monthly payment using standard loan formula
  IF monthly_rate = 0 THEN
    payment := principal / term_months;
  ELSE
    payment := principal * (monthly_rate * POWER(1 + monthly_rate, term_months)) / 
               (POWER(1 + monthly_rate, term_months) - 1);
  END IF;
  
  total := payment * term_months;
  interest := total - principal;
  
  RETURN QUERY SELECT payment, interest, total;
END;
$$;

-- Function to get user's current credit score
CREATE OR REPLACE FUNCTION get_current_credit_score(check_user_id uuid)
RETURNS TABLE(
  score integer,
  score_band text,
  calculated_at timestamptz,
  factors jsonb,
  recommendations jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.score,
    cs.score_band,
    cs.calculated_at,
    cs.factors,
    cs.recommendations
  FROM credit_scores cs
  WHERE cs.user_id = check_user_id 
    AND cs.is_current = true
  ORDER BY cs.calculated_at DESC
  LIMIT 1;
END;
$$;

-- Function to calculate credit score based on user data
CREATE OR REPLACE FUNCTION calculate_credit_score(check_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_score integer := 650;
  loan_count integer;
  approved_loans integer;
  payment_history numeric;
  calculated_score integer;
BEGIN
  -- Get loan statistics
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'approved')
  INTO loan_count, approved_loans
  FROM loan_applications
  WHERE user_id = check_user_id;
  
  -- Get payment history (if any payments exist)
  SELECT COALESCE(
    (COUNT(*) FILTER (WHERE status = 'completed')::numeric / NULLIF(COUNT(*), 0)) * 100,
    100
  )
  INTO payment_history
  FROM payments
  WHERE user_id = check_user_id;
  
  -- Calculate score based on factors
  calculated_score := base_score;
  
  -- Adjust for loan history
  IF approved_loans > 0 THEN
    calculated_score := calculated_score + (approved_loans * 20);
  END IF;
  
  -- Adjust for payment history
  calculated_score := calculated_score + ((payment_history - 50) * 2)::integer;
  
  -- Ensure score is within valid range
  calculated_score := GREATEST(300, LEAST(850, calculated_score));
  
  RETURN calculated_score;
END;
$$;

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  ticket_num text;
  counter integer;
BEGIN
  -- Get today's count
  SELECT COUNT(*) + 1
  INTO counter
  FROM support_tickets
  WHERE DATE(created_at) = CURRENT_DATE;
  
  -- Generate ticket number: YYYYMMDD-XXX
  ticket_num := TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::text, 3, '0');
  
  RETURN ticket_num;
END;
$$;

-- Function to create support ticket
CREATE OR REPLACE FUNCTION create_support_ticket(
  ticket_subject text,
  ticket_description text,
  ticket_category text,
  ticket_priority text DEFAULT 'medium'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ticket_id uuid;
  ticket_num text;
BEGIN
  ticket_num := generate_ticket_number();
  
  INSERT INTO support_tickets (
    user_id,
    ticket_number,
    subject,
    description,
    category,
    priority
  ) VALUES (
    auth.uid(),
    ticket_num,
    ticket_subject,
    ticket_description,
    ticket_category,
    ticket_priority
  ) RETURNING id INTO ticket_id;
  
  RETURN ticket_id;
END;
$$;

-- Function to get user payment summary
CREATE OR REPLACE FUNCTION get_user_payment_summary(check_user_id uuid)
RETURNS TABLE(
  total_payments numeric,
  completed_payments bigint,
  pending_payments bigint,
  overdue_payments bigint,
  next_payment_date date,
  next_payment_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) as total_payments,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_payments,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_payments,
    COUNT(*) FILTER (WHERE status = 'pending' AND due_date < CURRENT_DATE) as overdue_payments,
    MIN(due_date) FILTER (WHERE status = 'pending' AND due_date >= CURRENT_DATE) as next_payment_date,
    MIN(amount) FILTER (WHERE status = 'pending' AND due_date >= CURRENT_DATE) as next_payment_amount
  FROM payments
  WHERE user_id = check_user_id;
END;
$$;

-- =============================================
-- TRIGGERS
-- =============================================

-- Updated at trigger for payments
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Updated at trigger for support tickets
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Updated at trigger for payment schedules
CREATE TRIGGER update_payment_schedules_updated_at
  BEFORE UPDATE ON payment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SAMPLE DATA (for development)
-- =============================================

-- Insert sample credit score factors and recommendations
INSERT INTO credit_scores (user_id, score, score_band, factors, recommendations, bureau_source, is_current)
SELECT 
  NULL as user_id, -- Will be updated when users exist
  700 as score,
  'good' as score_band,
  '{
    "payment_history": 85,
    "credit_utilization": 30,
    "length_of_history": 60,
    "credit_mix": 70,
    "new_credit": 80
  }'::jsonb as factors,
  '{
    "improve_payment_history": "Make all payments on time to improve your score",
    "reduce_utilization": "Keep credit utilization below 30%",
    "maintain_accounts": "Keep old accounts open to maintain credit history length"
  }'::jsonb as recommendations,
  'internal' as bureau_source,
  false as is_current
WHERE FALSE; -- Don't actually insert, just show structure

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Payment Center, Credit Score, and Calculator features migration completed at %', now();
  RAISE NOTICE 'Created tables: payments, credit_scores, loan_calculations, support_tickets, payment_schedules';
  RAISE NOTICE 'Created functions for loan calculations, credit scoring, and support tickets';
  RAISE NOTICE 'All tables have RLS enabled with appropriate policies';
END $$;