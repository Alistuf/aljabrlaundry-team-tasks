import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '@/config';

const API = API_URL;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_3367f2a2-798d-4b61-99bb-befe08ab3864/artifacts/8ejiuqqy_Aljabr-Laundry-Main-Logo-.png";

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');

  const verifyEmail = useCallback(async () => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    try {
      const response = await axios.post(`${API}/auth/verify-email`, { token });
      if (response.data.success) {
        setStatus('success');
        setMessage('Your email has been verified successfully!');
      }
    } catch (error) {
      setStatus('error');
      const errorMessage = error.response?.data?.detail || 'Verification failed. The link may have expired.';
      setMessage(errorMessage);
    }
  }, [searchParams]);

  useEffect(() => {
    verifyEmail();
  }, [verifyEmail]);

  return (
    <div className="min-h-screen bg-gray-50" dir="ltr">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <Link to="/" aria-label="Go to home page">
              <img 
                src={LOGO_URL} 
                alt="Aljabr Laundry" 
                className="h-10 object-contain"
              />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg border-0">
            <CardContent className="pt-10 pb-8 text-center">
              {status === 'verifying' && (
                <>
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                  </div>
                  <h2 className="font-heading text-2xl font-bold text-gray-900 mb-3">
                    Verifying Email
                  </h2>
                  <p className="text-gray-600">
                    Please wait while we verify your email address...
                  </p>
                </>
              )}

              {status === 'success' && (
                <>
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="font-heading text-2xl font-bold text-gray-900 mb-3">
                    Email Verified!
                  </h2>
                  <p className="text-gray-600 mb-6">
                    {message}
                  </p>
                  <Button 
                    onClick={() => navigate('/admin/login')}
                    className="bg-primary hover:bg-primary-hover text-white"
                    data-testid="go-to-login-btn"
                  >
                    Go to Login
                  </Button>
                </>
              )}

              {status === 'error' && (
                <>
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <XCircle className="w-10 h-10 text-red-600" />
                  </div>
                  <h2 className="font-heading text-2xl font-bold text-gray-900 mb-3">
                    Verification Failed
                  </h2>
                  <p className="text-gray-600 mb-6">
                    {message}
                  </p>
                  <div className="space-y-3">
                    <Button 
                      onClick={() => navigate('/admin/login')}
                      className="w-full bg-primary hover:bg-primary-hover text-white"
                    >
                      Go to Login
                    </Button>
                    <p className="text-sm text-gray-500">
                      You can request a new verification email from your profile settings.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
