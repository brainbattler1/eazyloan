# Supabase Authentication Configuration for Password Reset

This guide explains how to configure Supabase authentication settings to enable password reset emails that redirect to your application's password reset page.

## Database Migration Completed ✅

The SQL migration `20250105000000_configure_password_reset_email.sql` has been successfully applied, which:
- Created `email_templates` table to store custom email templates
- Created `auth_config_docs` table for configuration documentation
- Added a password reset email template with proper styling
- Created helper functions and views for password reset handling

## Required Supabase Dashboard Configuration

To complete the password reset setup, you need to configure the following settings in your Supabase project dashboard:

### 1. Authentication Settings

Go to **Authentication > Settings** in your Supabase dashboard and configure:

#### Site URL
```
Site URL: http://localhost:5173
```
*For production, use your actual domain (e.g., https://yourdomain.com)*

#### Redirect URLs
Add these URLs to the "Redirect URLs" list:
```
http://localhost:5173/**
http://localhost:5173/auth
http://localhost:5173/reset-password
```
*For production, replace localhost with your actual domain*

### 2. Email Templates

Go to **Authentication > Email Templates** and configure the **Reset Password** template:

#### Subject
```
Reset Your EazyLoan Password
```

#### Email Body (HTML)
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Reset Your Password - EazyLoan</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { color: #2563eb; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🏦 EazyLoan</div>
    <h1>Reset Your Password</h1>
  </div>
  
  <p>Hello,</p>
  
  <p>We received a request to reset your password for your EazyLoan account. If you made this request, click the button below to create a new password:</p>
  
  <div style="text-align: center;">
    <a href="{{ .SiteURL }}?access_token={{ .Token }}&refresh_token={{ .RefreshToken }}&type=recovery" class="button">
      Reset Password
    </a>
  </div>
  
  <p>This link will expire in 24 hours for security reasons.</p>
  
  <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
  
  <div class="footer">
    <p>Best regards,<br>The EazyLoan Team</p>
    <p><small>This is an automated email. Please do not reply to this message.</small></p>
  </div>
</body>
</html>
```

### 3. Additional Security Settings

Configure these additional settings for better security:

#### Password Requirements
- **Minimum password length**: 6 characters
- **Require uppercase**: Optional (recommended for production)
- **Require lowercase**: Optional (recommended for production)
- **Require numbers**: Optional (recommended for production)
- **Require special characters**: Optional (recommended for production)

#### Email Settings
- **Enable email confirmations**: ✅ Enabled
- **Enable secure email change**: ✅ Enabled
- **Auto-confirm users**: ❌ Disabled (for production)

### 4. Environment Variables (Optional)

If you prefer to configure via environment variables, add these to your Supabase project:

```env
SUPABASE_AUTH_SITE_URL=http://localhost:5173
SUPABASE_AUTH_REDIRECT_URLS=http://localhost:5173/**
SUPABASE_AUTH_PASSWORD_MIN_LENGTH=6
SUPABASE_AUTH_MAILER_SECURE_EMAIL_CHANGE_ENABLED=true
SUPABASE_AUTH_MAILER_AUTOCONFIRM=false
```

## Testing the Password Reset Flow

1. **Trigger Password Reset**:
   - Go to your application's sign-in page
   - Click "Forgot your password?"
   - Enter a valid email address
   - Click "Send Reset Email"

2. **Check Email**:
   - Check the email inbox for the reset email
   - The email should have the EazyLoan branding and styling
   - Click the "Reset Password" button

3. **Reset Password**:
   - You should be redirected to your application with URL parameters
   - The app should detect the recovery tokens and show the password reset form
   - Enter a new password and confirm
   - You should be redirected to the main application

## Troubleshooting

### Common Issues

1. **Email not received**:
   - Check spam/junk folder
   - Verify email address is correct
   - Check Supabase logs for email delivery errors

2. **Redirect not working**:
   - Verify Site URL is correctly set
   - Ensure redirect URLs include your domain
   - Check browser console for JavaScript errors

3. **Token errors**:
   - Ensure tokens haven't expired (24-hour limit)
   - Verify URL parameters are being parsed correctly
   - Check that the recovery type is detected properly

### Debug Steps

1. **Check Supabase Logs**:
   - Go to Supabase Dashboard > Logs
   - Look for authentication and email-related errors

2. **Verify Configuration**:
   - Query the `auth_config_docs` table to see documented settings
   - Query the `email_templates` table to verify template content

3. **Test with Different Browsers**:
   - Try the flow in incognito/private mode
   - Test with different email providers

## Production Considerations

1. **Update URLs**: Replace `localhost:5173` with your production domain
2. **SSL Certificate**: Ensure your production site uses HTTPS
3. **Email Provider**: Configure a reliable email service (SendGrid, Mailgun, etc.)
4. **Rate Limiting**: Consider implementing rate limiting for password reset requests
5. **Monitoring**: Set up monitoring for failed email deliveries

## Database Tables Created

### `public.email_templates`
Stores email template configurations:
- `template_name`: Template identifier
- `subject`: Email subject line
- `body_html`: HTML email content
- `body_text`: Plain text email content
- `redirect_url`: Base URL for redirects

### `public.auth_config_docs`
Documents authentication configuration:
- `config_key`: Configuration setting name
- `config_value`: Setting value
- `description`: Human-readable description

### `public.password_reset_template` (View)
Convenience view for accessing the password reset template.

---

**Note**: This configuration ensures that password reset emails will redirect users to your application where they can securely update their passwords using the implemented `PasswordReset` component.