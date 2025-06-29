import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PasswordReset from '../components/PasswordReset';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Check if we have the required parameters for password reset
  useEffect(() => {
    const type = searchParams.get('type');
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    // If no recovery parameters, redirect to home
    if (type !== 'recovery' && !accessToken && !refreshToken) {
      navigate('/');
    }
  }, [searchParams, navigate]);

  return (
    <div className="app">
      <PasswordReset />
    </div>
  );
}