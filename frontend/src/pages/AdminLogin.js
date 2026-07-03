import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lock, Loader2, ArrowLeft, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth, ROLE_MANAGER, ROLE_SUPERVISOR, CATEGORY_GOOGLE_MAPS } from '@/context/AuthContext';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_3367f2a2-798d-4b61-99bb-befe08ab3864/artifacts/8ejiuqqy_Aljabr-Laundry-Main-Logo-.png";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login, register, isAuthenticated } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    role: ROLE_SUPERVISOR,
    category: CATEGORY_GOOGLE_MAPS
  });

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate('/admin/dashboard');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (isRegister && !formData.email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register(
          formData.username, 
          formData.password, 
          formData.email,
          formData.role,
          formData.category
        );
        toast.success('Account created successfully');
      } else {
        await login(formData.username, formData.password);
        toast.success('Login successful');
      }
      navigate('/admin/dashboard');
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Invalid username or password');
      } else if (error.response?.status === 400) {
        toast.error(error.response?.data?.detail || 'Username already exists');
      } else {
        toast.error('An error occurred during login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="ltr">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              data-testid="back-btn"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <img 
              src={LOGO_URL} 
              alt="Aljabr Laundry" 
              className="h-10 object-contain"
            />
          </div>
        </div>
      </header>

      {/* Login Form */}
      <main className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg border-0">
            <CardHeader className="text-center pb-2">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                {isRegister ? (
                  <UserPlus className="w-7 h-7 text-primary" />
                ) : (
                  <Lock className="w-7 h-7 text-primary" />
                )}
              </div>
              <CardTitle className="font-heading text-xl md:text-2xl">
                {isRegister ? 'Create New Account' : 'Login'}
              </CardTitle>
              <CardDescription>
                {isRegister 
                  ? 'Create an account to access the dashboard' 
                  : 'Enter your credentials to access the dashboard'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    data-testid="username-input"
                  />
                </div>

                {/* Email (only for register) */}
                {isRegister && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="user@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        data-testid="email-input"
                      />
                    </div>

                    {/* Role Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select 
                        value={formData.role} 
                        onValueChange={(value) => setFormData({ ...formData, role: value })}
                      >
                        <SelectTrigger data-testid="role-select">
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ROLE_MANAGER}>Manager (Full Access)</SelectItem>
                          <SelectItem value={ROLE_SUPERVISOR}>Supervisor (Assigned Tasks Only)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Category Selection (for Supervisors) */}
                    {formData.role === ROLE_SUPERVISOR && (
                      <div className="space-y-2">
                        <Label htmlFor="category">Department</Label>
                        <Select 
                          value={formData.category} 
                          onValueChange={(value) => setFormData({ ...formData, category: value })}
                        >
                          <SelectTrigger data-testid="category-select">
                            <SelectValue placeholder="Select Department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="google_maps">Google Maps</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="general">General</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    data-testid="password-input"
                  />
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-primary hover:bg-primary-hover text-white text-base font-medium"
                  disabled={loading}
                  data-testid="submit-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    isRegister ? 'Create Account' : 'Login'
                  )}
                </Button>

                {/* Toggle Register/Login */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRegister(!isRegister)}
                    className="text-sm text-primary hover:underline"
                    data-testid="toggle-mode-btn"
                  >
                    {isRegister 
                      ? 'Already have an account? Login' 
                      : "Don't have an account? Create one"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
