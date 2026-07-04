import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Plus, FileText, Loader2, Shield, Clock3, Star, ArrowRight } from 'lucide-react';
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
    <div className="app-shell" dir="ltr">
      {/* Header */}
      <header className="app-topbar static">
        <div className="app-topbar-inner">
          <div className="flex items-center">
            <Link to="/" aria-label="Go to home page">
              <img 
                src={LOGO_URL} 
                alt="Aljabr Laundry" 
                className="app-logo"
                data-testid="logo"
              />
            </Link>
          </div>
          <Link to="/admin/login" className="hidden items-center gap-2 text-base font-semibold text-slate-700 hover:text-blue-600 md:flex">
            <Shield className="h-5 w-5" />
            Manager Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1480px] px-8 py-14 md:px-10 md:py-20">
        <div>
          {/* Title Section */}
          <div className="mx-auto mb-16 max-w-4xl text-center">
            <div className="mb-10 inline-flex items-center gap-3 rounded-full border border-blue-200 bg-blue-50 px-6 py-3 text-base font-semibold text-blue-700">
              <span className="h-3 w-3 rounded-full bg-blue-500" />
              Branch Request Management System
            </div>
            <h1 className="font-heading mb-7 text-5xl font-extrabold leading-tight tracking-normal text-slate-950 md:text-6xl">
              Manage Your Branch
              <span className="block text-blue-600">Requests Effortlessly</span>
            </h1>
            <p className="mx-auto max-w-3xl text-xl leading-9 text-slate-500">
              Welcome to the request management system. Select the appropriate request type to get started.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-9 text-base font-medium text-slate-500">
              <span className="flex items-center gap-2"><Shield className="h-5 w-5 text-blue-500" />Secure & Verified</span>
              <span className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-blue-500" />Fast Processing</span>
              <span className="flex items-center gap-2"><Star className="h-5 w-5 text-blue-500" />Google Maps Ready</span>
            </div>
          </div>

          {/* Google Maps Section */}
          <div className="mb-14">
            <div className="mb-8 flex items-center gap-6">
              <h2 className="inline-flex items-center gap-3 rounded-2xl bg-blue-50 px-6 py-4 text-lg font-bold text-blue-700">
                <MapPin className="h-5 w-5" />
                Google Maps Requests
              </h2>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Edit Branch Card */}
              <Link to="/edit-branch" data-testid="edit-branch-card">
                <Card className="group h-full cursor-pointer overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(15,23,42,0.12)]">
                  <div className="relative h-72 overflow-hidden bg-blue-50">
                    <img 
                      src="https://customer-assets.emergentagent.com/job_maps-request-center/artifacts/hrq0h773_AIMA8074.jpg"
                      alt="Edit Branch Information"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute left-8 top-7 rounded-full bg-blue-50 px-5 py-3 text-base font-bold text-blue-700 shadow-sm">Edit Request</div>
                    <div className="absolute bottom-8 left-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
                      <MapPin className="h-8 w-8" />
                    </div>
                  </div>
                  <CardContent className="flex items-center justify-between gap-6 p-8">
                    <div>
                    <h3 className="font-heading mb-4 text-2xl font-extrabold text-slate-950">
                      Edit Existing Branch
                    </h3>
                    <p className="max-w-xl text-lg leading-8 text-slate-500">
                      Update phone number, location, or any other branch information on Google Maps
                    </p>
                    </div>
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                      <ArrowRight className="h-6 w-6" />
                    </span>
                  </CardContent>
                </Card>
              </Link>

              {/* New Branch Card */}
              <Link to="/new-branch" data-testid="new-branch-card">
                <Card className="group h-full cursor-pointer overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(15,23,42,0.12)]">
                  <div className="relative h-72 overflow-hidden bg-red-50">
                    <img 
                      src="https://customer-assets.emergentagent.com/job_maps-request-center/artifacts/jynmv8pq_Screenshot%202026-03-09%20at%201.56.33%E2%80%AFPM.png"
                      alt="Add New Branch"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute left-8 top-7 rounded-full bg-red-50 px-5 py-3 text-base font-bold text-red-600 shadow-sm">New Listing</div>
                    <div className="absolute bottom-8 left-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-600 text-white shadow-lg">
                      <Plus className="h-8 w-8" />
                    </div>
                  </div>
                  <CardContent className="flex items-center justify-between gap-6 p-8">
                    <div>
                    <h3 className="font-heading mb-4 text-2xl font-extrabold text-slate-950">
                      Request New Branch Listing
                    </h3>
                    <p className="max-w-xl text-lg leading-8 text-slate-500">
                      Register a new branch on Google Maps with photos and complete information
                    </p>
                    </div>
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 transition group-hover:bg-red-600 group-hover:text-white">
                      <ArrowRight className="h-6 w-6" />
                    </span>
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
            <div className="mt-14">
              <div className="mb-8 flex items-center gap-6">
                <h2 className="inline-flex items-center gap-3 rounded-2xl bg-emerald-50 px-6 py-4 text-lg font-bold text-emerald-700">
                  <FileText className="h-5 w-5" />
                  Other Requests
                </h2>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {dynamicRequestTypes.map((type, index) => {
                  const colorScheme = CARD_COLORS[index % CARD_COLORS.length];
                  return (
                    <Link 
                      key={type.id} 
                      to={`/request/${type.id}`}
                      data-testid={`request-type-${type.id}`}
                    >
                      <Card className="group h-full cursor-pointer overflow-hidden rounded-[18px] border border-slate-200 border-t-8 border-t-emerald-500 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1">
                        <div className={`relative h-36 overflow-hidden bg-gradient-to-br ${colorScheme.bg}`}>
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
                        </div>
                        <CardContent className="p-8">
                          <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                            <FileText className="h-7 w-7" />
                          </div>
                          <Badge className="mb-5 rounded-full bg-emerald-100 px-4 py-1 text-emerald-700 hover:bg-emerald-100">General</Badge>
                          <h3 className="font-heading mb-3 text-xl font-extrabold text-slate-950">
                            {type.name}
                          </h3>
                          <p className="mb-7 line-clamp-2 text-base leading-7 text-slate-500">
                            {type.description || 'Submit any other branch-related request or inquiry'}
                          </p>
                          <span className="inline-flex items-center gap-2 font-bold text-emerald-600">
                            Start Request <ArrowRight className="h-4 w-4" />
                          </span>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-20 border-t border-slate-200 pt-10 text-center">
            <p className="text-base text-slate-400">
              For assistance, please contact the system administrator
            </p>
            <p className="mt-5 text-sm text-slate-400">© {new Date().getFullYear()} Aljabr Laundry - All Rights Reserved</p>
          </div>
        </div>
      </main>
    </div>
  );
}
