import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, User, Mail, Phone, Shield, CheckCircle, 
  AlertCircle, Loader2, Save, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_3367f2a2-798d-4b61-99bb-befe08ab3864/artifacts/8ejiuqqy_Aljabr-Laundry-Main-Logo-.png";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateProfile, resendVerification, isManager } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const initFormData = useCallback(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  useEffect(() => {
    initFormData();
  }, [initFormData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email) {
      toast.error('Email is required');
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Validate phone if provided
    if (formData.phone) {
      const phoneRegex = /^[\d\s\-\+\(\)]{8,}$/;
      if (!phoneRegex.test(formData.phone)) {
        toast.error('Please enter a valid phone number');
        return;
      }
    }

    setLoading(true);
    try {
      const updateData = {};
      if (formData.name !== user.name) updateData.name = formData.name;
      if (formData.email !== user.email) updateData.email = formData.email;
      if (formData.phone !== user.phone) updateData.phone = formData.phone;

      if (Object.keys(updateData).length === 0) {
        toast.info('No changes to save');
        setLoading(false);
        return;
      }

      await updateProfile(updateData);
      
      if (updateData.email) {
        toast.success('Profile updated! Please verify your new email address.');
      } else {
        toast.success('Profile updated successfully');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setSendingVerification(true);
    try {
      const result = await resendVerification();
      if (result.success) {
        toast.success('Verification email sent! Please check your inbox.');
      } else {
        toast.error(result.message || 'Failed to send verification email');
      }
    } catch {
      toast.error(error.response?.data?.detail || 'Failed to send verification email');
    } finally {
      setSendingVerification(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="ltr">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Link 
              to="/admin/dashboard" 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              data-testid="back-btn"
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
            <span className="text-gray-400">|</span>
            <span className="text-sm text-gray-600">Profile Settings</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 md:py-10">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Email Verification Alert */}
          {!user.email_verified && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-yellow-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-yellow-800">Email Not Verified</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Please verify your email address to receive notifications and ensure account security.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResendVerification}
                      disabled={sendingVerification}
                      className="mt-3 border-yellow-600 text-yellow-700 hover:bg-yellow-100"
                      data-testid="resend-verification-btn"
                    >
                      {sendingVerification ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Resend Verification Email
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Profile Card */}
          <Card className="shadow-lg border-0">
            <CardHeader className="text-center pb-2">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-10 h-10 text-primary" />
              </div>
              <CardTitle className="font-heading text-xl md:text-2xl">
                {user.name || user.username}
              </CardTitle>
              <CardDescription className="flex items-center justify-center gap-2 mt-2">
                <Badge className={isManager ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                  {isManager ? (
                    <>
                      <Shield className="w-3 h-3 mr-1" />
                      Manager
                    </>
                  ) : (
                    <>
                      <User className="w-3 h-3 mr-1" />
                      Supervisor
                    </>
                  )}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {user.category?.replace('_', ' ')}
                </Badge>
                {user.email_verified && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Username (read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={user.username}
                    disabled
                    className="bg-gray-50"
                    data-testid="username-input"
                  />
                  <p className="text-xs text-gray-500">Username cannot be changed</p>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-10"
                      data-testid="name-input"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-10"
                      data-testid="email-input"
                    />
                  </div>
                  {formData.email !== user.email && (
                    <p className="text-xs text-yellow-600">
                      Changing email will require verification of the new address
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="pl-10"
                      data-testid="phone-input"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-primary hover:bg-primary-hover text-white text-base font-medium"
                  disabled={loading}
                  data-testid="save-profile-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Back Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => navigate('/admin/dashboard')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
