import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, MapPin, Plus, Phone, Link as LinkIcon, 
  Clock, CheckCircle2, Loader2, Copy, Download, Image as ImageIcon,
  FileText, Calendar, User, UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { API_URL } from '@/config';

const API = API_URL;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_3367f2a2-798d-4b61-99bb-befe08ab3864/artifacts/8ejiuqqy_Aljabr-Laundry-Main-Logo-.png";

const STATUS_MAP = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-800', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800', icon: Loader2 },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle2 }
};

const REQUEST_TYPE_MAP = {
  edit: { label: 'Edit Branch Information', color: 'bg-primary/10 text-primary', icon: MapPin, bgColor: 'bg-primary/10', iconColor: 'text-primary' },
  new: { label: 'New Branch Listing', color: 'bg-secondary/10 text-secondary', icon: Plus, bgColor: 'bg-secondary/10', iconColor: 'text-secondary' },
  dynamic: { label: 'Custom Request', color: 'bg-purple-100 text-purple-800', icon: FileText, bgColor: 'bg-purple-100', iconColor: 'text-purple-700' }
};

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, logout, isManager } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [supervisors, setSupervisors] = useState([]);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const fetchData = useCallback(async () => {
    const headers = { headers: { Authorization: `Bearer ${token}` } };
    try {
      const [requestRes, supervisorsRes] = await Promise.all([
        axios.get(`${API}/requests/${id}`, headers),
        isManager ? axios.get(`${API}/users/supervisors`, headers) : Promise.resolve({ data: [] })
      ]);
      setRequest(requestRes.data);
      setSupervisors(supervisorsRes.data);
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
        navigate('/admin/login');
      } else if (error.response?.status === 404 || error.response?.status === 403) {
        toast.error('Request not found or access denied');
        navigate('/admin/dashboard');
      }
    } finally {
      setLoading(false);
    }
  }, [id, token, isManager, logout, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateStatus = async (newStatus) => {
    setUpdating(true);
    try {
      const response = await axios.patch(
        `${API}/requests/${id}/status`,
        { status: newStatus },
        authHeaders
      );
      setRequest(response.data);
      toast.success('Status updated successfully');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const assignRequest = async (userId) => {
    setUpdating(true);
    try {
      const response = await axios.patch(
        `${API}/requests/${id}/assign`,
        { assigned_to: userId },
        authHeaders
      );
      setRequest(response.data);
      toast.success('Request assigned successfully');
    } catch {
      toast.error('Failed to assign request');
    } finally {
      setUpdating(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(request.location_link);
    toast.success('Link copied to clipboard');
  };

  const downloadImage = (imageData, index) => {
    const link = document.createElement('a');
    link.href = imageData;
    link.download = `branch-photo-${index + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloading image...');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFieldValue = (value) => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (value && typeof value === 'object') {
      return JSON.stringify(value);
    }
    return value || 'N/A';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!request) {
    return null;
  }

  const typeInfo = REQUEST_TYPE_MAP[request.request_type] || REQUEST_TYPE_MAP.dynamic;
  const statusInfo = STATUS_MAP[request.status] || STATUS_MAP.new;
  const StatusIcon = statusInfo.icon;
  const TypeIcon = typeInfo.icon;
  const customFieldLabels = (request.custom_fields || []).reduce((labels, field) => {
    labels[field.id] = field.name;
    return labels;
  }, {});
  const customFieldEntries = Object.entries(request.field_values || request.custom_field_values || {})
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([field, value]) => ({
      id: field,
      label: customFieldLabels[field] || field,
      value
    }));
  const hasCity = request.city && request.city !== 'N/A';
  const hasPhone = Boolean(request.phone_number);
  const hasLocation = Boolean(request.location_link);

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
            <span className="text-sm text-gray-600">Request Details</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${typeInfo.bgColor}`}>
                    <TypeIcon className={`w-7 h-7 ${typeInfo.iconColor}`} />
                  </div>
                  <div>
                    <Badge variant="outline" className={typeInfo.color}>
                      {request.request_type_name || typeInfo.label}
                    </Badge>
                    <h1 className="font-heading text-xl md:text-2xl font-bold text-gray-900 mt-1">
                      {request.branch_name}
                    </h1>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Select 
                    value={request.status} 
                    onValueChange={updateStatus}
                    disabled={updating}
                  >
                    <SelectTrigger className="w-44" data-testid="status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">
                        <span className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          New
                        </span>
                      </SelectItem>
                      <SelectItem value="in_progress">
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4" />
                          In Progress
                        </span>
                      </SelectItem>
                      <SelectItem value="completed">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Completed
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Request Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-heading">Request Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasCity && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">City</p>
                      <p className="font-medium">{request.city}</p>
                    </div>
                  </div>
                )}

                {hasPhone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Phone Number</p>
                      <p className="font-medium">{request.phone_number}</p>
                    </div>
                  </div>
                )}

                {hasLocation && (
                  <div className="flex items-start gap-3">
                    <LinkIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Google Maps Link</p>
                      <div className="flex items-center gap-2 mt-1">
                        <a 
                          href={request.location_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm truncate max-w-[200px]"
                        >
                          {request.location_link}
                        </a>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyLink}
                          className="shrink-0"
                          data-testid="copy-link-btn"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {request.notes && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Notes</p>
                      <p className="text-gray-700">{request.notes}</p>
                    </div>
                  </div>
                )}

                {!hasCity && !hasPhone && !hasLocation && !request.notes && (
                  <p className="text-sm text-gray-500">Request details are shown in the submitted fields below.</p>
                )}
              </CardContent>
            </Card>

            {/* Assignment & Timestamps */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-heading">Assignment & Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Assignment Section - Manager Only */}
                {isManager && (
                  <div className="flex items-start gap-3">
                    <UserCheck className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 mb-2">Assigned To</p>
                      <Select 
                        value={request.assigned_to || "unassigned"} 
                        onValueChange={(value) => value !== "unassigned" && assignRequest(value)}
                        disabled={updating}
                      >
                        <SelectTrigger data-testid="assign-select">
                          <SelectValue placeholder="Select Supervisor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned" disabled>
                            <span className="text-gray-400">Unassigned</span>
                          </SelectItem>
                          {supervisors.map((sup) => (
                            <SelectItem key={sup.id} value={sup.id}>
                              <span className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                {sup.username} ({sup.category?.replace('_', ' ')})
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {!isManager && request.assigned_to_name && (
                  <div className="flex items-start gap-3">
                    <UserCheck className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Assigned To</p>
                      <p className="font-medium">{request.assigned_to_name}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Date Submitted</p>
                    <p className="font-medium">{formatDate(request.created_at)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Last Updated</p>
                    <p className="font-medium">{formatDate(request.updated_at)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <StatusIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Current Status</p>
                    <Badge className={`${statusInfo.color} mt-1`}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {customFieldEntries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Submitted Fields
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {customFieldEntries.map((field) => (
                    <div key={field.id} className="rounded-lg border bg-gray-50 p-4">
                      <p className="text-sm text-gray-500">{field.label}</p>
                      <p className="font-medium text-gray-900 break-words mt-1">
                        {formatFieldValue(field.value)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Photos Section (for new branch requests) */}
          {request.request_type === 'new' && request.photos && request.photos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Branch Photos ({request.photos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {request.photos.map((photo, index) => {
                    const photoKey = `photo-${request.id}-${index}`;
                    return (
                      <div key={photoKey} className="relative group">
                        <img
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setSelectedImage(photo)}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => downloadImage(photo, index)}
                          data-testid={`download-photo-${index}`}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Back Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => navigate('/admin/dashboard')}
              className="gap-2"
              data-testid="back-to-dashboard-btn"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </main>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="View Image"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
