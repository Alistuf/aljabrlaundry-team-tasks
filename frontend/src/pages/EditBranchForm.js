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
    <div className="min-h-screen bg-gray-50" dir="ltr">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
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

      {/* Form */}
      <main className="container mx-auto px-4 py-6 md:py-10">
        <div className="max-w-lg mx-auto">
          <Card className="shadow-lg border-0">
            <CardHeader className="text-center pb-2">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="font-heading text-xl md:text-2xl">
                Edit Branch Information
              </CardTitle>
              <CardDescription>
                Please fill in the required information to update the branch details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Branch Name */}
                <div className="space-y-2">
                  <Label htmlFor="branch_name">Branch Name *</Label>
                  <Input
                    id="branch_name"
                    placeholder="e.g., Riyadh - Al Nakheel Branch"
                    value={formData.branch_name}
                    onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                    data-testid="branch-name-input"
                  />
                </div>

                {/* City */}
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Select 
                    value={formData.city} 
                    onValueChange={(value) => setFormData({ ...formData, city: value })}
                  >
                    <SelectTrigger data-testid="city-select">
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
                <div className="space-y-2">
                  <Label htmlFor="google_maps_link">Google Maps Link *</Label>
                  <Input
                    id="google_maps_link"
                    type="url"
                    placeholder="https://maps.google.com/..."
                    value={formData.google_maps_link}
                    onChange={(e) => setFormData({ ...formData, google_maps_link: e.target.value })}
                    data-testid="maps-link-input"
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="new_phone">New Phone Number *</Label>
                  <Input
                    id="new_phone"
                    type="tel"
                    placeholder="05xxxxxxxx"
                    value={formData.new_phone}
                    onChange={(e) => setFormData({ ...formData, new_phone: e.target.value })}
                    data-testid="phone-input"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional details..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="min-h-[100px]"
                    data-testid="notes-input"
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
