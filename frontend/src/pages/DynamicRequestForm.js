import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft, Send, CheckCircle, Loader2, FileText, Calendar, Hash, 
  List, Upload, CheckSquare, ListChecks, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { API_URL } from '@/config';

const API = API_URL;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_3367f2a2-798d-4b61-99bb-befe08ab3864/artifacts/8ejiuqqy_Aljabr-Laundry-Main-Logo-.png";

const FIELD_ICONS = {
  text: FileText,
  number: Hash,
  date: Calendar,
  dropdown: List,
  file: Upload,
  checkbox: CheckSquare,
  multiselect: ListChecks
};

export default function DynamicRequestForm() {
  const { typeId } = useParams();
  const navigate = useNavigate();
  const [requestType, setRequestType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({});

  useEffect(() => {
    const fetchRequestType = async () => {
      try {
        const response = await axios.get(`${API}/public/request-types`);
        const type = response.data.find(t => t.id === typeId);
        if (type) {
          // Fetch full details
          const fullTypeRes = await axios.get(`${API}/public/request-type/${typeId}`);
          setRequestType(fullTypeRes.data);
        } else {
          setError('Request type not found');
        }
      } catch (err) {
        setError('Failed to load request type');
      } finally {
        setLoading(false);
      }
    };
    fetchRequestType();
  }, [typeId]);

  const updateFieldValue = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    for (const field of requestType.custom_fields || []) {
      if (field.required && !formData[field.id]) {
        toast.error(`Please fill in the required field: ${field.name}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/dynamic-requests`, {
        request_type_id: typeId,
        field_values: formData
      });

      setSubmitted(true);
      toast.success('Request submitted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field) => {
    const value = formData[field.id] || '';

    switch (field.field_type) {
      case 'text':
        return (
          <Input
            value={value}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            placeholder={field.description || `Enter ${field.name}`}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            placeholder={field.description || `Enter ${field.name}`}
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
          />
        );

      case 'dropdown':
        return (
          <Select value={value} onValueChange={(v) => updateFieldValue(field.id, v)}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.name}`} />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={value === true || value === 'true'}
              onCheckedChange={(checked) => updateFieldValue(field.id, checked)}
            />
            <span className="text-sm text-gray-600">{field.description || field.name}</span>
          </div>
        );

      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {(field.options || []).map((option) => (
              <div key={option} className="flex items-center gap-2">
                <Checkbox
                  checked={selectedValues.includes(option)}
                  onCheckedChange={(checked) => {
                    const newValues = checked
                      ? [...selectedValues, option]
                      : selectedValues.filter(v => v !== option);
                    updateFieldValue(field.id, newValues);
                  }}
                />
                <span className="text-sm">{option}</span>
              </div>
            ))}
          </div>
        );

      case 'file':
        return (
          <Input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                  updateFieldValue(field.id, {
                    name: file.name,
                    data: reader.result
                  });
                };
                reader.readAsDataURL(file);
              }
            }}
          />
        );

      default:
        return (
          <Textarea
            value={value}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            placeholder={`Enter ${field.name}`}
            rows={3}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !requestType) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-10 pb-8">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Request Type Not Found</h2>
            <p className="text-gray-500 mb-4">{error || 'The request type you are looking for does not exist.'}</p>
            <Link to="/">
              <Button>Go Back Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-10 pb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="font-heading text-2xl font-bold text-gray-900 mb-3">
              Request Submitted!
            </h2>
            <p className="text-gray-600 mb-6">
              Your request has been submitted successfully. The team will review it shortly.
            </p>
            <Link to="/">
              <Button className="w-full">Back to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <Link to="/" aria-label="Go to home page">
              <img src={LOGO_URL} alt="Aljabr Laundry" className="h-10 object-contain" />
            </Link>
            <div>
              <h1 className="font-heading text-lg font-bold">{requestType.name}</h1>
              <p className="text-xs text-gray-500">{requestType.description || 'Submit a request'}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
              <CardDescription>Please fill in the required information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {requestType.custom_fields && requestType.custom_fields.length > 0 ? (
                requestType.custom_fields.map((field) => {
                  const Icon = FIELD_ICONS[field.field_type] || FileText;
                  return (
                    <div key={field.id} className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-gray-400" />
                        {field.name}
                        {field.required && <span className="text-red-500">*</span>}
                      </Label>
                      {renderField(field)}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No additional information required.</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full py-6 text-lg bg-primary hover:bg-primary/90"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </form>
      </main>
    </div>
  );
}
