-- Enhanced Application Features Migration
-- This migration adds missing features for loan applications, form handling, and enhanced referral system

-- =====================================================
-- ENHANCED LOAN APPLICATION FEATURES
-- =====================================================

-- Add missing columns to loan_applications if they don't exist
DO $$
BEGIN
  -- Add application_data JSONB column for storing form data
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'application_data') THEN
    ALTER TABLE loan_applications ADD COLUMN application_data JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  -- Add documents JSONB column for storing document references
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'documents') THEN
    ALTER TABLE loan_applications ADD COLUMN documents JSONB DEFAULT '[]'::jsonb;
  END IF;
  
  -- Add risk_assessment JSONB column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'risk_assessment') THEN
    ALTER TABLE loan_applications ADD COLUMN risk_assessment JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  -- Add approval_notes text column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'approval_notes') THEN
    ALTER TABLE loan_applications ADD COLUMN approval_notes TEXT;
  END IF;
  
  -- Add rejection_reason text column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'rejection_reason') THEN
    ALTER TABLE loan_applications ADD COLUMN rejection_reason TEXT;
  END IF;
  
  -- Add reviewed_by UUID column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'reviewed_by') THEN
    ALTER TABLE loan_applications ADD COLUMN reviewed_by UUID REFERENCES user_profiles(user_id);
  END IF;
  
  -- Add reviewed_at timestamp column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'reviewed_at') THEN
    ALTER TABLE loan_applications ADD COLUMN reviewed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create application_forms table for storing form templates and configurations
CREATE TABLE IF NOT EXISTS application_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  form_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation_rules JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES user_profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create application_submissions table for tracking form submissions
CREATE TABLE IF NOT EXISTS application_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES application_forms(id),
  user_id UUID REFERENCES user_profiles(user_id),
  submission_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES user_profiles(user_id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create document_uploads table for managing uploaded documents
CREATE TABLE IF NOT EXISTS document_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(user_id),
  loan_application_id UUID REFERENCES loan_applications(id),
  document_type VARCHAR(100) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  upload_status VARCHAR(50) DEFAULT 'pending' CHECK (upload_status IN ('pending', 'uploaded', 'verified', 'rejected')),
  verification_notes TEXT,
  verified_by UUID REFERENCES user_profiles(user_id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- ENHANCED REFERRAL SYSTEM
-- =====================================================

-- Add missing columns to referrals table
DO $$
BEGIN
  -- Add referral_tier for multi-level referrals
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'referral_tier') THEN
    ALTER TABLE referrals ADD COLUMN referral_tier INTEGER DEFAULT 1;
  END IF;
  
  -- Add commission_amount for tracking earnings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'commission_amount') THEN
    ALTER TABLE referrals ADD COLUMN commission_amount DECIMAL(10,2) DEFAULT 0.00;
  END IF;
  
  -- Add commission_paid flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'commission_paid') THEN
    ALTER TABLE referrals ADD COLUMN commission_paid BOOLEAN DEFAULT false;
  END IF;
  
  -- Add commission_paid_at timestamp
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'commission_paid_at') THEN
    ALTER TABLE referrals ADD COLUMN commission_paid_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create referral_earnings table for tracking commission payments
CREATE TABLE IF NOT EXISTS referral_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES user_profiles(user_id),
  referral_id UUID REFERENCES referrals(id),
  earning_type VARCHAR(50) DEFAULT 'commission' CHECK (earning_type IN ('commission', 'bonus', 'penalty')),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  payment_method VARCHAR(100),
  payment_reference TEXT,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- ENHANCED FUNCTIONS
-- =====================================================

-- Function to submit loan application with form data
CREATE OR REPLACE FUNCTION submit_loan_application(
  p_user_id UUID,
  p_amount DECIMAL,
  p_purpose TEXT,
  p_term_months INTEGER,
  p_application_data JSONB DEFAULT '{}'::jsonb,
  p_documents JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  application_id UUID;
  user_credit_score INTEGER;
BEGIN
  -- Get user's current credit score
  SELECT get_current_credit_score(p_user_id) INTO user_credit_score;
  
  -- Insert loan application
  INSERT INTO loan_applications (
    user_id,
    amount,
    purpose,
    term_months,
    application_data,
    documents,
    status,
    risk_assessment
  ) VALUES (
    p_user_id,
    p_amount,
    p_purpose,
    p_term_months,
    p_application_data,
    p_documents,
    'pending',
    jsonb_build_object(
      'credit_score', user_credit_score,
      'initial_assessment', 'pending',
      'risk_level', CASE 
        WHEN user_credit_score >= 750 THEN 'low'
        WHEN user_credit_score >= 650 THEN 'medium'
        ELSE 'high'
      END
    )
  ) RETURNING id INTO application_id;
  
  -- Create notification for user
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    priority,
    metadata
  ) VALUES (
    p_user_id,
    '📋 Application Submitted',
    'Your loan application for $' || p_amount || ' has been submitted and is under review.',
    'info',
    'medium',
    jsonb_build_object(
      'loan_application_id', application_id,
      'amount', p_amount,
      'purpose', p_purpose
    )
  );
  
  RETURN application_id;
END;
$$;

-- Function to process referral signup
CREATE OR REPLACE FUNCTION process_referral_signup(
  p_referral_code TEXT,
  p_referred_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  referrer_user_id UUID;
  referral_record_id UUID;
  commission_amount DECIMAL(10,2) := 25.00; -- Default commission
BEGIN
  -- Find the referrer
  SELECT user_id INTO referrer_user_id 
  FROM referral_codes 
  WHERE referral_code = p_referral_code 
    AND is_active = true 
    AND (expires_at IS NULL OR expires_at > now());
  
  IF referrer_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Create referral record
  INSERT INTO referrals (
    referrer_id,
    referred_user_id,
    referral_code,
    status,
    commission_amount
  ) VALUES (
    referrer_user_id,
    p_referred_user_id,
    p_referral_code,
    'pending',
    commission_amount
  ) RETURNING id INTO referral_record_id;
  
  -- Create earning record
  INSERT INTO referral_earnings (
    referrer_id,
    referral_id,
    earning_type,
    amount,
    status
  ) VALUES (
    referrer_user_id,
    referral_record_id,
    'commission',
    commission_amount,
    'pending'
  );
  
  -- Notify referrer
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    priority,
    metadata
  ) VALUES (
    referrer_user_id,
    '🎉 New Referral!',
    'Someone signed up using your referral code! You''ll earn $' || commission_amount || ' when they complete their first loan.',
    'success',
    'medium',
    jsonb_build_object(
      'referral_id', referral_record_id,
      'commission_amount', commission_amount,
      'referred_user_id', p_referred_user_id
    )
  );
  
  RETURN true;
END;
$$;

-- Function to get application form by name
CREATE OR REPLACE FUNCTION get_application_form(form_name TEXT)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  description TEXT,
  form_schema JSONB,
  validation_rules JSONB,
  version INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    af.id,
    af.name,
    af.description,
    af.form_schema,
    af.validation_rules,
    af.version
  FROM application_forms af
  WHERE af.name = form_name 
    AND af.is_active = true
  ORDER BY af.version DESC
  LIMIT 1;
END;
$$;

-- Function to get user's loan applications with details
CREATE OR REPLACE FUNCTION get_user_loan_applications(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  amount DECIMAL,
  purpose TEXT,
  term_months INTEGER,
  status VARCHAR,
  application_data JSONB,
  documents JSONB,
  risk_assessment JSONB,
  approval_notes TEXT,
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    la.id,
    la.amount,
    la.purpose,
    la.term_months,
    la.status,
    la.application_data,
    la.documents,
    la.risk_assessment,
    la.approval_notes,
    la.rejection_reason,
    la.reviewed_by,
    la.reviewed_at,
    la.created_at,
    la.updated_at
  FROM loan_applications la
  WHERE la.user_id = p_user_id
  ORDER BY la.created_at DESC;
END;
$$;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for application_forms
CREATE INDEX IF NOT EXISTS idx_application_forms_name ON application_forms(name);
CREATE INDEX IF NOT EXISTS idx_application_forms_active ON application_forms(is_active);

-- Indexes for application_submissions
CREATE INDEX IF NOT EXISTS idx_application_submissions_user_id ON application_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_application_submissions_form_id ON application_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_application_submissions_status ON application_submissions(status);

-- Indexes for document_uploads
CREATE INDEX IF NOT EXISTS idx_document_uploads_user_id ON document_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_document_uploads_loan_app_id ON document_uploads(loan_application_id);
CREATE INDEX IF NOT EXISTS idx_document_uploads_status ON document_uploads(upload_status);

-- Indexes for referral_earnings
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer_id ON referral_earnings(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referral_id ON referral_earnings(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_status ON referral_earnings(status);

-- Enhanced indexes for loan_applications
CREATE INDEX IF NOT EXISTS idx_loan_applications_reviewed_by ON loan_applications(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_loan_applications_reviewed_at ON loan_applications(reviewed_at);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE application_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;

-- Policies for application_forms
CREATE POLICY "Users can view active application forms" ON application_forms
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage application forms" ON application_forms
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Policies for application_submissions
CREATE POLICY "Users can view their own submissions" ON application_submissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own submissions" ON application_submissions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own draft submissions" ON application_submissions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'draft')
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all submissions" ON application_submissions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "Admins can update submissions" ON application_submissions
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Policies for document_uploads
CREATE POLICY "Users can view their own documents" ON document_uploads
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can upload their own documents" ON document_uploads
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all documents" ON document_uploads
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "Admins can update document verification" ON document_uploads
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Policies for referral_earnings
CREATE POLICY "Users can view their own earnings" ON referral_earnings
  FOR SELECT TO authenticated
  USING (referrer_id = auth.uid());

CREATE POLICY "Admins can view all earnings" ON referral_earnings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "Admins can manage earnings" ON referral_earnings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')));

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION submit_loan_application(UUID, DECIMAL, TEXT, INTEGER, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION process_referral_signup(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_application_form(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_loan_applications(UUID) TO authenticated;

GRANT EXECUTE ON FUNCTION submit_loan_application(UUID, DECIMAL, TEXT, INTEGER, JSONB, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION process_referral_signup(TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_application_form(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_loan_applications(UUID) TO service_role;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON application_forms TO authenticated;
GRANT SELECT, INSERT, UPDATE ON application_submissions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON document_uploads TO authenticated;
GRANT SELECT, INSERT, UPDATE ON referral_earnings TO authenticated;

GRANT ALL ON application_forms TO service_role;
GRANT ALL ON application_submissions TO service_role;
GRANT ALL ON document_uploads TO service_role;
GRANT ALL ON referral_earnings TO service_role;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update triggers for new tables
CREATE TRIGGER update_application_forms_updated_at
  BEFORE UPDATE ON application_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_application_submissions_updated_at
  BEFORE UPDATE ON application_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_uploads_updated_at
  BEFORE UPDATE ON document_uploads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referral_earnings_updated_at
  BEFORE UPDATE ON referral_earnings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Enhanced application features migration completed successfully!';
  RAISE NOTICE 'Added tables:';
  RAISE NOTICE '- application_forms';
  RAISE NOTICE '- application_submissions';
  RAISE NOTICE '- document_uploads';
  RAISE NOTICE '- referral_earnings';
  RAISE NOTICE 'Enhanced loan_applications table with additional columns';
  RAISE NOTICE 'Enhanced referrals table with commission tracking';
  RAISE NOTICE 'Added functions:';
  RAISE NOTICE '- submit_loan_application()';
  RAISE NOTICE '- process_referral_signup()';
  RAISE NOTICE '- get_application_form()';
  RAISE NOTICE '- get_user_loan_applications()';
END $$;