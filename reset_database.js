const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection string
const connectionString = 'postgres://postgres.mcrprryvezyngslphjwx:M1247N3117k%23@aws-0-ca-central-1.pooler.supabase.com:5432/postgres';

async function resetDatabase() {
  const client = new Client({ connectionString });
  
  try {
    console.log('🔌 Connecting to Supabase database...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Step 1: Drop all existing tables and functions
    console.log('\n🗑️  Dropping all existing tables and functions...');
    
    const dropAllSQL = `
      -- Drop all triggers first
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
      DROP TRIGGER IF EXISTS trigger_set_application_number ON loan_applications CASCADE;
      
      -- Drop all functions
      DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
      DROP FUNCTION IF EXISTS is_admin(uuid) CASCADE;
      DROP FUNCTION IF EXISTS get_user_role(uuid) CASCADE;
      DROP FUNCTION IF EXISTS user_exists(uuid) CASCADE;
      DROP FUNCTION IF EXISTS generate_application_number() CASCADE;
      DROP FUNCTION IF EXISTS set_application_number() CASCADE;
      DROP FUNCTION IF EXISTS get_application_summary(uuid) CASCADE;
      DROP FUNCTION IF EXISTS mark_pdf_generated(uuid, text) CASCADE;
      DROP FUNCTION IF EXISTS create_support_ticket(text, text, text) CASCADE;
      DROP FUNCTION IF EXISTS create_loan_calculation(numeric, integer, numeric, text) CASCADE;
      DROP FUNCTION IF EXISTS get_credit_score(uuid) CASCADE;
      DROP FUNCTION IF EXISTS calculate_credit_score(uuid) CASCADE;
      DROP FUNCTION IF EXISTS setup_2fa(uuid, text, text) CASCADE;
      DROP FUNCTION IF EXISTS verify_2fa(uuid, text) CASCADE;
      DROP FUNCTION IF EXISTS disable_2fa(uuid) CASCADE;
      DROP FUNCTION IF EXISTS get_2fa_status(uuid) CASCADE;
      DROP FUNCTION IF EXISTS generate_backup_codes(uuid) CASCADE;
      DROP FUNCTION IF EXISTS verify_backup_code(uuid, text) CASCADE;
      DROP FUNCTION IF EXISTS check_notification_admin(uuid) CASCADE;
      DROP FUNCTION IF EXISTS check_notification_super_admin(uuid) CASCADE;
      DROP FUNCTION IF EXISTS generate_secure_token() CASCADE;
      DROP FUNCTION IF EXISTS create_password_reset_token(uuid) CASCADE;
      DROP FUNCTION IF EXISTS verify_password_reset_token(text) CASCADE;
      DROP FUNCTION IF EXISTS mark_password_reset_token_used(text) CASCADE;
      DROP FUNCTION IF EXISTS create_email_confirmation_token(uuid) CASCADE;
      DROP FUNCTION IF EXISTS verify_email_confirmation_token(text) CASCADE;
      DROP FUNCTION IF EXISTS mark_email_confirmation_token_used(text) CASCADE;
      DROP FUNCTION IF EXISTS cleanup_expired_tokens() CASCADE;
      
      -- Drop all tables (in reverse dependency order)
      DROP TABLE IF EXISTS user_mfa_factors CASCADE;
      DROP TABLE IF EXISTS user_mfa_backup_codes CASCADE;
      DROP TABLE IF EXISTS notification_preferences CASCADE;
      DROP TABLE IF EXISTS notifications CASCADE;
      DROP TABLE IF EXISTS loan_calculations CASCADE;
      DROP TABLE IF EXISTS credit_scores CASCADE;
      DROP TABLE IF EXISTS support_tickets CASCADE;
      DROP TABLE IF EXISTS admin_actions CASCADE;
      DROP TABLE IF EXISTS user_roles CASCADE;
      DROP TABLE IF EXISTS user_profiles CASCADE;
      DROP TABLE IF EXISTS loan_applications CASCADE;
      DROP TABLE IF EXISTS maintenance_mode CASCADE;
      DROP TABLE IF EXISTS referral_codes CASCADE;
      DROP TABLE IF EXISTS referral_signups CASCADE;
      DROP TABLE IF EXISTS password_reset_tokens CASCADE;
      DROP TABLE IF EXISTS email_confirmation_tokens CASCADE;
      
      -- Drop sequences
      DROP SEQUENCE IF EXISTS application_number_seq CASCADE;
      DROP SEQUENCE IF EXISTS app_seq_2025 CASCADE;
      
      -- Clean up any remaining policies
      DO $$
      DECLARE
          r RECORD;
      BEGIN
          FOR r IN (SELECT schemaname, tablename, policyname 
                    FROM pg_policies 
                    WHERE schemaname = 'public') 
          LOOP
              EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename);
          END LOOP;
      END $$;
    `;
    
    await client.query(dropAllSQL);
    console.log('✅ Dropped all existing objects');
    
    // Step 2: Create fresh authentication system
    console.log('\n🔄 Creating fresh authentication system...');
    
    const createAuthSQL = `
      -- Create user_profiles table
      CREATE TABLE user_profiles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        first_name text NOT NULL DEFAULT '',
        last_name text NOT NULL DEFAULT '',
        middle_name text,
        username text UNIQUE NOT NULL,
        phone_number text,
        date_of_birth date,
        address text,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      -- Create user_roles table
      CREATE TABLE user_roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        role text NOT NULL DEFAULT 'user',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        CONSTRAINT valid_roles CHECK (role IN ('user', 'admin', 'super_admin'))
      );

      -- Create loan_applications table
      CREATE TABLE loan_applications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
        user_email text NOT NULL,
        user_name text,
        amount numeric NOT NULL,
        loan_amount_kes numeric,
        purpose text NOT NULL,
        term_months integer NOT NULL,
        repayment_period_days integer,
        monthly_income numeric,
        employment_status text NOT NULL,
        work_type text,
        credit_score integer,
        interest_rate numeric DEFAULT 15.0,
        status text DEFAULT 'pending' NOT NULL,
        admin_notes text,
        rejection_reason text,
        approval_date timestamptz,
        first_name text,
        last_name text,
        id_number text,
        passport_number text,
        gender text,
        date_of_birth date,
        place_of_residence text,
        detailed_address text,
        employer_name text,
        employer_address text,
        phone_number text,
        alternate_phone text,
        reference1_first_name text,
        reference1_last_name text,
        reference1_phone text,
        reference1_gender text,
        reference1_relationship text,
        reference2_first_name text,
        reference2_last_name text,
        reference2_phone text,
        reference2_gender text,
        reference2_relationship text,
        id_card_front_url text,
        id_card_back_url text,
        passport_url text,
        pdf_generated boolean DEFAULT false,
        pdf_url text,
        pdf_generated_at timestamptz,
        application_number text UNIQUE,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        CONSTRAINT chk_status CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'cancelled')),
        CONSTRAINT chk_gender CHECK (gender IN ('male', 'female', 'other') OR gender IS NULL),
        CONSTRAINT chk_reference_gender CHECK (
          (reference1_gender IN ('male', 'female', 'other') OR reference1_gender IS NULL) AND
          (reference2_gender IN ('male', 'female', 'other') OR reference2_gender IS NULL)
        )
      );

      -- Create admin_actions table
      CREATE TABLE admin_actions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
        action_type text NOT NULL,
        target_type text NOT NULL,
        target_id uuid,
        details jsonb,
        created_at timestamptz DEFAULT now(),
        CONSTRAINT valid_action_types CHECK (action_type IN ('status_update', 'role_assignment', 'user_creation', 'loan_approval', 'loan_rejection', 'system_config', 'user_activation', 'user_deactivation', 'user_ban', 'user_unban')),
        CONSTRAINT valid_target_types CHECK (target_type IN ('loan_application', 'user', 'system', 'role'))
      );

      -- Create basic functions
      CREATE OR REPLACE FUNCTION is_admin(check_user_id uuid)
      RETURNS boolean
      LANGUAGE sql
      SECURITY DEFINER
      STABLE
      AS $$
        SELECT EXISTS (
          SELECT 1 FROM user_roles 
          WHERE user_id = check_user_id 
          AND role IN ('admin', 'super_admin')
        );
      $$;

      CREATE OR REPLACE FUNCTION get_user_role(check_user_id uuid)
      RETURNS text
      LANGUAGE sql
      SECURITY DEFINER
      STABLE
      AS $$
        SELECT COALESCE(
          (SELECT role FROM user_roles WHERE user_id = check_user_id LIMIT 1),
          'user'::text
        );
      $$;

      CREATE OR REPLACE FUNCTION generate_application_number()
      RETURNS text
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        year_part text;
        sequence_part text;
        app_number text;
        max_attempts integer := 10;
        attempt_count integer := 0;
      BEGIN
        year_part := EXTRACT(YEAR FROM NOW())::text;
        
        LOOP
          attempt_count := attempt_count + 1;
          
          SELECT LPAD(
            COALESCE(
              (SELECT MAX(CAST(SUBSTRING(application_number FROM 9) AS INTEGER)) + 1
               FROM loan_applications 
               WHERE application_number LIKE 'LA-' || year_part || '-%'),
              1
            )::text, 
            6, '0'
          )
          INTO sequence_part;
          
          app_number := 'LA-' || year_part || '-' || sequence_part;
          
          IF NOT EXISTS (SELECT 1 FROM loan_applications WHERE application_number = app_number) THEN
            RETURN app_number;
          END IF;
          
          IF attempt_count >= max_attempts THEN
            app_number := app_number || '-' || LPAD((RANDOM() * 999)::INTEGER::TEXT, 3, '0');
            EXIT;
          END IF;
        END LOOP;
        
        RETURN app_number;
      END;
      $$;

      CREATE OR REPLACE FUNCTION set_application_number()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        IF NEW.application_number IS NULL THEN
          NEW.application_number := generate_application_number();
        END IF;
        NEW.updated_at := NOW();
        RETURN NEW;
      END;
      $$;

      -- Create user creation trigger function
      CREATE OR REPLACE FUNCTION handle_new_user()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        INSERT INTO user_profiles (user_id, first_name, last_name, username)
        VALUES (
          NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
          COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
          COALESCE(NEW.raw_user_meta_data->>'username', NEW.email)
        )
        ON CONFLICT (user_id) DO NOTHING;

        INSERT INTO user_roles (user_id, role)
        VALUES (NEW.id, 'user')
        ON CONFLICT (user_id) DO NOTHING;

        RETURN NEW;
      END;
      $$;

      -- Create triggers
      CREATE TRIGGER trigger_set_application_number
        BEFORE INSERT OR UPDATE ON loan_applications
        FOR EACH ROW
        EXECUTE FUNCTION set_application_number();

      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION handle_new_user();

      -- Enable RLS
      ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;
      ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

      -- Create policies
      CREATE POLICY "Users can view their own profile" ON user_profiles
        FOR SELECT USING (auth.uid() = user_id);

      CREATE POLICY "Users can update their own profile" ON user_profiles
        FOR UPDATE USING (auth.uid() = user_id);

      CREATE POLICY "Users can view their own role" ON user_roles
        FOR SELECT USING (auth.uid() = user_id);

      CREATE POLICY "Admins can view all roles" ON user_roles
        FOR SELECT USING (is_admin(auth.uid()));

      CREATE POLICY "Admins can update roles" ON user_roles
        FOR UPDATE USING (is_admin(auth.uid()));

      CREATE POLICY "Users can view their own loan applications" ON loan_applications
        FOR SELECT USING (auth.uid() = user_id);

      CREATE POLICY "Users can create their own loan applications" ON loan_applications
        FOR INSERT WITH CHECK (auth.uid() = user_id);

      CREATE POLICY "Users can update their own loan applications" ON loan_applications
        FOR UPDATE USING (auth.uid() = user_id);

      CREATE POLICY "Admins can view all loan applications" ON loan_applications
        FOR SELECT USING (is_admin(auth.uid()));

      CREATE POLICY "Admins can update all loan applications" ON loan_applications
        FOR UPDATE USING (is_admin(auth.uid()));

      CREATE POLICY "Admins can view admin actions" ON admin_actions
        FOR SELECT USING (is_admin(auth.uid()));

      CREATE POLICY "Admins can create admin actions" ON admin_actions
        FOR INSERT WITH CHECK (is_admin(auth.uid()));

      -- Grant permissions
      GRANT USAGE ON SCHEMA public TO authenticated;
      GRANT ALL ON user_profiles TO authenticated;
      GRANT ALL ON user_roles TO authenticated;
      GRANT ALL ON loan_applications TO authenticated;
      GRANT ALL ON admin_actions TO authenticated;
      GRANT EXECUTE ON FUNCTION is_admin(uuid) TO authenticated;
      GRANT EXECUTE ON FUNCTION get_user_role(uuid) TO authenticated;
      GRANT EXECUTE ON FUNCTION generate_application_number() TO authenticated;
      GRANT EXECUTE ON FUNCTION set_application_number() TO authenticated;
      GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;

      -- Create indexes
      CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
      CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
      CREATE INDEX idx_loan_applications_user_id ON loan_applications(user_id);
      CREATE INDEX idx_loan_applications_status ON loan_applications(status);
      CREATE INDEX idx_admin_actions_admin_id ON admin_actions(admin_id);
      CREATE INDEX idx_admin_actions_created_at ON admin_actions(created_at);
    `;
    
    await client.query(createAuthSQL);
    console.log('✅ Created fresh authentication system');
    
    console.log('\n🎉 Database reset completed successfully!');
    console.log('✅ Fresh authentication system is ready');
    console.log('✅ User signup should now work properly');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the database reset
resetDatabase().catch(console.error); 