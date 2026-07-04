import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  ArrowLeft, Plus, Trash2, Edit, Settings, GripVertical,
  FileText, Hash, Calendar, List, Upload, CheckSquare, ListChecks, Save, Users,
  GitBranch, ArrowRight, Image, Loader2, X, MapPin, Shield, Bell, User, TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { API_URL, apiAssetUrl } from '@/config';

const API = API_URL;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_3367f2a2-798d-4b61-99bb-befe08ab3864/artifacts/8ejiuqqy_Aljabr-Laundry-Main-Logo-.png";

const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: FileText },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'dropdown', label: 'Dropdown', icon: List },
  { value: 'file', label: 'File Upload', icon: Upload },
  { value: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { value: 'multiselect', label: 'Multi-select', icon: ListChecks },
];

export default function RequestTypesAdmin() {
  const navigate = useNavigate();
  const { token, logout, isManager } = useAuth();
  const [requestTypes, setRequestTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    assigned_to: '',
    image_url: '',
    is_active: true,
    custom_fields: [],
    workflow_steps: []
  });

  const headers = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const fetchData = useCallback(async () => {
    try {
      const [typesRes, usersRes] = await Promise.all([
        axios.get(`${API}/request-types`, headers),
        axios.get(`${API}/users`, headers)
      ]);
      setRequestTypes(typesRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
        navigate('/admin/login');
      }
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [headers, logout, navigate]);

  useEffect(() => {
    if (!isManager) {
      navigate('/admin/dashboard');
      return;
    }
    fetchData();
  }, [fetchData, isManager, navigate]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      assigned_to: '',
      image_url: '',
      is_active: true,
      custom_fields: [],
      workflow_steps: []
    });
    setEditingType(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (type) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      description: type.description || '',
      assigned_to: type.assigned_to || '',
      image_url: type.image_url || '',
      is_active: type.is_active,
      custom_fields: type.custom_fields || [],
      workflow_steps: type.workflow_steps || []
    });
    setShowDialog(true);
  };

  const addCustomField = () => {
    setFormData(prev => ({
      ...prev,
      custom_fields: [...prev.custom_fields, {
        id: `field-${Date.now()}`,
        name: '',
        field_type: 'text',
        required: false,
        options: [],
        description: ''
      }]
    }));
  };

  const updateCustomField = (index, updates) => {
    setFormData(prev => ({
      ...prev,
      custom_fields: prev.custom_fields.map((field, i) => 
        i === index ? { ...field, ...updates } : field
      )
    }));
  };

  const removeCustomField = (index) => {
    setFormData(prev => ({
      ...prev,
      custom_fields: prev.custom_fields.filter((_, i) => i !== index)
    }));
  };

  // Workflow steps management
  const addWorkflowStep = () => {
    const nextNum = formData.workflow_steps.length + 1;
    setFormData(prev => ({
      ...prev,
      workflow_steps: [...prev.workflow_steps, {
        id: `step-${Date.now()}`,
        step_number: nextNum,
        name: '',
        description: '',
        assigned_to: '',
        assigned_to_name: '',
        requires_file: true,
        allowed_file_types: ['pdf', 'xlsx', 'xls']
      }]
    }));
  };

  const updateWorkflowStep = (index, updates) => {
    setFormData(prev => ({
      ...prev,
      workflow_steps: prev.workflow_steps.map((step, i) => 
        i === index ? { ...step, ...updates } : step
      )
    }));
  };

  const removeWorkflowStep = (index) => {
    setFormData(prev => ({
      ...prev,
      workflow_steps: prev.workflow_steps
        .filter((_, i) => i !== index)
        .map((step, i) => ({ ...step, step_number: i + 1 }))
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploadingImage(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);

      const res = await axios.post(`${API}/upload-image`, uploadData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });

      const imageUrl = apiAssetUrl(res.data.url);
      setFormData(prev => ({ ...prev, image_url: imageUrl }));
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image_url: '' }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a request type name');
      return;
    }

    // Validate workflow steps
    for (const step of formData.workflow_steps) {
      if (!step.name.trim()) {
        toast.error('Please enter a name for all workflow steps');
        return;
      }
    }

    setSaving(true);
    try {
      if (editingType) {
        await axios.patch(`${API}/request-types/${editingType.id}`, formData, headers);
        toast.success('Request type updated');
      } else {
        await axios.post(`${API}/request-types`, formData, headers);
        toast.success('Request type created');
      }
      setShowDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (typeId) => {
    if (!window.confirm('Are you sure you want to delete this request type?')) return;

    try {
      await axios.delete(`${API}/request-types/${typeId}`, headers);
      toast.success('Request type deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const toggleActive = async (type) => {
    try {
      await axios.patch(`${API}/request-types/${type.id}`, { is_active: !type.is_active }, headers);
      toast.success(`Request type ${!type.is_active ? 'activated' : 'deactivated'}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-topbar">
        <div className="app-topbar-inner">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-6">
              <Link to="/admin/dashboard" className="icon-btn-soft">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <Link to="/" aria-label="Go to home page">
                <img src={LOGO_URL} alt="Aljabr Laundry" className="app-logo" />
              </Link>
              <div className="hidden h-12 w-px bg-slate-200 md:block" />
              <div>
                <h1 className="font-heading text-2xl font-extrabold text-slate-950">Dashboard</h1>
                <p className="text-base text-slate-400">Branch Management System</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <Badge className="hidden rounded-full border border-blue-200 bg-blue-50 px-6 py-3 text-base font-semibold text-blue-700 hover:bg-blue-50 md:flex">
                <span className="h-3 w-3 rounded-full bg-blue-600" />
                Manager
              </Badge>
              <Bell className="h-6 w-6 text-slate-600" />
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                MA
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-none px-10 py-10">
        <div className="mb-10 inline-flex flex-wrap gap-2 rounded-[26px] border border-slate-200 bg-white p-3 shadow-[0_8px_18px_rgba(15,23,42,0.07)]">
          <Button variant="outline" onClick={() => navigate('/admin/dashboard')} className="h-14 rounded-[18px] border-transparent bg-white px-7 text-xl font-semibold text-slate-500 shadow-none hover:bg-slate-50">
            <MapPin className="h-6 w-6" />
            Requests
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/dashboard')} className="h-14 rounded-[18px] border-transparent bg-white px-7 text-xl font-semibold text-slate-500 shadow-none hover:bg-slate-50">
            <GitBranch className="h-6 w-6" />
            Workflow Requests
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/dashboard')} className="h-14 rounded-[18px] border-transparent bg-white px-7 text-xl font-semibold text-slate-500 shadow-none hover:bg-slate-50">
            <Users className="h-6 w-6" />
            Team Management
          </Button>
          <Button className="h-14 rounded-[18px] bg-blue-600 px-7 text-xl font-semibold text-white shadow-none hover:bg-blue-700">
            <FileText className="h-6 w-6" />
            Request Types
          </Button>
        </div>

        <div className="mb-10 grid grid-cols-2 gap-6 md:grid-cols-4">
          <Card className="metric-card">
            <CardContent className="p-0">
              <div className="mb-6 flex items-center justify-between">
                <p className="text-xl text-slate-500">Total Requests</p>
                <TrendingUp className="h-7 w-7 text-slate-300" />
              </div>
              <p className="text-5xl font-extrabold text-slate-950">{requestTypes.length}</p>
            </CardContent>
          </Card>
          <Card className="metric-card">
            <CardContent className="p-0">
              <div className="mb-6 flex items-center justify-between">
                <p className="text-xl text-slate-500">New Requests</p>
                <TrendingUp className="h-7 w-7 text-blue-200" />
              </div>
              <p className="text-5xl font-extrabold text-blue-600">{requestTypes.filter(t => t.is_active).length}</p>
              <p className="mt-4 text-base text-slate-400">Active request types</p>
            </CardContent>
          </Card>
          <Card className="metric-card">
            <CardContent className="p-0">
              <div className="mb-6 flex items-center justify-between">
                <p className="text-xl text-slate-500">In Progress</p>
                <TrendingUp className="h-7 w-7 text-orange-200" />
              </div>
              <p className="text-5xl font-extrabold text-orange-500">0</p>
            </CardContent>
          </Card>
          <Card className="metric-card">
            <CardContent className="p-0">
              <div className="mb-6 flex items-center justify-between">
                <p className="text-xl text-slate-500">Completed</p>
                <TrendingUp className="h-7 w-7 text-emerald-200" />
              </div>
              <p className="text-5xl font-extrabold text-emerald-600">0</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 flex justify-end">
          <Button onClick={openCreateDialog} className="h-14 rounded-[18px] bg-blue-600 px-8 text-xl font-semibold text-white shadow-[0_10px_20px_rgba(37,99,235,0.22)] hover:bg-blue-700" data-testid="create-request-type-btn">
            <Plus className="mr-2 h-6 w-6" />
            New Request Type
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : requestTypes.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Custom Request Types</h3>
              <p className="text-gray-500 mb-4">Create request types with workflow steps to show on the Landing Page</p>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Create Request Type
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {requestTypes.map((type) => (
              <Card key={type.id} className={`rounded-[24px] border-slate-200 bg-white shadow-[0_8px_18px_rgba(15,23,42,0.06)] ${!type.is_active ? 'opacity-60' : ''}`} data-testid={`request-type-card-${type.id}`}>
                <CardHeader className="px-8 py-7">
                  <div className="flex items-center justify-between">
                    <div className="space-y-5">
                      <div className="flex items-center gap-5">
                      <CardTitle className="font-heading text-3xl font-extrabold text-slate-950">{type.name}</CardTitle>
                      <Badge className="rounded-full bg-blue-50 px-5 py-2 text-base font-bold text-blue-700 hover:bg-blue-50">
                        {type.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {type.workflow_steps?.length > 0 && (
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                          <GitBranch className="w-3 h-3 mr-1" />
                          {type.workflow_steps.length} Steps
                        </Badge>
                      )}
                      </div>
                      <p className="text-xl text-slate-500">{type.description || 'No description'}</p>
                      <div className="flex flex-wrap gap-8 text-lg text-slate-500">
                        <span><strong>{type.custom_fields?.length || 0}</strong> Form Fields</span>
                        <span className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Assigned to: <strong className="text-slate-700">{type.assigned_to_name || 'Unassigned'}</strong>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={type.is_active}
                        onCheckedChange={() => toggleActive(type)}
                      />
                      <Button variant="outline" size="icon" className="h-12 w-12 rounded-[14px] border-slate-200" onClick={() => openEditDialog(type)} data-testid={`edit-type-${type.id}`}>
                        <Edit className="h-5 w-5" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-12 w-12 rounded-[14px] border-slate-200 text-red-500" onClick={() => handleDelete(type.id)} data-testid={`delete-type-${type.id}`}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="hidden">
                    {type.workflow_steps?.length > 0 ? (
                      <div className="flex items-center gap-1 text-indigo-600">
                        <GitBranch className="w-4 h-4" />
                        <span>Workflow: </span>
                        {type.workflow_steps.map((step, idx) => (
                          <span key={step.id} className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {step.name} ({step.assigned_to_name || 'Unassigned'})
                            </Badge>
                            {idx < type.workflow_steps.length - 1 && <ArrowRight className="w-3 h-3 text-gray-400" />}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-600 flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        Assigned to: <strong>{type.assigned_to_name || 'Unassigned'}</strong>
                      </span>
                    )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden rounded-[24px] border-0 p-0 shadow-[0_26px_70px_rgba(15,23,42,0.28)]">
          <DialogHeader className="border-b border-slate-100 px-10 py-6 text-left">
            <DialogTitle className="font-heading text-3xl font-extrabold text-slate-950">{editingType ? 'Edit Request Type' : 'Create Request Type'}</DialogTitle>
          </DialogHeader>

          <div className="max-h-[70vh] space-y-8 overflow-y-auto px-10 py-8">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="soft-label">Name <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Marketing Material Request"
                  className="soft-input"
                  data-testid="request-type-name-input"
                />
              </div>
              {formData.workflow_steps.length === 0 && (
                <div className="space-y-3">
                  <Label className="soft-label">Assign to Team Member</Label>
                  <Select
                    value={formData.assigned_to || "unassigned"}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_to: value === "unassigned" ? "" : value }))}
                  >
                    <SelectTrigger className="soft-input">
                      <SelectValue placeholder="Select employee..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.username} ({user.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label className="soft-label">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this request type is for..."
                className="soft-textarea"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="soft-label">Card Image</Label>
                {formData.image_url ? (
                  <div className="relative group">
                    <img
                      src={formData.image_url}
                      alt="Card preview"
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      data-testid="remove-image-btn"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-[18px] border-2 border-dashed border-slate-300 transition-colors hover:border-blue-400 hover:bg-blue-50">
                    {uploadingImage ? (
                      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                    ) : (
                      <>
                        <Image className="mb-4 h-10 w-10 text-slate-300" />
                        <span className="text-lg text-slate-400">Click to upload image</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      data-testid="card-image-upload"
                    />
                  </label>
                )}
              </div>
              <div className="space-y-3">
                <Label className="soft-label">Status</Label>
                <div className="flex items-center gap-5 pt-3">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <span className="text-lg text-slate-500">{formData.is_active ? 'Active (visible on Landing Page)' : 'Inactive'}</span>
                </div>
              </div>
            </div>

            {/* Custom Fields */}
            <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <Label className="text-xl font-bold text-slate-700">Form Fields</Label>
                <Button type="button" variant="outline" className="h-12 rounded-[14px] border-slate-200 px-5 text-base" onClick={addCustomField} data-testid="add-field-btn">
                  <Plus className="mr-2 h-5 w-5" />
                  Add Field
                </Button>
              </div>

              {formData.custom_fields.length === 0 ? (
                <p className="py-10 text-center text-lg text-slate-400">
                  No custom fields added yet. Add fields to create a form for this request type.
                </p>
              ) : (
                <div className="space-y-3 p-5">
                  {formData.custom_fields.map((field, index) => (
                    <Card key={field.id} className="p-3">
                      <div className="flex gap-3 items-start">
                        <GripVertical className="w-5 h-5 text-gray-400 mt-2 cursor-move" />
                        <div className="flex-1 grid grid-cols-4 gap-3">
                          <Input
                            placeholder="Field Name"
                            value={field.name}
                            onChange={(e) => updateCustomField(index, { name: e.target.value })}
                          />
                          <Select
                            value={field.field_type}
                            onValueChange={(value) => updateCustomField(index, { field_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FIELD_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {(field.field_type === 'dropdown' || field.field_type === 'multiselect') && (
                            <Input
                              placeholder="Options (comma-separated)"
                              value={field.options?.join(', ') || ''}
                              onChange={(e) => updateCustomField(index, { 
                                options: e.target.value.split(',').map(o => o.trim()).filter(Boolean)
                              })}
                            />
                          )}
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={field.required}
                              onCheckedChange={(checked) => updateCustomField(index, { required: checked })}
                            />
                            <span className="text-xs">Required</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => removeCustomField(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Workflow Steps */}
            <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <Label className="flex items-center gap-3 text-xl font-bold text-slate-700">
                    <GitBranch className="h-5 w-5 text-blue-600" />
                    Workflow Steps
                  </Label>
                  <p className="mt-1 text-sm text-slate-400">
                    Define the steps this request goes through. Each step is assigned to a team member.
                  </p>
                </div>
                <Button type="button" variant="outline" className="h-12 rounded-[14px] border-slate-200 px-5 text-base" onClick={addWorkflowStep} data-testid="add-step-btn">
                  <Plus className="mr-2 h-5 w-5" />
                  Add Step
                </Button>
              </div>

              {formData.workflow_steps.length === 0 ? (
                <div className="py-10 text-center text-lg text-slate-400">
                  <p>No workflow steps. Request will be assigned directly to one person.</p>
                </div>
              ) : (
                <div className="space-y-3 p-5">
                  {formData.workflow_steps.map((step, index) => (
                    <Card key={step.id} className="p-4 border-l-4 border-l-indigo-500">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-500">Step Name *</Label>
                            <Input
                              placeholder="e.g., Design Review"
                              value={step.name}
                              onChange={(e) => updateWorkflowStep(index, { name: e.target.value })}
                              data-testid={`step-name-${index}`}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-500">Assigned To *</Label>
                            <Select
                              value={step.assigned_to}
                              onValueChange={(value) => updateWorkflowStep(index, { assigned_to: value })}
                            >
                              <SelectTrigger data-testid={`step-assigned-${index}`}>
                                <SelectValue placeholder="Select employee..." />
                              </SelectTrigger>
                              <SelectContent>
                                {users.map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.name || user.username} ({user.role})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-500">Description (optional)</Label>
                            <Input
                              placeholder="What needs to be done in this step?"
                              value={step.description}
                              onChange={(e) => updateWorkflowStep(index, { description: e.target.value })}
                            />
                          </div>
                          <div className="flex items-end gap-4">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={step.requires_file}
                                onCheckedChange={(checked) => updateWorkflowStep(index, { requires_file: checked })}
                              />
                              <span className="text-xs text-gray-600">Requires File Upload</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 flex-shrink-0"
                          onClick={() => removeWorkflowStep(index)}
                          data-testid={`remove-step-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      {index < formData.workflow_steps.length - 1 && (
                        <div className="flex items-center justify-center mt-3">
                          <ArrowRight className="w-5 h-5 text-indigo-400" />
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 px-10 py-7">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="h-14 rounded-[18px] border-slate-200 px-8 text-lg">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="h-14 rounded-[18px] bg-blue-600 px-8 text-lg font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300" data-testid="save-request-type-btn">
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
