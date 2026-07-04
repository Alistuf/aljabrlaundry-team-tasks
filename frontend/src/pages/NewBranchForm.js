import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, CheckCircle, Loader2, Upload, X } from 'lucide-react';
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

// Example photos for guidance
const EXAMPLE_PHOTOS = [
  { label: 'Front Exterior', icon: '🏢' },
  { label: 'Signboard', icon: '📋' },
  { label: 'Interior', icon: '🏠' },
  { label: 'Entrance', icon: '🚪' },
  { label: 'Additional', icon: '📸' }
];

export default function NewBranchForm() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [formData, setFormData] = useState({
    branch_name: '',
    city: '',
    location_link: '',
    phone_number: ''
  });
  const isSubmitDisabled = loading || !formData.branch_name || !formData.city || !formData.location_link || !formData.phone_number || photos.length < 5;

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select image files only');
        continue;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos(prev => [...prev, {
          id: Date.now() + Math.random(),
          name: file.name,
          preview: reader.result,
          base64: reader.result
        }]);
      };
      reader.readAsDataURL(file);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (id) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.branch_name || !formData.city || !formData.location_link || !formData.phone_number) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (photos.length < 5) {
      toast.error('Please upload at least 5 photos');
      return;
    }

    // Validate phone
    const phoneRegex = /^(05|5|\+9665)[0-9]{8}$/;
    if (!phoneRegex.test(formData.phone_number.replace(/\s/g, ''))) {
      toast.error('Please enter a valid Saudi phone number');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        photos: photos.map(p => p.base64)
      };
      await axios.post(`${API}/requests/new`, payload);
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
              Thank you! Your request will be reviewed and the branch will be added to Google Maps soon.
            </p>
            <Button 
              onClick={() => navigate('/')}
              className="bg-secondary hover:bg-secondary-hover text-white"
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
      <main className="mx-auto max-w-[720px] px-6 py-16">
        <div>
          <Card className="glass-card overflow-hidden">
            <CardHeader className="border-b border-slate-100 px-12 py-12 text-left">
              <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-[22px] bg-red-50">
                <Plus className="h-10 w-10 text-red-600" />
              </div>
              <CardTitle className="font-heading text-4xl font-extrabold text-slate-950">
                New Branch Listing Request
              </CardTitle>
              <CardDescription className="mt-4 text-xl leading-8 text-slate-500">
                Please fill in the details and upload branch photos to register on Google Maps
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

                {/* Location Link */}
                <div className="space-y-4">
                  <Label htmlFor="location_link" className="soft-label">Google Maps Location Link <span className="text-red-500">*</span></Label>
                  <Input
                    id="location_link"
                    type="url"
                    placeholder="https://maps.google.com/... or coordinates"
                    value={formData.location_link}
                    onChange={(e) => setFormData({ ...formData, location_link: e.target.value })}
                    className="soft-input"
                    data-testid="location-link-input"
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-4">
                  <Label htmlFor="phone_number" className="soft-label">Branch Phone Number <span className="text-red-500">*</span></Label>
                  <Input
                    id="phone_number"
                    type="tel"
                    placeholder="05xxxxxxxx"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="soft-input"
                    data-testid="phone-input"
                  />
                </div>

                {/* Photo Upload Section */}
                <div className="space-y-5">
                  <Label className="soft-label">Branch Photos <span className="text-red-500">*</span> <span className="font-normal text-slate-400">(minimum 5 photos)</span></Label>
                  
                  {/* Example Photos Guide */}
                  <div className="rounded-[18px] border border-blue-100 bg-blue-50 p-6">
                    <p className="mb-5 text-base font-bold text-blue-700">Required Photos:</p>
                    <div className="grid grid-cols-5 gap-3">
                      {EXAMPLE_PHOTOS.map((photo) => (
                        <div key={photo.label} className="text-center">
                          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
                            {photo.icon}
                          </div>
                          <span className="block text-sm leading-tight text-blue-700">{photo.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Upload Button */}
                  <div 
                    className="cursor-pointer rounded-[18px] border-2 border-dashed border-slate-300 bg-white p-10 text-center transition-colors hover:border-red-400"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="upload-area"
                  >
                    <Upload className="mx-auto mb-4 h-12 w-12 text-slate-400" />
                    <p className="mb-2 text-lg font-semibold text-slate-700">Click to upload photos <span className="text-red-500">or drag & drop</span></p>
                    <p className="text-sm text-slate-400">PNG, JPG, JPEG</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      data-testid="file-input"
                    />
                  </div>

                  {/* Uploaded Photos Preview */}
                  {photos.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        Uploaded photos: {photos.length} / 5
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        {photos.map((photo) => (
                          <div key={photo.id} className="relative group">
                            <img
                              src={photo.preview}
                              alt={photo.name}
                              className="w-full h-24 object-cover rounded-lg border"
                            />
                            <button
                              type="button"
                              onClick={() => removePhoto(photo.id)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              data-testid={`remove-photo-${photo.id}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className={`mt-6 w-full ${isSubmitDisabled ? 'disabled-pill' : 'primary-pill bg-red-600 hover:bg-red-700'}`}
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
