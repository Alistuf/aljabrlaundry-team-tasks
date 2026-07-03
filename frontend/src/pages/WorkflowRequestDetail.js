import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, CheckCircle2, Clock, Upload, FileText, Download, Loader2,
  GitBranch, AlertCircle, XCircle, User
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { API_URL } from '@/config';

const API = API_URL;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_3367f2a2-798d-4b61-99bb-befe08ab3864/artifacts/8ejiuqqy_Aljabr-Laundry-Main-Logo-.png";

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: Loader2 },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle }
};

export default function WorkflowRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadNotes, setUploadNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const headers = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const fetchRequest = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/workflow-requests/${id}`, headers);
      setRequest(res.data);
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('Request not found');
        navigate('/admin/dashboard');
      }
    } finally {
      setLoading(false);
    }
  }, [id, headers, navigate]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  const handleFileUpload = async (stepId, requiresFile = true) => {
    if (requiresFile && !selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      formData.append('step_id', stepId);
      formData.append('notes', uploadNotes);

      await axios.post(
        `${API}/workflow-requests/${id}/upload-step-file`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );

      toast.success('Step completed successfully!');
      setSelectedFile(null);
      setUploadNotes('');
      fetchRequest();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to complete step');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this request?')) return;

    try {
      await axios.patch(`${API}/workflow-requests/${id}/cancel`, {}, headers);
      toast.success('Request cancelled');
      fetchRequest();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel request');
    }
  };

  const handleDownload = async (fileId, filename) => {
    try {
      const response = await axios.get(
        `${API}/workflow-requests/${id}/download-file/${fileId}`,
        { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md text-center">
          <CardContent className="pt-8 pb-6">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Request Not Found</h2>
            <Link to="/admin/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusInfo.icon;
  const workflowSteps = request.workflow_steps || [];
  const currentStepNum = request.current_step || 1;
  const isCompleted = request.status === 'completed';
  const isCancelled = request.status === 'cancelled';

  // Find current step
  const currentStep = workflowSteps.find(s => s.step_number === currentStepNum);
  const isCurrentStepAssignee = currentStep?.assigned_to === user?.id;
  const isManagerUser = user?.role === 'manager';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Link to="/admin/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <img src={LOGO_URL} alt="Aljabr Laundry" className="h-10 object-contain" />
            <div className="flex-1">
              <h1 className="font-heading text-lg font-bold">{request.title}</h1>
              <p className="text-xs text-gray-500">{request.request_type_name}</p>
            </div>
            <Badge className={`${statusInfo.color} flex items-center gap-1`} data-testid="workflow-status-badge">
              <StatusIcon className="w-3 h-3" />
              {statusInfo.label}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid gap-6">
          {/* Request Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Request Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Submitted By</p>
                  <p className="font-medium">{request.submitted_by_name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Date</p>
                  <p className="font-medium">
                    {new Date(request.created_at).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Progress</p>
                  <p className="font-medium">
                    Step {isCompleted ? request.total_steps : Math.max(0, currentStepNum - 1)} of {request.total_steps} completed
                  </p>
                </div>
              </div>

              {/* Custom field values */}
              {request.custom_field_values && Object.keys(request.custom_field_values).length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <h4 className="font-medium text-gray-700 mb-3">Form Data</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {request.custom_fields?.map((field) => {
                      const value = request.custom_field_values[field.id];
                      if (value === undefined || value === null) return null;
                      
                      // File field - has name and data (base64)
                      const isFile = typeof value === 'object' && value.name && value.data;
                      
                      if (isFile) {
                        return (
                          <div key={field.id} className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">{field.name}</p>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                <span className="font-medium text-sm truncate">{value.name}</span>
                              </div>
                              <a
                                href={value.data}
                                download={value.name}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors flex-shrink-0"
                                data-testid={`download-field-${field.id}`}
                              >
                                <Download className="w-3.5 h-3.5" />
                                Download
                              </a>
                            </div>
                          </div>
                        );
                      }

                      let displayValue = value;
                      if (Array.isArray(value)) displayValue = value.join(', ');
                      if (typeof value === 'boolean') displayValue = value ? 'Yes' : 'No';
                      if (typeof value === 'object' && value.name) displayValue = value.name;

                      return (
                        <div key={field.id} className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500">{field.name}</p>
                          <p className="font-medium text-sm">{String(displayValue)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workflow Steps Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-indigo-600" />
                Workflow Progress
              </CardTitle>
              <CardDescription>
                Track the progress of each step in the workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {workflowSteps.map((step, index) => {
                  const stepFile = request.step_files?.find(f => f.step_id === step.id);
                  const isStepCompleted = stepFile || (isCompleted && step.step_number <= request.total_steps);
                  const isCurrentStep = !isCompleted && !isCancelled && step.step_number === currentStepNum;
                  const isFutureStep = !isCompleted && step.step_number > currentStepNum;

                  return (
                    <div key={step.id} data-testid={`workflow-step-${step.step_number}`}>
                      <div className={`flex gap-4 p-4 rounded-lg border-2 transition-all ${
                        isCurrentStep ? 'border-indigo-300 bg-indigo-50' :
                        isStepCompleted ? 'border-green-200 bg-green-50' :
                        'border-gray-200 bg-gray-50 opacity-60'
                      }`}>
                        {/* Step Number Circle */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          isStepCompleted ? 'bg-green-500 text-white' :
                          isCurrentStep ? 'bg-indigo-500 text-white' :
                          'bg-gray-300 text-gray-600'
                        }`}>
                          {isStepCompleted ? <CheckCircle2 className="w-5 h-5" /> : step.step_number}
                        </div>

                        {/* Step Content */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{step.name}</h4>
                            {isCurrentStep && (
                              <Badge className="bg-indigo-100 text-indigo-800 text-xs">Current Step</Badge>
                            )}
                            {isStepCompleted && (
                              <Badge className="bg-green-100 text-green-800 text-xs">Completed</Badge>
                            )}
                          </div>
                          
                          {step.description && (
                            <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                          )}
                          
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <User className="w-3 h-3" />
                            <span>Assigned to: <strong>{step.assigned_to_name || 'Unassigned'}</strong></span>
                          </div>

                          {/* Completed step file info */}
                          {stepFile && (
                            <div className="mt-3 bg-white rounded-lg p-3 border">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-gray-500" />
                                  <div>
                                    <p className="text-sm font-medium">{stepFile.filename}</p>
                                    <p className="text-xs text-gray-500">
                                      Uploaded by {stepFile.uploaded_by_name} on{' '}
                                      {new Date(stepFile.uploaded_at).toLocaleDateString('en-US', {
                                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownload(stepFile.id, stepFile.filename)}
                                  data-testid={`download-file-step-${step.step_number}`}
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  Download
                                </Button>
                              </div>
                              {stepFile.notes && (
                                <p className="text-sm text-gray-600 mt-2 italic">"{stepFile.notes}"</p>
                              )}
                            </div>
                          )}

                          {/* Upload form for current step (only for assigned user or manager) */}
                          {isCurrentStep && !isCancelled && (isCurrentStepAssignee || isManagerUser) && step.requires_file && (
                            <div className="mt-4 bg-white rounded-lg p-4 border-2 border-dashed border-indigo-300">
                              <h5 className="font-medium text-sm mb-3 flex items-center gap-2">
                                <Upload className="w-4 h-4 text-indigo-500" />
                                Complete This Step
                              </h5>
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-xs text-gray-500">Upload File (PDF, XLSX, XLS)</Label>
                                  <Input
                                    type="file"
                                    accept=".pdf,.xlsx,.xls"
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                    data-testid={`step-file-input-${step.step_number}`}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500">Notes (optional)</Label>
                                  <Textarea
                                    value={uploadNotes}
                                    onChange={(e) => setUploadNotes(e.target.value)}
                                    placeholder="Add any notes about this step..."
                                    rows={2}
                                  />
                                </div>
                                <Button
                                  onClick={() => handleFileUpload(step.id, true)}
                                  disabled={uploading || !selectedFile}
                                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                                  data-testid={`complete-step-btn-${step.step_number}`}
                                >
                                  {uploading ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Uploading...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-4 h-4 mr-2" />
                                      Complete Step {step.step_number}
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Show message for non-file steps */}
                          {isCurrentStep && !isCancelled && (isCurrentStepAssignee || isManagerUser) && !step.requires_file && (
                            <div className="mt-4 bg-white rounded-lg p-4 border-2 border-dashed border-indigo-300">
                              <h5 className="font-medium text-sm mb-3 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                                Complete This Step
                              </h5>
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-xs text-gray-500">Notes (optional)</Label>
                                  <Textarea
                                    value={uploadNotes}
                                    onChange={(e) => setUploadNotes(e.target.value)}
                                    placeholder="Add any notes about this step..."
                                    rows={2}
                                  />
                                </div>
                                <Button
                                  onClick={() => handleFileUpload(step.id, false)}
                                  disabled={uploading}
                                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                                  data-testid={`complete-step-btn-${step.step_number}`}
                                >
                                  {uploading ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-4 h-4 mr-2" />
                                      Complete Step {step.step_number}
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Connector line between steps */}
                      {index < workflowSteps.length - 1 && (
                        <div className="flex justify-start ml-8 py-1">
                          <div className={`w-0.5 h-6 ${
                            isStepCompleted ? 'bg-green-400' : 'bg-gray-300'
                          }`} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between">
            <Link to="/admin/dashboard">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </Link>
            {!isCompleted && !isCancelled && (isManagerUser || request.submitted_by === user?.id) && (
              <Button
                variant="destructive"
                onClick={handleCancel}
                data-testid="cancel-workflow-btn"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel Request
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
