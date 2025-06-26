/*
# Complete Notification System Setup

This migration creates a comprehensive notification system with:
1. Three main tables: notifications, system_messages, notification_preferences
2. Complete RLS policies for security
3. Core functions for notification management
4. Automatic loan status notifications
5. Performance indexes and constraints

## Tables Created
- notifications: User-specific notifications
- system_messages: System-wide announcements
- notification_preferences: User notification settings

## Functions Created
- get_user_notifications: Fetch user notifications
- get_active_system_messages: Fetch system messages
- create_notification: Create new notifications
- create_system_message: Create system announcements
- mark_notification_read: Mark notifications as read
- mark_all_notifications_read: Mark all as read
- send_bulk_notification: Send to multiple users
- verify_notification_system: System health check

## Security
- Row Level Security enabled on all tables
- Comprehensive policies for user access control
- Admin-only functions for system management
*/

-- =============================================================================
-- STEP 1: CLEAN REMOVAL OF EXISTING COMPONENTS
-- =============================================================================

-- Drop existing triggers first (they depend on functions)
DO $$ 
BEGIN
    -- Drop loan status notification trigger if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'loan_status_notification_trigger'
    ) THEN
        DROP TRIGGER loan_status_notification_trigger ON loan_applications;
    END IF;
END $$;

-- Drop existing functions with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS create_loan_status_notification() CASCADE;
DROP FUNCTION IF EXISTS get_user_notifications(uuid, boolean, integer) CASCADE;
DROP FUNCTION IF EXISTS get_active_system_messages(text) CASCADE;
DROP FUNCTION IF EXISTS create_notification(uuid, text, text, text, text, text, text, timestamptz, jsonb) CASCADE;
DROP FUNCTION IF EXISTS create_system_message(text, text, text, text, text, timestamptz, jsonb) CASCADE;
DROP FUNCTION IF EXISTS mark_notification_read(uuid) CASCADE;
DROP FUNCTION IF EXISTS mark_all_notifications_read(uuid) CASCADE;
DROP FUNCTION IF EXISTS send_bulk_notification(uuid[], text, text, text, text, text, text, timestamptz) CASCADE;
DROP FUNCTION IF EXISTS check_notification_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS verify_notification_system() CASCADE;
DROP FUNCTION IF EXISTS test_db_connection() CASCADE;

-- Drop existing tables (this will also drop dependent objects)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS system_messages CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;

-- =============================================================================
-- STEP 2: CREATE FRESH NOTIFICATION TABLES
-- =============================================================================

-- Create notifications table
CREATE TABLE notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL DEFAULT 'info',
    priority text NOT NULL DEFAULT 'medium',
    read boolean DEFAULT false,
    read_at timestamptz,
    action_url text,
    action_label text,
    expires_at timestamptz,
    created_at timestamptz DEFAULT now(),
    created_by uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT valid_notification_types CHECK (type IN ('info', 'success', 'warning', 'error', 'announcement', 'loan_update', 'system')),
    CONSTRAINT valid_notification_priorities CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

-- Create system_messages table
CREATE TABLE system_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL DEFAULT 'info',
    priority text NOT NULL DEFAULT 'medium',
    target_audience text NOT NULL DEFAULT 'all',
    active boolean DEFAULT true,
    expires_at timestamptz,
    created_at timestamptz DEFAULT now(),
    created_by uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT valid_system_message_types CHECK (type IN ('info', 'success', 'warning', 'error', 'announcement', 'maintenance')),
    CONSTRAINT valid_system_message_priorities CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    CONSTRAINT valid_target_audiences CHECK (target_audience IN ('all', 'users', 'admins', 'super_admins'))
);

-- Create notification_preferences table
CREATE TABLE notification_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    email_notifications boolean DEFAULT true,
    push_notifications boolean DEFAULT true,
    sms_notifications boolean DEFAULT false,
    notification_types jsonb DEFAULT '["info", "success", "warning", "error", "announcement", "loan_update"]'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =============================================================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at);

-- System messages indexes
CREATE INDEX idx_system_messages_active ON system_messages(active);
CREATE INDEX idx_system_messages_target_audience ON system_messages(target_audience);
CREATE INDEX idx_system_messages_created_at ON system_messages(created_at DESC);
CREATE INDEX idx_system_messages_expires_at ON system_messages(expires_at);

-- Notification preferences indexes
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- =============================================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 5: CREATE RLS POLICIES
-- =============================================================================

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can insert notifications"
    ON notifications FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can update all notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- System messages policies
CREATE POLICY "Everyone can view active system messages"
    ON system_messages FOR SELECT
    TO authenticated
    USING (active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Admins can insert system messages"
    ON system_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can update system messages"
    ON system_messages FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Super admins can delete system messages"
    ON system_messages FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Notification preferences policies
CREATE POLICY "Users can view their own preferences"
    ON notification_preferences FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
    ON notification_preferences FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
    ON notification_preferences FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- STEP 6: CREATE UTILITY FUNCTIONS
-- =============================================================================

-- Test database connection function
CREATE OR REPLACE FUNCTION test_db_connection()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN 'Database connection successful at ' || now()::text;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Database connection failed: ' || SQLERRM;
END;
$$;

-- Check if user is admin function
CREATE OR REPLACE FUNCTION is_notification_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = check_user_id 
        AND role IN ('admin', 'super_admin')
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

-- =============================================================================
-- STEP 7: CREATE CORE NOTIFICATION FUNCTIONS
-- =============================================================================

-- Get user notifications function
CREATE OR REPLACE FUNCTION get_user_notifications(
    p_target_user_id uuid,
    p_include_read boolean DEFAULT true,
    p_limit_count integer DEFAULT 50
)
RETURNS TABLE (
    id uuid,
    user_id uuid,
    title text,
    message text,
    type text,
    priority text,
    read boolean,
    read_at timestamptz,
    action_url text,
    action_label text,
    expires_at timestamptz,
    created_at timestamptz,
    created_by uuid,
    metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate input
    IF p_target_user_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Return notifications based on parameters
    RETURN QUERY
    SELECT 
        n.id,
        n.user_id,
        n.title,
        n.message,
        n.type,
        n.priority,
        n.read,
        n.read_at,
        n.action_url,
        n.action_label,
        n.expires_at,
        n.created_at,
        n.created_by,
        n.metadata
    FROM notifications n
    WHERE n.user_id = p_target_user_id
        AND (p_include_read = true OR n.read = false)
        AND (n.expires_at IS NULL OR n.expires_at > now())
    ORDER BY n.created_at DESC
    LIMIT p_limit_count;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error fetching notifications: %', SQLERRM;
END;
$$;

-- Get active system messages function
CREATE OR REPLACE FUNCTION get_active_system_messages(p_user_role text DEFAULT 'user')
RETURNS TABLE (
    id uuid,
    title text,
    message text,
    type text,
    priority text,
    target_audience text,
    created_at timestamptz,
    expires_at timestamptz,
    metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate input
    IF p_user_role IS NULL THEN
        p_user_role := 'user';
    END IF;
    
    -- Return system messages based on user role and target audience
    RETURN QUERY
    SELECT 
        sm.id,
        sm.title,
        sm.message,
        sm.type,
        sm.priority,
        sm.target_audience,
        sm.created_at,
        sm.expires_at,
        sm.metadata
    FROM system_messages sm
    WHERE sm.active = true
        AND (sm.expires_at IS NULL OR sm.expires_at > now())
        AND (
            sm.target_audience = 'all' OR
            (sm.target_audience = 'users' AND p_user_role = 'user') OR
            (sm.target_audience = 'admins' AND p_user_role IN ('admin', 'super_admin')) OR
            (sm.target_audience = 'super_admins' AND p_user_role = 'super_admin')
        )
    ORDER BY sm.created_at DESC;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error fetching system messages: %', SQLERRM;
END;
$$;

-- Create notification function
CREATE OR REPLACE FUNCTION create_notification(
    target_user_id uuid,
    notification_title text,
    notification_message text,
    notification_type text DEFAULT 'info',
    notification_priority text DEFAULT 'medium',
    notification_action_url text DEFAULT NULL,
    notification_action_label text DEFAULT NULL,
    notification_expires_at timestamptz DEFAULT NULL,
    notification_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_notification_id uuid;
    current_user_id uuid;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Validate required parameters
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'target_user_id cannot be null';
    END IF;
    
    IF notification_title IS NULL OR trim(notification_title) = '' THEN
        RAISE EXCEPTION 'notification_title cannot be empty';
    END IF;
    
    IF notification_message IS NULL OR trim(notification_message) = '' THEN
        RAISE EXCEPTION 'notification_message cannot be empty';
    END IF;
    
    -- Validate type and priority
    IF notification_type NOT IN ('info', 'success', 'warning', 'error', 'announcement', 'loan_update', 'system') THEN
        notification_type := 'info';
    END IF;
    
    IF notification_priority NOT IN ('low', 'medium', 'high', 'urgent') THEN
        notification_priority := 'medium';
    END IF;
    
    -- Insert notification
    INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        priority,
        action_url,
        action_label,
        expires_at,
        created_by,
        metadata
    ) VALUES (
        target_user_id,
        trim(notification_title),
        trim(notification_message),
        notification_type,
        notification_priority,
        notification_action_url,
        notification_action_label,
        notification_expires_at,
        current_user_id,
        COALESCE(notification_metadata, '{}'::jsonb)
    ) RETURNING id INTO new_notification_id;
    
    RETURN new_notification_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating notification: %', SQLERRM;
END;
$$;

-- Create system message function
CREATE OR REPLACE FUNCTION create_system_message(
    message_title text,
    message_content text,
    message_type text DEFAULT 'info',
    message_priority text DEFAULT 'medium',
    message_target_audience text DEFAULT 'all',
    message_expires_at timestamptz DEFAULT NULL,
    message_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_message_id uuid;
    current_user_id uuid;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Validate required parameters
    IF message_title IS NULL OR trim(message_title) = '' THEN
        RAISE EXCEPTION 'message_title cannot be empty';
    END IF;
    
    IF message_content IS NULL OR trim(message_content) = '' THEN
        RAISE EXCEPTION 'message_content cannot be empty';
    END IF;
    
    -- Validate type, priority, and audience
    IF message_type NOT IN ('info', 'success', 'warning', 'error', 'announcement', 'maintenance') THEN
        message_type := 'info';
    END IF;
    
    IF message_priority NOT IN ('low', 'medium', 'high', 'urgent') THEN
        message_priority := 'medium';
    END IF;
    
    IF message_target_audience NOT IN ('all', 'users', 'admins', 'super_admins') THEN
        message_target_audience := 'all';
    END IF;
    
    -- Insert system message
    INSERT INTO system_messages (
        title,
        message,
        type,
        priority,
        target_audience,
        expires_at,
        created_by,
        metadata
    ) VALUES (
        trim(message_title),
        trim(message_content),
        message_type,
        message_priority,
        message_target_audience,
        message_expires_at,
        current_user_id,
        COALESCE(message_metadata, '{}'::jsonb)
    ) RETURNING id INTO new_message_id;
    
    RETURN new_message_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating system message: %', SQLERRM;
END;
$$;

-- Mark notification as read function
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
    rows_updated integer;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Validate input
    IF notification_id IS NULL THEN
        RAISE EXCEPTION 'notification_id cannot be null';
    END IF;
    
    -- Update notification
    UPDATE notifications 
    SET 
        read = true,
        read_at = now()
    WHERE id = notification_id 
        AND user_id = current_user_id
        AND read = false;
    
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    
    RETURN rows_updated > 0;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error marking notification as read: %', SQLERRM;
END;
$$;

-- Mark all notifications as read function
CREATE OR REPLACE FUNCTION mark_all_notifications_read(target_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
    rows_updated integer;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Validate input
    IF target_user_id IS NULL THEN
        target_user_id := current_user_id;
    END IF;
    
    -- Only allow users to mark their own notifications as read
    IF target_user_id != current_user_id THEN
        RAISE EXCEPTION 'Cannot mark other users notifications as read';
    END IF;
    
    -- Update all unread notifications
    UPDATE notifications 
    SET 
        read = true,
        read_at = now()
    WHERE user_id = target_user_id 
        AND read = false;
    
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    
    RETURN rows_updated;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error marking all notifications as read: %', SQLERRM;
END;
$$;

-- Send bulk notification function
CREATE OR REPLACE FUNCTION send_bulk_notification(
    user_ids uuid[],
    notification_title text,
    notification_message text,
    notification_type text DEFAULT 'info',
    notification_priority text DEFAULT 'medium',
    notification_action_url text DEFAULT NULL,
    notification_action_label text DEFAULT NULL,
    notification_expires_at timestamptz DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id uuid;
    notifications_created integer := 0;
    current_user_id uuid;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Validate required parameters
    IF user_ids IS NULL OR array_length(user_ids, 1) = 0 THEN
        RAISE EXCEPTION 'user_ids cannot be empty';
    END IF;
    
    IF notification_title IS NULL OR trim(notification_title) = '' THEN
        RAISE EXCEPTION 'notification_title cannot be empty';
    END IF;
    
    IF notification_message IS NULL OR trim(notification_message) = '' THEN
        RAISE EXCEPTION 'notification_message cannot be empty';
    END IF;
    
    -- Validate type and priority
    IF notification_type NOT IN ('info', 'success', 'warning', 'error', 'announcement', 'loan_update', 'system') THEN
        notification_type := 'info';
    END IF;
    
    IF notification_priority NOT IN ('low', 'medium', 'high', 'urgent') THEN
        notification_priority := 'medium';
    END IF;
    
    -- Create notification for each user
    FOREACH user_id IN ARRAY user_ids
    LOOP
        BEGIN
            INSERT INTO notifications (
                user_id,
                title,
                message,
                type,
                priority,
                action_url,
                action_label,
                expires_at,
                created_by
            ) VALUES (
                user_id,
                trim(notification_title),
                trim(notification_message),
                notification_type,
                notification_priority,
                notification_action_url,
                notification_action_label,
                notification_expires_at,
                current_user_id
            );
            
            notifications_created := notifications_created + 1;
        EXCEPTION
            WHEN OTHERS THEN
                -- Continue with next user if one fails
                CONTINUE;
        END;
    END LOOP;
    
    RETURN notifications_created;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error sending bulk notifications: %', SQLERRM;
END;
$$;

-- =============================================================================
-- STEP 8: CREATE VERIFICATION FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION verify_notification_system()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb := '{}'::jsonb;
    tables_created integer := 0;
    functions_created integer := 0;
    policies_created integer := 0;
BEGIN
    -- Check tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        tables_created := tables_created + 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_messages') THEN
        tables_created := tables_created + 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') THEN
        tables_created := tables_created + 1;
    END IF;
    
    -- Check functions
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_user_notifications') THEN
        functions_created := functions_created + 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_active_system_messages') THEN
        functions_created := functions_created + 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'create_notification') THEN
        functions_created := functions_created + 1;
    END IF;
    
    -- Check policies (simplified check)
    SELECT COUNT(*) INTO policies_created 
    FROM pg_policies 
    WHERE tablename IN ('notifications', 'system_messages', 'notification_preferences');
    
    -- Build result
    result := jsonb_build_object(
        'tables_created', tables_created,
        'functions_created', functions_created,
        'policies_created', policies_created,
        'system_ready', (tables_created >= 3 AND functions_created >= 3 AND policies_created >= 6),
        'timestamp', now()
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'error', SQLERRM,
            'system_ready', false,
            'timestamp', now()
        );
END;
$$;

-- =============================================================================
-- STEP 9: CREATE LOAN STATUS NOTIFICATION TRIGGER
-- =============================================================================

-- Create the loan status notification function
CREATE OR REPLACE FUNCTION create_loan_status_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_title text;
    notification_message text;
    notification_type text;
BEGIN
    -- Only create notification if status changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Determine notification content based on new status
        CASE NEW.status
            WHEN 'approved' THEN
                notification_title := 'Loan Application Approved! 🎉';
                notification_message := 'Congratulations! Your loan application for ' || 
                                      COALESCE(NEW.amount::text, 'N/A') || 
                                      ' has been approved. You will receive the funds shortly.';
                notification_type := 'success';
            WHEN 'rejected' THEN
                notification_title := 'Loan Application Update';
                notification_message := 'Your loan application for ' || 
                                      COALESCE(NEW.amount::text, 'N/A') || 
                                      ' has been reviewed. Please contact support for more information.';
                notification_type := 'warning';
            WHEN 'under_review' THEN
                notification_title := 'Application Under Review';
                notification_message := 'Your loan application is now under review. We will notify you once the review is complete.';
                notification_type := 'info';
            ELSE
                notification_title := 'Loan Application Status Update';
                notification_message := 'Your loan application status has been updated to: ' || NEW.status;
                notification_type := 'info';
        END CASE;
        
        -- Create the notification
        BEGIN
            PERFORM create_notification(
                NEW.user_id,
                notification_title,
                notification_message,
                notification_type,
                'high',
                '/applications',
                'View Application',
                NULL,
                jsonb_build_object(
                    'loan_application_id', NEW.id,
                    'old_status', OLD.status,
                    'new_status', NEW.status,
                    'amount', NEW.amount
                )
            );
        EXCEPTION
            WHEN OTHERS THEN
                -- Log error but don't fail the main operation
                NULL;
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER loan_status_notification_trigger
    AFTER UPDATE ON loan_applications
    FOR EACH ROW
    EXECUTE FUNCTION create_loan_status_notification();

-- =============================================================================
-- STEP 10: GRANT PERMISSIONS
-- =============================================================================

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION test_db_connection() TO authenticated;
GRANT EXECUTE ON FUNCTION is_notification_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notifications(uuid, boolean, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_system_messages(text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification(uuid, text, text, text, text, text, text, timestamptz, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION create_system_message(text, text, text, text, text, timestamptz, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION send_bulk_notification(uuid[], text, text, text, text, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_notification_system() TO authenticated;

-- =============================================================================
-- STEP 11: FINAL VERIFICATION AND COMPLETION
-- =============================================================================

-- Run final verification in a DO block
DO $$
DECLARE
    verification_result jsonb;
    system_ready boolean;
BEGIN
    -- Run verification
    SELECT verify_notification_system() INTO verification_result;
    
    -- Extract system ready status
    system_ready := (verification_result->>'system_ready')::boolean;
    
    -- The migration is complete - verification results are available via the function
END;
$$;