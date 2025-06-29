import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import EmailConfirmation from '../components/EmailConfirmation';

export default function ConfirmPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const handleRedirectToLogin = () => {
    navigate('/');
  };

  // Check if we have the required parameters
  useEffect(() => {
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    
    // If no token or type, redirect to home
    if (!token || type !== 'signup') {
      navigate('/');
    }
  }, [searchParams, navigate]);

  return (
    <EmailConfirmation onRedirectToLogin={handleRedirectToLogin} />
  );
}