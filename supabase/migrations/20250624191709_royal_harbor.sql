/*
  # Update loan applications schema for enhanced form

  1. Schema Changes
    - Add new personal information fields (first_name, last_name, id_number, passport_number, gender, date_of_birth, place_of_residence, detailed_address)
    - Add contact and employment fields (phone_number, alternate_phone, work_type, monthly_income)
    - Add reference fields (reference1_first_name, reference1_last_name, reference1_phone, reference1_gender, reference1_relationship, reference2_first_name, reference2_last_name, reference2_phone, reference2_gender, reference2_relationship)
    - Add document upload fields (id_card_front_url, id_card_back_url, passport_url)
    - Update existing fields to match new structure
    - Remove old fields that are no longer needed

  2. Security
    - Maintain existing RLS policies
    - Add policies for file access if needed
*/

-- Add new columns to loan_applications table
DO $$
BEGIN
  -- Personal Information
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'first_name') THEN
    ALTER TABLE loan_applications ADD COLUMN first_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'last_name') THEN
    ALTER TABLE loan_applications ADD COLUMN last_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'id_number') THEN
    ALTER TABLE loan_applications ADD COLUMN id_number text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'passport_number') THEN
    ALTER TABLE loan_applications ADD COLUMN passport_number text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'gender') THEN
    ALTER TABLE loan_applications ADD COLUMN gender text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'date_of_birth') THEN
    ALTER TABLE loan_applications ADD COLUMN date_of_birth date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'place_of_residence') THEN
    ALTER TABLE loan_applications ADD COLUMN place_of_residence text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'detailed_address') THEN
    ALTER TABLE loan_applications ADD COLUMN detailed_address text;
  END IF;
  
  -- Contact Information
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'phone_number') THEN
    ALTER TABLE loan_applications ADD COLUMN phone_number text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'alternate_phone') THEN
    ALTER TABLE loan_applications ADD COLUMN alternate_phone text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'work_type') THEN
    ALTER TABLE loan_applications ADD COLUMN work_type text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'monthly_income') THEN
    ALTER TABLE loan_applications ADD COLUMN monthly_income numeric;
  END IF;
  
  -- References
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'reference1_first_name') THEN
    ALTER TABLE loan_applications ADD COLUMN reference1_first_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'reference1_last_name') THEN
    ALTER TABLE loan_applications ADD COLUMN reference1_last_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'reference1_phone') THEN
    ALTER TABLE loan_applications ADD COLUMN reference1_phone text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'reference1_gender') THEN
    ALTER TABLE loan_applications ADD COLUMN reference1_gender text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'reference1_relationship') THEN
    ALTER TABLE loan_applications ADD COLUMN reference1_relationship text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'reference2_first_name') THEN
    ALTER TABLE loan_applications ADD COLUMN reference2_first_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'reference2_last_name') THEN
    ALTER TABLE loan_applications ADD COLUMN reference2_last_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'reference2_phone') THEN
    ALTER TABLE loan_applications ADD COLUMN reference2_phone text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'reference2_gender') THEN
    ALTER TABLE loan_applications ADD COLUMN reference2_gender text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'reference2_relationship') THEN
    ALTER TABLE loan_applications ADD COLUMN reference2_relationship text;
  END IF;
  
  -- Document Uploads
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'id_card_front_url') THEN
    ALTER TABLE loan_applications ADD COLUMN id_card_front_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'id_card_back_url') THEN
    ALTER TABLE loan_applications ADD COLUMN id_card_back_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'passport_url') THEN
    ALTER TABLE loan_applications ADD COLUMN passport_url text;
  END IF;
  
  -- Update loan amount to match KES currency
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'loan_amount_kes') THEN
    ALTER TABLE loan_applications ADD COLUMN loan_amount_kes numeric;
  END IF;
  
  -- Add repayment period in days
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'repayment_period_days') THEN
    ALTER TABLE loan_applications ADD COLUMN repayment_period_days integer;
  END IF;
END $$;

-- Create storage bucket for document uploads if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('loan-documents', 'loan-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for storage
CREATE POLICY "Users can upload their own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'loan-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'loan-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'loan-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'loan-documents' AND auth.uid()::text = (storage.foldername(name))[1]);