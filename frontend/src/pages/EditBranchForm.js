import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, MapPin, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { API_URL } from '@/config';

const API = API_URL;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_3367f2a2-798d-4b61-99bb-befe08ab3864/artifacts/8ejiuqqy_Aljabr-Laundry-Main-Logo-.png";

// Saudi Cities in English
const SAUDI_CITIES = [
  "Riyadh", "Jeddah", "Makkah", "Madinah", "Dammam",
  "Khobar", "Dhahran", "Al Ahsa", "Qatif", "Jubail",
  "Yanbu", "Taif", "Tabuk", "Buraidah", "Unaizah",
  "Hail", "Najran", "Jazan", "Abha", "Khamis Mushait",
  "Al Baha", "Sakaka", "Arar", "Qassim", "Al Kharj"
];

export default function EditBranchForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    branch_name: '',
    city: '',
    google_maps_link: '',
    new_phone: '',
    notes: ''
  });
  const isSubmitDisabled = loading || !formData.branch_name || !formData.city || !formData.google_maps_link || !formData.new_phone;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.branch_name || !formData.city || !formData.google_maps_link || !formData.new_phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate phone number (Saudi format)
    const phoneRegex = /^(05|5|\+9665)[0-9]{8}$/;
    if (!phoneRegex.test(formData.new_phone.replace(/\s/g, ''))) {
      toast.error('Please enter a valid Saudi phone number');
      return;
    }

    // Validate Google Maps link
    if (!formData.google_maps_link.includes('google') && !formData.google_maps_link.includes('maps') && !formData.google_maps_link.includes('goo.gl')) {
      toast.error('Please enter a valid Google Maps link');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/requests/edit`, formData);
      setSubmitted(true);
      toast.success('Request submitted successfully');
    } catch {
      toast.error('An error occurred while submitting the request');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="ltr">
        <Card className="w-full max-w-md text-center animate-fade-in">
          <CardContent className="pt-10 pb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="font-heading text-2xl font-bold text-gray-900 mb-3">
              Request Submitted Successfully
            </h2>
            <p className="text-gray-600 mb-6">
              Thank you! Your request will be reviewed and the branch information will be updated soon.
            </p>
            <Button 
              onClick={() => navigate('/')}
              className="bg-primary hover:bg-primary-hover text-white"
              data-testid="back-home-btn"
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="app-shell" dir="ltr">
      {/* Header */}
      <header className="app-topbar">
        <div className="app-topbar-inner justify-start gap-8">
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="icon-btn-soft"
              data-testid="back-btn"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <Link to="/" aria-label="Go to home page">
              <img 
                src={LOGO_URL} 
                alt="Aljabr Laundry" 
                className="app-logo"
              />
            </Link>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="mx-auto max-w-[760px] px-6 py-20">
        <div>
          <Card className="glass-card overflow-hidden">
            <CardHeader className="border-b border-slate-100 px-12 py-12 text-left">
              <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-[22px] bg-blue-50">
                <MapPin className="h-10 w-10 text-blue-600" />
              </div>
              <CardTitle className="font-heading text-4xl font-extrabold text-slate-950">
                Edit Branch Information
              </CardTitle>
              <CardDescription className="mt-4 text-xl leading-8 text-slate-500">
                Please fill in the required information to update the branch details
              </CardDescription>
            </CardHeader>
            <CardContent className="px-12 py-10">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Branch Name */}
                <div className="space-y-4">
                  <Label htmlFor="branch_name" className="soft-label">Branch Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="branch_name"
                    placeholder="e.g., Riyadh - Al Nakheel Branch"
                    value={formData.branch_name}
                    onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                    className="soft-input"
                    data-testid="branch-name-input"
                  />
                </div>

                {/* City */}
                <div className="space-y-4">
                  <Label htmlFor="city" className="soft-label">City <span className="text-red-500">*</span></Label>
                  <Select 
                    value={formData.city} 
                    onValueChange={(value) => setFormData({ ...formData, city: value })}
                  >
                    <SelectTrigger className="soft-input" data-testid="city-select">
                      <SelectValue placeholder="Select City" />
                    </SelectTrigger>
                    <SelectContent>
                      {SAUDI_CITIES.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Google Maps Link */}
                <div className="space-y-4">
                  <Label htmlFor="google_maps_link" className="soft-label">Google Maps Link <span className="text-red-500">*</span></Label>
                  <Input
                    id="google_maps_link"
                    type="url"
                    placeholder="https://maps.google.com/..."
                    value={formData.google_maps_link}
                    onChange={(e) => setFormData({ ...formData, google_maps_link: e.target.value })}
                    className="soft-input"
                    data-testid="maps-link-input"
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-4">
                  <Label htmlFor="new_phone" className="soft-label">New Phone Number <span className="text-red-500">*</span></Label>
                  <Input
                    id="new_phone"
                    type="tel"
                    placeholder="05xxxxxxxx"
                    value={formData.new_phone}
                    onChange={(e) => setFormData({ ...formData, new_phone: e.target.value })}
                    className="soft-input"
                    data-testid="phone-input"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-4">
                  <Label htmlFor="notes" className="soft-label">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional details..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="soft-textarea"
                    data-testid="notes-input"
                  />
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className={`mt-6 w-full ${isSubmitDisabled ? 'disabled-pill' : 'primary-pill'}`}
                  disabled={isSubmitDisabled}
                  data-testid="submit-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
