import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Plus, FileText, Loader2 } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '@/config';

const API = API_URL;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_3367f2a2-798d-4b61-99bb-befe08ab3864/artifacts/8ejiuqqy_Aljabr-Laundry-Main-Logo-.png";

// Default colors for dynamic cards
const CARD_COLORS = [
  { bg: 'from-green-50 to-green-100', border: 'hover:border-green-500', text: 'group-hover:text-green-600', icon: 'bg-green-500' },
  { bg: 'from-purple-50 to-purple-100', border: 'hover:border-purple-500', text: 'group-hover:text-purple-600', icon: 'bg-purple-500' },
  { bg: 'from-orange-50 to-orange-100', border: 'hover:border-orange-500', text: 'group-hover:text-orange-600', icon: 'bg-orange-500' },
  { bg: 'from-teal-50 to-teal-100', border: 'hover:border-teal-500', text: 'group-hover:text-teal-600', icon: 'bg-teal-500' },
  { bg: 'from-pink-50 to-pink-100', border: 'hover:border-pink-500', text: 'group-hover:text-pink-600', icon: 'bg-pink-500' },
];

export default function LandingPage() {
  const [dynamicRequestTypes, setDynamicRequestTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequestTypes = async () => {
      try {
        const response = await axios.get(`${API}/public/request-types`);
        setDynamicRequestTypes(response.data);
      } catch (error) {
        // Silent fail - just show default cards
      } finally {
        setLoading(false);
      }
    };
    fetchRequestTypes();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50" dir="ltr">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <img 
              src={LOGO_URL} 
              alt="Aljabr Laundry" 
              className="h-14 md:h-16 object-contain"
              data-testid="logo"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-6xl mx-auto">
          {/* Title Section */}
          <div className="text-center mb-10 md:mb-16">
            <h1 className="font-heading text-2xl md:text-4xl font-bold text-gray-900 mb-4">
              Branch Request Management System
            </h1>
            <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
              Welcome to the request management system. Please select the appropriate request type.
            </p>
          </div>

          {/* Google Maps Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Google Maps Requests
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Edit Branch Card */}
              <Link to="/edit-branch" data-testid="edit-branch-card">
                <Card className="group h-full cursor-pointer overflow-hidden border-2 border-transparent hover:border-primary hover:shadow-xl transition-all duration-300">
                  <div className="relative h-48 md:h-56 overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100">
                    <img 
                      src="https://customer-assets.emergentagent.com/job_maps-request-center/artifacts/hrq0h773_AIMA8074.jpg"
                      alt="Edit Branch Information"
                      className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 bg-primary text-white p-3 rounded-xl shadow-lg">
                      <MapPin className="w-6 h-6" />
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="font-heading text-xl md:text-2xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">
                      Edit Existing Branch
                    </h3>
                    <p className="text-gray-600">
                      Update phone number, location, or any other branch information
                    </p>
                  </CardContent>
                </Card>
              </Link>

              {/* New Branch Card */}
              <Link to="/new-branch" data-testid="new-branch-card">
                <Card className="group h-full cursor-pointer overflow-hidden border-2 border-transparent hover:border-secondary hover:shadow-xl transition-all duration-300">
                  <div className="relative h-48 md:h-56 overflow-hidden bg-gradient-to-br from-red-50 to-red-100">
                    <img 
                      src="https://customer-assets.emergentagent.com/job_maps-request-center/artifacts/jynmv8pq_Screenshot%202026-03-09%20at%201.56.33%E2%80%AFPM.png"
                      alt="Add New Branch"
                      className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 bg-secondary text-white p-3 rounded-xl shadow-lg">
                      <Plus className="w-6 h-6" />
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="font-heading text-xl md:text-2xl font-bold text-gray-900 mb-2 group-hover:text-secondary transition-colors">
                      Request New Branch Listing
                    </h3>
                    <p className="text-gray-600">
                      Register a new branch on Google Maps with photos and information
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>

          {/* Dynamic Request Types Section */}
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
            </div>
          ) : dynamicRequestTypes.length > 0 && (
            <div className="mt-10">
              <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                Other Requests
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dynamicRequestTypes.map((type, index) => {
                  const colorScheme = CARD_COLORS[index % CARD_COLORS.length];
                  return (
                    <Link 
                      key={type.id} 
                      to={`/request/${type.id}`}
                      data-testid={`request-type-${type.id}`}
                    >
                      <Card className={`group h-full cursor-pointer overflow-hidden border-2 border-transparent ${colorScheme.border} hover:shadow-xl transition-all duration-300`}>
                        <div className={`relative h-40 overflow-hidden bg-gradient-to-br ${colorScheme.bg}`}>
                          {type.image_url ? (
                            <img 
                              src={type.image_url}
                              alt={type.name}
                              className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FileText className="w-16 h-16 text-gray-300" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                          <div className={`absolute bottom-4 left-4 ${colorScheme.icon} text-white p-3 rounded-xl shadow-lg`}>
                            <FileText className="w-5 h-5" />
                          </div>
                        </div>
                        <CardContent className="p-5">
                          <h3 className={`font-heading text-lg font-bold text-gray-900 mb-2 ${colorScheme.text} transition-colors`}>
                            {type.name}
                          </h3>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {type.description || 'Submit a request'}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-10 text-center">
            <p className="text-sm text-gray-500">
              For assistance, please contact the system administrator
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Aljabr Laundry - All Rights Reserved
          </p>
        </div>
      </footer>
    </div>
  );
}
