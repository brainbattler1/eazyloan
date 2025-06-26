/*
  # Create loan applications table

  1. New Tables
    - `loan_applications`
      - `id` (uuid, primary key)
      - `created_at` (timestamp with timezone)
      - `user_id` (uuid, foreign key to auth.users)
      - `user_email` (text, not null)
      - `user_name` (text, nullable)
      - `amount` (numeric, not null)
      - `purpose` (text, not null)
      - `term_months` (integer, not null)
      - `annual_income` (numeric, not null)
      - `employment_status` (text, not null)
      - `credit_score` (integer, nullable)
      - `status` (text, default 'pending', with check constraint)

  2. Security
    - Enable RLS on `loan_applications` table
    - Add policy for users to view their own applications
    - Add policy for users to insert their own applications

  3. Extensions
    - Ensure uuid-ossp extension is enabled for UUID generation
*/

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the loan_applications table
CREATE TABLE IF NOT EXISTS public.loan_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  amount NUMERIC NOT NULL,
  purpose TEXT NOT NULL,
  term_months INTEGER NOT NULL,
  annual_income NUMERIC NOT NULL,
  employment_status TEXT NOT NULL,
  credit_score INTEGER,
  status TEXT DEFAULT 'pending' NOT NULL,
  CONSTRAINT chk_status CHECK (status IN ('pending', 'under_review', 'approved', 'rejected'))
);

-- Enable Row Level Security
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own loan applications
CREATE POLICY "Users can view their own loan applications"
  ON public.loan_applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own loan applications
CREATE POLICY "Users can insert their own loan applications"
  ON public.loan_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);