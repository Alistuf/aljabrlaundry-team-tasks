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
  GitBranch, ArrowRight, Image, Loader2, X
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <img src={LOGO_URL} alt="Aljabr Laundry" className="h-10 object-contain" />
              <div>
                <h1 className="font-heading text-lg font-bold">Manage Request Types</h1>
                <p className="text-xs text-gray-500">Add request types with workflow steps</p>
              </div>
            </div>
            <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700" data-testid="create-request-type-btn">
              <Plus className="w-4 h-4 mr-2" />
              New Request Type
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
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
          <div className="grid gap-4">
            {requestTypes.map((type) => (
              <Card key={type.id} className={`${!type.is_active ? 'opacity-60' : ''}`} data-testid={`request-type-card-${type.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">{type.name}</CardTitle>
                      <Badge variant={type.is_active ? 'default' : 'secondary'}>
                        {type.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {type.workflow_steps?.length > 0 && (
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                          <GitBranch className="w-3 h-3 mr-1" />
                          {type.workflow_steps.length} Steps
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={type.is_active}
                        onCheckedChange={() => toggleActive(type)}
                      />
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(type)} data-testid={`edit-type-${type.id}`}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDelete(type.id)} data-testid={`delete-type-${type.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-3">{type.description || 'No description'}</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="text-gray-600">
                      <strong>{type.custom_fields?.length || 0}</strong> Form Fields
                    </span>
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingType ? 'Edit Request Type' : 'Create Request Type'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Marketing Material Request"
                  data-testid="request-type-name-input"
                />
              </div>
              {formData.workflow_steps.length === 0 && (
                <div className="space-y-2">
                  <Label>Assign to Team Member</Label>
                  <Select
                    value={formData.assigned_to || "unassigned"}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_to: value === "unassigned" ? "" : value }))}
                  >
                    <SelectTrigger>
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

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this request type is for..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Card Image</Label>
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
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    {uploadingImage ? (
                      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    ) : (
                      <>
                        <Image className="w-8 h-8 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-500">Click to upload image</span>
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
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center gap-2 pt-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <span className="text-sm">{formData.is_active ? 'Active (visible on Landing Page)' : 'Inactive'}</span>
                </div>
              </div>
            </div>

            {/* Custom Fields */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Form Fields</Label>
                <Button type="button" variant="outline" size="sm" onClick={addCustomField} data-testid="add-field-btn">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Field
                </Button>
              </div>

              {formData.custom_fields.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                  No custom fields added yet. Add fields to create a form for this request type.
                </p>
              ) : (
                <div className="space-y-3">
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-indigo-600" />
                    Workflow Steps
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">
                    Define the steps this request goes through. Each step is assigned to a team member.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addWorkflowStep} data-testid="add-step-btn">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Step
                </Button>
              </div>

              {formData.workflow_steps.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                  <p>No workflow steps. Request will be assigned directly to one person.</p>
                  <p className="text-xs mt-1">Add steps to create a multi-step approval workflow.</p>
                </div>
              ) : (
                <div className="space-y-3">
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="save-request-type-btn">
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
