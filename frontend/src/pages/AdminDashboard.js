import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  LogOut, Bell, Search, MapPin, Plus, Users, UserPlus, Settings,
  Clock, CheckCircle2, Loader2, RefreshCw, Eye, Shield, User, Trash2, AlertCircle,
  FileText, GitBranch, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth, ROLE_MANAGER, ROLE_SUPERVISOR } from '@/context/AuthContext';
import axios from 'axios';
import { API_URL } from '@/config';

const API = API_URL;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_3367f2a2-798d-4b61-99bb-befe08ab3864/artifacts/8ejiuqqy_Aljabr-Laundry-Main-Logo-.png";
const POLLING_INTERVAL = 30000;

// Saudi Cities in English
const SAUDI_CITIES = [
  "Riyadh", "Jeddah", "Makkah", "Madinah", "Dammam",
  "Khobar", "Dhahran", "Al Ahsa", "Qatif", "Jubail",
  "Yanbu", "Taif", "Tabuk", "Buraidah", "Unaizah",
  "Hail", "Najran", "Jazan", "Abha", "Khamis Mushait",
  "Al Baha", "Sakaka", "Arar", "Qassim", "Al Kharj"
];

const STATUS_MAP = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-800', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800', icon: Loader2 },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle2 }
};

const REQUEST_TYPE_MAP = {
  edit: { label: 'Edit Info', color: 'bg-primary/10 text-primary', icon: MapPin },
  new: { label: 'New Branch', color: 'bg-secondary/10 text-secondary', icon: Plus },
  dynamic: { label: 'Other', color: 'bg-purple-100 text-purple-800', icon: FileText }
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout, token, isManager } = useAuth();
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ total: 0, new: 0, in_progress: 0, completed: 0 });
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState('requests');
  const [teamMembers, setTeamMembers] = useState([]);
  
  // Team management state
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [addingMember, setAddingMember] = useState(false);
  const [newMember, setNewMember] = useState({
    username: '',
    email: '',
    password: '',
    role: ROLE_SUPERVISOR,
    category: 'google_maps'
  });

  // Request selection state (for bulk delete)
  const [selectedRequests, setSelectedRequests] = useState([]);
  
  // Workflow requests state
  const [workflowRequests, setWorkflowRequests] = useState([]);
  const [workflowStats, setWorkflowStats] = useState({ total: 0, pending: 0, in_progress: 0, completed: 0, cancelled: 0, assigned_to_me: 0 });
  
  // Filters
  const [filters, setFilters] = useState({
    status: '',
    city: '',
    search: ''
  });

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.city) params.append('city', filters.city);
      if (filters.search) params.append('search', filters.search);

      const headers = { headers: { Authorization: `Bearer ${token}` } };

      const [requestsRes, statsRes, notifRes, unreadRes, wfRequestsRes, wfStatsRes] = await Promise.all([
        axios.get(`${API}/requests?${params}`, headers),
        axios.get(`${API}/stats`, headers),
        axios.get(`${API}/notifications`, headers),
        axios.get(`${API}/notifications/unread-count`, headers),
        axios.get(`${API}/workflow-requests`, headers),
        axios.get(`${API}/workflow-stats`, headers)
      ]);

      setRequests(requestsRes.data);
      setStats(statsRes.data);
      setNotifications(notifRes.data);
      setUnreadCount(unreadRes.data.count);
      setWorkflowRequests(wfRequestsRes.data);
      setWorkflowStats(wfStatsRes.data);

      // Fetch team members for managers
      if (isManager) {
        const usersRes = await axios.get(`${API}/users`, headers);
        setTeamMembers(usersRes.data);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  }, [filters, token, isManager, logout, navigate]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/admin/login');
  };

  const markAllRead = async () => {
    try {
      await axios.patch(`${API}/notifications/mark-all-read`, {}, authHeaders);
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('Notifications updated');
    } catch {
      // Silent fail for notifications
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const clearFilters = () => {
    setFilters({ status: '', city: '', search: '' });
  };

  // Add new team member
  const handleAddMember = async () => {
    if (!newMember.username || !newMember.email || !newMember.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    setAddingMember(true);
    try {
      await axios.post(`${API}/auth/register`, newMember, authHeaders);
      toast.success('Team member added successfully');
      setShowAddMemberDialog(false);
      setNewMember({
        username: '',
        email: '',
        password: '',
        role: ROLE_SUPERVISOR,
        category: 'google_maps'
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add team member');
    } finally {
      setAddingMember(false);
    }
  };

  // Delete single user
  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await axios.delete(`${API}/users/${userId}`, authHeaders);
      toast.success('User deleted successfully');
      setSelectedMembers(prev => prev.filter(id => id !== userId));
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  // Bulk delete users
  const handleBulkDelete = async () => {
    if (selectedMembers.length === 0) {
      toast.error('Please select users to delete');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedMembers.length} user(s)?`)) return;

    let successCount = 0;
    let failCount = 0;

    for (const userId of selectedMembers) {
      try {
        await axios.delete(`${API}/users/${userId}`, authHeaders);
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} user(s) deleted successfully`);
    }
    if (failCount > 0) {
      toast.error(`Failed to delete ${failCount} user(s)`);
    }

    setSelectedMembers([]);
    fetchData();
  };

  // Toggle member selection
  const toggleMemberSelection = (memberId) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  // Select all members (except current user)
  const toggleSelectAll = () => {
    const selectableMembers = teamMembers.filter(m => m.id !== user?.id).map(m => m.id);
    if (selectedMembers.length === selectableMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(selectableMembers);
    }
  };

  // Request selection functions (for bulk delete)
  const toggleRequestSelection = (requestId) => {
    setSelectedRequests(prev => 
      prev.includes(requestId) 
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    );
  };

  const toggleSelectAllRequests = () => {
    if (selectedRequests.length === requests.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(requests.map(r => r.id));
    }
  };

  // Delete single request
  const deleteRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to delete this request?')) return;
    
    try {
      await axios.delete(`${API}/requests/${requestId}`, authHeaders);
      toast.success('Request deleted successfully');
      setSelectedRequests(prev => prev.filter(id => id !== requestId));
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete request');
    }
  };

  // Bulk delete requests
  const handleBulkDeleteRequests = async () => {
    if (selectedRequests.length === 0) {
      toast.error('Please select requests to delete');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedRequests.length} request(s)?`)) return;

    try {
      await axios.post(`${API}/requests/bulk-delete`, { request_ids: selectedRequests }, authHeaders);
      toast.success(`${selectedRequests.length} request(s) deleted successfully`);
      setSelectedRequests([]);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete requests');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="ltr">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src={LOGO_URL} 
                alt="Aljabr Laundry" 
                className="h-10 object-contain"
              />
              <div className="hidden md:block">
                <h1 className="font-heading font-bold text-gray-900">Dashboard</h1>
                <p className="text-xs text-gray-500">Branch Management System</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Role Badge */}
              <Badge 
                className={`hidden md:flex items-center gap-1 ${isManager ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}
              >
                {isManager ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                {isManager ? 'Manager' : 'Supervisor'}
              </Badge>

              {/* Notifications */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative"
                  data-testid="notifications-btn"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-secondary text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
                
                {showNotifications && (
                  <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-xl border z-30 animate-fade-in">
                    <div className="p-4 border-b flex items-center justify-between">
                      <h3 className="font-semibold">Notifications</h3>
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllRead}
                          className="text-xs text-primary hover:underline"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="p-4 text-center text-gray-500 text-sm">No notifications</p>
                      ) : (
                        notifications.slice(0, 10).map((notif) => (
                          <Link
                            key={notif.id}
                            to={`/admin/requests/${notif.request_id}`}
                            onClick={() => setShowNotifications(false)}
                            className={`block p-4 border-b hover:bg-gray-50 transition-colors ${!notif.is_read ? 'bg-blue-50' : ''}`}
                          >
                            <p className="text-sm font-medium">{notif.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatDate(notif.created_at)}</p>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Info Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="hidden md:inline text-sm">{user?.name || user?.username}</span>
                    {!user?.email_verified && (
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="font-medium">{user?.name || user?.username}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    {!user?.email_verified && (
                      <Badge className="mt-1 bg-yellow-100 text-yellow-800 text-xs">
                        Email not verified
                      </Badge>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/admin/profile" className="flex items-center gap-2 cursor-pointer">
                      <Settings className="w-4 h-4" />
                      Profile Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="text-red-600 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button
            variant={activeTab === 'requests' ? 'default' : 'outline'}
            onClick={() => setActiveTab('requests')}
            className="gap-2"
          >
            <MapPin className="w-4 h-4" />
            Requests
          </Button>
          <Button
            variant={activeTab === 'workflow' ? 'default' : 'outline'}
            onClick={() => setActiveTab('workflow')}
            className="gap-2"
            data-testid="workflow-tab-btn"
          >
            <GitBranch className="w-4 h-4" />
            Workflow Requests
            {workflowStats.pending + workflowStats.in_progress > 0 && (
              <Badge className="bg-indigo-100 text-indigo-800 ml-1">
                {workflowStats.pending + workflowStats.in_progress}
              </Badge>
            )}
          </Button>
          {isManager && (
            <>
              <Button
                variant={activeTab === 'team' ? 'default' : 'outline'}
                onClick={() => setActiveTab('team')}
                className="gap-2"
              >
                <Users className="w-4 h-4" />
                Team Management
              </Button>
              <Button
                variant={activeTab === 'request-types' ? 'default' : 'ghost'}
                onClick={() => navigate('/admin/request-types')}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                Request Types
              </Button>
            </>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white">
            <CardContent className="p-4">
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Requests</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="p-4">
              <p className="text-2xl md:text-3xl font-bold text-blue-700">{stats.new}</p>
              <p className="text-sm text-blue-600">New Requests</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-yellow-100">
            <CardContent className="p-4">
              <p className="text-2xl md:text-3xl font-bold text-yellow-700">{stats.in_progress}</p>
              <p className="text-sm text-yellow-600">In Progress</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-100">
            <CardContent className="p-4">
              <p className="text-2xl md:text-3xl font-bold text-green-700">{stats.completed}</p>
              <p className="text-sm text-green-600">Completed</p>
            </CardContent>
          </Card>
        </div>

        {activeTab === 'requests' && (
          <>
            {/* Filters Section */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Search */}
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search by branch name..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="pl-10"
                        data-testid="search-input"
                      />
                    </div>
                  </div>

                  {/* City Filter */}
                  <div className="w-full md:w-48">
                    <Select 
                      value={filters.city} 
                      onValueChange={(value) => setFilters({ ...filters, city: value === "all" ? "" : value })}
                    >
                      <SelectTrigger data-testid="city-filter">
                        <SelectValue placeholder="Filter by City" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Cities</SelectItem>
                        {SAUDI_CITIES.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status Filter */}
                  <div className="w-full md:w-48">
                    <Select 
                      value={filters.status} 
                      onValueChange={(value) => setFilters({ ...filters, status: value === "all" ? "" : value })}
                    >
                      <SelectTrigger data-testid="status-filter">
                        <SelectValue placeholder="Filter by Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={fetchData}
                      data-testid="refresh-btn"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    {(filters.status || filters.city || filters.search) && (
                      <Button
                        variant="outline"
                        onClick={clearFilters}
                        className="text-sm"
                        data-testid="clear-filters-btn"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Requests Table */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-heading">
                    {isManager ? 'All Branch Requests' : 'My Assigned Requests'}
                  </CardTitle>
                  {isManager && selectedRequests.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDeleteRequests}
                      className="gap-2"
                      data-testid="bulk-delete-requests-btn"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete ({selectedRequests.length})
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MapPin className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">
                      {isManager ? 'No requests found' : 'No requests assigned to you'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          {isManager && (
                            <th className="text-left py-3 px-4 font-medium text-gray-600 w-12">
                              <Checkbox
                                checked={selectedRequests.length === requests.length && requests.length > 0}
                                onCheckedChange={toggleSelectAllRequests}
                                data-testid="select-all-requests-checkbox"
                              />
                            </th>
                          )}
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Request Type</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Branch Name</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600 hidden md:table-cell">City</th>
                          {isManager && (
                            <th className="text-left py-3 px-4 font-medium text-gray-600 hidden lg:table-cell">Assigned To</th>
                          )}
                          <th className="text-left py-3 px-4 font-medium text-gray-600 hidden lg:table-cell">Date</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requests.map((request) => {
                          const typeInfo = REQUEST_TYPE_MAP[request.request_type];
                          const statusInfo = STATUS_MAP[request.status];
                          const StatusIcon = statusInfo.icon;
                          
                          return (
                            <tr key={request.id} className={`border-b hover:bg-gray-50 transition-colors ${selectedRequests.includes(request.id) ? 'bg-blue-50' : ''}`}>
                              {isManager && (
                                <td className="py-3 px-4">
                                  <Checkbox
                                    checked={selectedRequests.includes(request.id)}
                                    onCheckedChange={() => toggleRequestSelection(request.id)}
                                    data-testid={`select-request-${request.id}`}
                                  />
                                </td>
                              )}
                              <td className="py-3 px-4">
                                <Badge variant="outline" className={typeInfo.color}>
                                  {typeInfo.label}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 font-medium">{request.branch_name}</td>
                              <td className="py-3 px-4 hidden md:table-cell text-gray-600">{request.city}</td>
                              {isManager && (
                                <td className="py-3 px-4 hidden lg:table-cell text-gray-600">
                                  {request.assigned_to_name || (
                                    <span className="text-gray-400 italic">Unassigned</span>
                                  )}
                                </td>
                              )}
                              <td className="py-3 px-4 hidden lg:table-cell text-gray-500 text-sm">
                                {formatDate(request.created_at)}
                              </td>
                              <td className="py-3 px-4">
                                <Badge className={`${statusInfo.color} flex items-center gap-1 w-fit`}>
                                  <StatusIcon className="w-3 h-3" />
                                  {statusInfo.label}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <Link to={`/admin/requests/${request.id}`}>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="gap-1"
                                      data-testid={`view-request-${request.id}`}
                                    >
                                      <Eye className="w-4 h-4" />
                                      <span className="hidden md:inline">View</span>
                                    </Button>
                                  </Link>
                                  {isManager && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="text-red-600 hover:bg-red-50 gap-1"
                                      onClick={() => deleteRequest(request.id)}
                                      data-testid={`delete-request-${request.id}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'workflow' && (
          <>
            {/* Workflow Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <Card className="bg-white">
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-gray-900">{workflowStats.total}</p>
                  <p className="text-sm text-gray-500">Total</p>
                </CardContent>
              </Card>
              <Card className="bg-amber-50 border-amber-100">
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-amber-700">{workflowStats.pending}</p>
                  <p className="text-sm text-amber-600">Pending</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 border-blue-100">
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-blue-700">{workflowStats.in_progress}</p>
                  <p className="text-sm text-blue-600">In Progress</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-100">
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-green-700">{workflowStats.completed}</p>
                  <p className="text-sm text-green-600">Completed</p>
                </CardContent>
              </Card>
              <Card className="bg-red-50 border-red-100">
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-red-700">{workflowStats.cancelled}</p>
                  <p className="text-sm text-red-600">Cancelled</p>
                </CardContent>
              </Card>
            </div>

            {/* Workflow Requests Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-indigo-600" />
                  Workflow Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : workflowRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <GitBranch className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">No workflow requests yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Requests with workflow steps will appear here
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Request Type</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Title</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600 hidden md:table-cell">Progress</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600 hidden lg:table-cell">Submitted</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workflowRequests.map((wfReq) => {
                          const statusColors = {
                            pending: 'bg-amber-100 text-amber-800',
                            in_progress: 'bg-blue-100 text-blue-800',
                            completed: 'bg-green-100 text-green-800',
                            cancelled: 'bg-red-100 text-red-800'
                          };
                          const progressPct = wfReq.total_steps > 0
                            ? Math.round(((wfReq.status === 'completed' ? wfReq.total_steps : Math.max(0, wfReq.current_step - 1)) / wfReq.total_steps) * 100)
                            : 0;
                          
                          return (
                            <tr key={wfReq.id} className="border-b hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4">
                                <Badge variant="outline" className="bg-indigo-50 text-indigo-700">
                                  {wfReq.request_type_name}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 font-medium">{wfReq.title}</td>
                              <td className="py-3 px-4 hidden md:table-cell">
                                <div className="flex items-center gap-2">
                                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-indigo-500 rounded-full transition-all" 
                                      style={{ width: `${progressPct}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {wfReq.status === 'completed' ? wfReq.total_steps : Math.max(0, wfReq.current_step - 1)}/{wfReq.total_steps}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 hidden lg:table-cell text-gray-500 text-sm">
                                {formatDate(wfReq.created_at)}
                              </td>
                              <td className="py-3 px-4">
                                <Badge className={statusColors[wfReq.status] || 'bg-gray-100'}>
                                  {wfReq.status.replace('_', ' ')}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <Link to={`/admin/workflow/${wfReq.id}`}>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="gap-1"
                                    data-testid={`view-workflow-${wfReq.id}`}
                                  >
                                    <Eye className="w-4 h-4" />
                                    <span className="hidden md:inline">View</span>
                                  </Button>
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'team' && isManager && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team Members ({teamMembers.length})
                </CardTitle>
                <div className="flex gap-2">
                  {selectedMembers.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      className="gap-2"
                      data-testid="bulk-delete-btn"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete ({selectedMembers.length})
                    </Button>
                  )}
                  <Button
                    onClick={() => setShowAddMemberDialog(true)}
                    className="gap-2 bg-primary hover:bg-primary-hover"
                    data-testid="add-member-btn"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Member
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {teamMembers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">No team members found</p>
                  <Button
                    onClick={() => setShowAddMemberDialog(true)}
                    className="mt-4 gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add First Member
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4 font-medium text-gray-600 w-12">
                          <Checkbox
                            checked={selectedMembers.length === teamMembers.filter(m => m.id !== user?.id).length && teamMembers.length > 1}
                            onCheckedChange={toggleSelectAll}
                            data-testid="select-all-checkbox"
                          />
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Username</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Department</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamMembers.map((member) => (
                        <tr key={member.id} className={`border-b hover:bg-gray-50 transition-colors ${selectedMembers.includes(member.id) ? 'bg-blue-50' : ''}`}>
                          <td className="py-3 px-4">
                            {member.id !== user?.id && (
                              <Checkbox
                                checked={selectedMembers.includes(member.id)}
                                onCheckedChange={() => toggleMemberSelection(member.id)}
                                data-testid={`select-member-${member.id}`}
                              />
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {member.username}
                            {member.id === user?.id && (
                              <Badge className="ml-2 bg-gray-100 text-gray-600">You</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-600">{member.email}</td>
                          <td className="py-3 px-4">
                            <Badge className={member.role === ROLE_MANAGER ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                              {member.role === ROLE_MANAGER ? 'Manager' : 'Supervisor'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-gray-600 capitalize">
                            {member.category?.replace('_', ' ') || 'N/A'}
                          </td>
                          <td className="py-3 px-4">
                            {member.id !== user?.id && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-red-600 hover:bg-red-50 gap-1"
                                onClick={() => deleteUser(member.id)}
                                data-testid={`delete-member-${member.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Add Member Dialog */}
      <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Add Team Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                placeholder="Enter username"
                value={newMember.username}
                onChange={(e) => setNewMember({ ...newMember, username: e.target.value })}
                data-testid="new-member-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                data-testid="new-member-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={newMember.password}
                onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                data-testid="new-member-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select 
                value={newMember.role} 
                onValueChange={(value) => setNewMember({ ...newMember, role: value })}
              >
                <SelectTrigger data-testid="new-member-role">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROLE_MANAGER}>Manager (Full Access)</SelectItem>
                  <SelectItem value={ROLE_SUPERVISOR}>Supervisor (Assigned Tasks Only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newMember.role === ROLE_SUPERVISOR && (
              <div className="space-y-2">
                <Label htmlFor="category">Department *</Label>
                <Select 
                  value={newMember.category} 
                  onValueChange={(value) => setNewMember({ ...newMember, category: value })}
                >
                  <SelectTrigger data-testid="new-member-category">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google_maps">Google Maps</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddMemberDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={addingMember}
              className="bg-primary hover:bg-primary-hover"
              data-testid="confirm-add-member-btn"
            >
              {addingMember ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                'Add Member'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
