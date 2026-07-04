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
  FileText, GitBranch, ArrowRight, ArrowLeft, ChevronDown, TrendingUp, MoreHorizontal, Filter
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
    <div className="app-shell" dir="ltr">
      {/* Header */}
      <header className="app-topbar">
        <div className="app-topbar-inner">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-6">
              <button type="button" onClick={() => navigate('/')} className="icon-btn-soft" aria-label="Back to home">
                <ArrowLeft className="h-6 w-6" />
              </button>
              <Link to="/" aria-label="Go to home page">
                <img 
                  src={LOGO_URL} 
                  alt="Aljabr Laundry" 
                  className="app-logo"
                />
              </Link>
              <div className="hidden h-12 w-px bg-slate-200 md:block" />
              <div className="hidden md:block">
                <h1 className="font-heading text-2xl font-extrabold text-slate-950">Dashboard</h1>
                <p className="text-base text-slate-400">Branch Management System</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              {/* Role Badge */}
              <Badge 
                className="hidden rounded-full border border-blue-200 bg-blue-50 px-6 py-3 text-base font-semibold text-blue-700 hover:bg-blue-50 md:flex"
              >
                <span className="h-3 w-3 rounded-full bg-blue-600" />
                {isManager ? 'Manager' : 'Supervisor'}
              </Badge>

              {/* Notifications */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative h-12 w-12 rounded-full text-slate-600 hover:bg-slate-100"
                  data-testid="notifications-btn"
                >
                  <Bell className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute right-2 top-2 h-3 w-3 rounded-full bg-red-500 text-[0]">
                      {unreadCount}
                    </span>
                  )}
                </Button>
                
                {showNotifications && (
                  <div className="absolute right-0 top-14 z-30 w-[420px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.16)] animate-fade-in">
                    <div className="flex items-center justify-between border-b border-slate-100 px-8 py-7">
                      <h3 className="text-3xl font-semibold text-slate-950">Notifications</h3>
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllRead}
                          className="text-xl font-medium text-blue-600 hover:underline"
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
                            className={`block border-b border-slate-100 px-8 py-7 transition-colors hover:bg-slate-50 ${!notif.is_read ? 'bg-slate-50' : ''}`}
                          >
                            <div className="flex gap-5">
                              {!notif.is_read && <span className="mt-2 h-4 w-4 shrink-0 rounded-full bg-blue-500" />}
                              <div>
                                <p className="text-xl font-medium text-slate-950">{notif.message}</p>
                                <p className="mt-3 text-lg text-slate-400">{formatDate(notif.created_at)}</p>
                              </div>
                            </div>
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
                  <Button variant="ghost" className="flex h-14 items-center gap-4 rounded-full px-2 hover:bg-slate-50">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                      {(user?.name || user?.username || 'MA').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="hidden text-xl font-medium text-slate-700 md:inline">{user?.name || user?.username}</span>
                    <ChevronDown className="hidden h-5 w-5 text-slate-400 md:block" />
                    {!user?.email_verified && (
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 overflow-hidden rounded-[24px] border-slate-200 p-0 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                  <div className="border-b border-slate-100 px-8 py-6">
                    <p className="text-2xl font-semibold text-slate-950">{user?.name || user?.username}</p>
                    <p className="mt-2 text-xl text-slate-400">{user?.email}</p>
                    {!user?.email_verified && (
                      <Badge className="mt-1 bg-yellow-100 text-yellow-800 text-xs">
                        Email not verified
                      </Badge>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/admin/profile" className="flex cursor-pointer items-center gap-5 px-8 py-5 text-xl">
                      <User className="h-6 w-6 text-blue-600" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex cursor-pointer items-center gap-5 px-8 py-5 text-xl">
                    <Settings className="h-6 w-6 text-slate-500" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex cursor-pointer items-center gap-5 px-8 py-5 text-xl">
                    <Bell className="h-6 w-6 text-amber-500" />
                    Notifications
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="flex cursor-pointer items-center gap-5 px-8 py-5 text-xl text-red-600"
                  >
                    <LogOut className="h-6 w-6" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-none px-10 py-10">
        {/* Tabs */}
        <div className="mb-10 inline-flex flex-wrap gap-2 rounded-[26px] border border-slate-200 bg-white p-3 shadow-[0_8px_18px_rgba(15,23,42,0.07)]">
          <Button
            variant={activeTab === 'requests' ? 'default' : 'outline'}
            onClick={() => setActiveTab('requests')}
            className={`h-14 rounded-[18px] px-7 text-xl font-semibold shadow-none ${activeTab === 'requests' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border-transparent bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            <MapPin className="h-6 w-6" />
            Requests
          </Button>
          <Button
            variant={activeTab === 'workflow' ? 'default' : 'outline'}
            onClick={() => setActiveTab('workflow')}
            className={`h-14 rounded-[18px] px-7 text-xl font-semibold shadow-none ${activeTab === 'workflow' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border-transparent bg-white text-slate-500 hover:bg-slate-50'}`}
            data-testid="workflow-tab-btn"
          >
            <GitBranch className="h-6 w-6" />
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
                className={`h-14 rounded-[18px] px-7 text-xl font-semibold shadow-none ${activeTab === 'team' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border-transparent bg-white text-slate-500 hover:bg-slate-50'}`}
              >
                <Users className="h-6 w-6" />
                Team Management
              </Button>
              <Button
                variant={activeTab === 'request-types' ? 'default' : 'ghost'}
                onClick={() => navigate('/admin/request-types')}
                className="h-14 rounded-[18px] border-transparent bg-white px-7 text-xl font-semibold text-slate-500 shadow-none hover:bg-slate-50"
              >
                <FileText className="h-6 w-6" />
                Request Types
              </Button>
            </>
          )}
        </div>

        {/* Stats Cards */}
        <div className="mb-10 grid grid-cols-2 gap-6 md:grid-cols-4">
          <Card className="metric-card">
            <CardContent className="p-0">
              <div className="mb-6 flex items-center justify-between">
                <p className="text-xl text-slate-500">Total Requests</p>
                <TrendingUp className="h-7 w-7 text-slate-300" />
              </div>
              <p className="text-5xl font-extrabold text-slate-950">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="metric-card">
            <CardContent className="p-0">
              <div className="mb-6 flex items-center justify-between">
                <p className="text-xl text-slate-500">New Requests</p>
                <TrendingUp className="h-7 w-7 text-blue-200" />
              </div>
              <p className="text-5xl font-extrabold text-blue-600">{stats.new}</p>
              <p className="mt-4 text-base text-slate-400">Awaiting review</p>
            </CardContent>
          </Card>
          <Card className="metric-card">
            <CardContent className="p-0">
              <div className="mb-6 flex items-center justify-between">
                <p className="text-xl text-slate-500">In Progress</p>
                <TrendingUp className="h-7 w-7 text-orange-200" />
              </div>
              <p className="text-5xl font-extrabold text-orange-500">{stats.in_progress}</p>
            </CardContent>
          </Card>
          <Card className="metric-card">
            <CardContent className="p-0">
              <div className="mb-6 flex items-center justify-between">
                <p className="text-xl text-slate-500">Completed</p>
                <TrendingUp className="h-7 w-7 text-emerald-200" />
              </div>
              <p className="text-5xl font-extrabold text-emerald-600">{stats.completed}</p>
            </CardContent>
          </Card>
        </div>

        {activeTab === 'requests' && (
          <>
            {/* Filters Section */}
            <Card className="mb-8 rounded-[24px] border-slate-200 bg-white shadow-[0_8px_18px_rgba(15,23,42,0.06)] md:hidden">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Search */}
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search by branch name..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="h-14 rounded-[18px] border-slate-200 bg-slate-50 pl-12 text-lg"
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
                      <SelectTrigger className="h-14 rounded-[18px] border-slate-200 bg-slate-50 text-lg" data-testid="city-filter">
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
                      <SelectTrigger className="h-14 rounded-[18px] border-slate-200 bg-slate-50 text-lg" data-testid="status-filter">
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
                      className="h-14 w-14 rounded-[16px] border-slate-200"
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
            <Card className="modern-table-card">
              <CardHeader className="border-b border-slate-100 px-8 py-7">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading text-3xl font-extrabold text-slate-950">
                    {isManager ? 'All Branch Requests' : 'My Assigned Requests'}
                  </CardTitle>
                  <div className="hidden items-center gap-4 md:flex">
                    <div className="relative">
                      <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="Search by branch name..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="h-14 w-[420px] rounded-[18px] border-slate-200 bg-slate-50 pl-14 text-lg"
                      />
                    </div>
                    <Button variant="outline" className="h-14 rounded-[16px] border-slate-200 px-6 text-lg">
                      <Filter className="mr-2 h-5 w-5" />
                      Filter
                    </Button>
                    <Button variant="outline" size="icon" onClick={fetchData} className="h-14 w-14 rounded-[16px] border-slate-200">
                      <RefreshCw className="h-5 w-5" />
                    </Button>
                  </div>
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
              <CardContent className="p-0">
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
                        <tr className="border-b border-slate-100 bg-slate-50">
                          {isManager && (
                            <th className="w-12 px-8 py-5 text-left font-bold uppercase tracking-wide text-slate-500">
                              <Checkbox
                                checked={selectedRequests.length === requests.length && requests.length > 0}
                                onCheckedChange={toggleSelectAllRequests}
                                data-testid="select-all-requests-checkbox"
                              />
                            </th>
                          )}
                          <th className="px-8 py-5 text-left font-bold uppercase tracking-wide text-slate-500">Request Type</th>
                          <th className="px-8 py-5 text-left font-bold uppercase tracking-wide text-slate-500">Branch Name</th>
                          <th className="hidden px-8 py-5 text-left font-bold uppercase tracking-wide text-slate-500 md:table-cell">City</th>
                          {isManager && (
                            <th className="hidden px-8 py-5 text-left font-bold uppercase tracking-wide text-slate-500 lg:table-cell">Assigned To</th>
                          )}
                          <th className="hidden px-8 py-5 text-left font-bold uppercase tracking-wide text-slate-500 lg:table-cell">Date</th>
                          <th className="px-8 py-5 text-left font-bold uppercase tracking-wide text-slate-500">Status</th>
                          <th className="px-8 py-5 text-left font-bold uppercase tracking-wide text-slate-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requests.map((request) => {
                          const typeInfo = REQUEST_TYPE_MAP[request.request_type] || REQUEST_TYPE_MAP.dynamic;
                          const statusInfo = STATUS_MAP[request.status] || STATUS_MAP.new;
                          const StatusIcon = statusInfo.icon;
                          
                          return (
                            <tr key={request.id} className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${selectedRequests.includes(request.id) ? 'bg-blue-50' : ''}`}>
                              {isManager && (
                                <td className="px-8 py-7">
                                  <Checkbox
                                    checked={selectedRequests.includes(request.id)}
                                    onCheckedChange={() => toggleRequestSelection(request.id)}
                                    data-testid={`select-request-${request.id}`}
                                  />
                                </td>
                              )}
                              <td className="px-8 py-7">
                                <Badge variant="outline" className={`${typeInfo.color} rounded-full border-0 px-5 py-2 text-base font-bold`}>
                                  {typeInfo.label}
                                </Badge>
                              </td>
                              <td className="px-8 py-7 text-xl font-semibold text-slate-950">{request.branch_name}</td>
                              <td className="hidden px-8 py-7 text-xl text-slate-500 md:table-cell">{request.city}</td>
                              {isManager && (
                                <td className="hidden px-8 py-7 text-xl text-slate-500 lg:table-cell">
                                  {request.assigned_to_name || (
                                    <span className="text-gray-400 italic">Unassigned</span>
                                  )}
                                </td>
                              )}
                              <td className="hidden px-8 py-7 text-lg text-slate-400 lg:table-cell">
                                {formatDate(request.created_at)}
                              </td>
                              <td className="px-8 py-7">
                                <Badge className={`${statusInfo.color} flex w-fit items-center gap-2 rounded-full px-5 py-2 text-base font-semibold`}>
                                  <StatusIcon className="h-3 w-3" />
                                  {statusInfo.label}
                                </Badge>
                              </td>
                              <td className="px-8 py-7">
                                <div className="flex items-center gap-2">
                                  <Link to={`/admin/requests/${request.id}`}>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="h-11 rounded-[14px] border-slate-200"
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
                                      className="h-11 rounded-[14px] border-slate-200 text-red-600 hover:bg-red-50"
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
            <div className="mb-10 grid grid-cols-2 gap-6 md:grid-cols-4">
              <Card className="metric-card">
                <CardContent className="p-0">
                  <p className="mb-6 text-xl text-slate-500">Total</p>
                  <p className="text-5xl font-extrabold text-slate-950">{workflowStats.total}</p>
                </CardContent>
              </Card>
              <Card className="metric-card">
                <CardContent className="p-0">
                  <p className="mb-6 text-xl text-slate-500">Pending</p>
                  <p className="text-5xl font-extrabold text-orange-500">{workflowStats.pending}</p>
                </CardContent>
              </Card>
              <Card className="metric-card">
                <CardContent className="p-0">
                  <p className="mb-6 text-xl text-slate-500">In Progress</p>
                  <p className="text-5xl font-extrabold text-blue-600">{workflowStats.in_progress}</p>
                </CardContent>
              </Card>
              <Card className="metric-card">
                <CardContent className="p-0">
                  <p className="mb-6 text-xl text-slate-500">Completed</p>
                  <p className="text-5xl font-extrabold text-emerald-600">{workflowStats.completed}</p>
                </CardContent>
              </Card>
            </div>

            {/* Workflow Requests Table */}
            <Card className="modern-table-card">
              <CardHeader className="border-b border-slate-100 px-8 py-7">
                <CardTitle className="font-heading flex items-center gap-3 text-3xl font-extrabold text-slate-950">
                  <GitBranch className="h-7 w-7 text-slate-500" />
                  Workflow Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : workflowRequests.length === 0 ? (
                  <div className="flex min-h-[430px] flex-col items-center justify-center text-center">
                    <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100">
                      <GitBranch className="h-10 w-10 text-slate-400" />
                    </div>
                    <p className="text-2xl font-medium text-slate-700">No workflow requests yet</p>
                    <p className="mt-3 text-xl text-slate-400">
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
          <Card className="modern-table-card">
            <CardHeader className="border-b border-slate-100 px-8 py-7">
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading flex items-center gap-3 text-3xl font-extrabold text-slate-950">
                  <Users className="h-7 w-7 text-slate-500" />
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
                    className="h-14 rounded-[18px] bg-blue-600 px-8 text-lg font-semibold text-white shadow-[0_10px_20px_rgba(37,99,235,0.22)] hover:bg-blue-700"
                    data-testid="add-member-btn"
                  >
                    <UserPlus className="h-5 w-5" />
                    Add Member
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
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
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="w-12 px-8 py-5 text-left font-bold uppercase tracking-wide text-slate-500">
                          <Checkbox
                            checked={selectedMembers.length === teamMembers.filter(m => m.id !== user?.id).length && teamMembers.length > 1}
                            onCheckedChange={toggleSelectAll}
                            data-testid="select-all-checkbox"
                          />
                        </th>
                        <th className="px-8 py-5 text-left font-bold uppercase tracking-wide text-slate-500">Username</th>
                        <th className="px-8 py-5 text-left font-bold uppercase tracking-wide text-slate-500">Email</th>
                        <th className="px-8 py-5 text-left font-bold uppercase tracking-wide text-slate-500">Role</th>
                        <th className="px-8 py-5 text-left font-bold uppercase tracking-wide text-slate-500">Department</th>
                        <th className="px-8 py-5 text-left font-bold uppercase tracking-wide text-slate-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamMembers.map((member) => (
                        <tr key={member.id} className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${selectedMembers.includes(member.id) ? 'bg-blue-50' : ''}`}>
                          <td className="px-8 py-7">
                            {member.id !== user?.id && (
                              <Checkbox
                                checked={selectedMembers.includes(member.id)}
                                onCheckedChange={() => toggleMemberSelection(member.id)}
                                data-testid={`select-member-${member.id}`}
                              />
                            )}
                          </td>
                          <td className="px-8 py-7 text-xl font-semibold text-slate-950">
                            <span className="mr-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                              {(member.name || member.username || 'M').charAt(0).toUpperCase()}
                            </span>
                            {member.name || member.username}
                            {member.id === user?.id && (
                              <Badge className="ml-2 bg-gray-100 text-gray-600">You</Badge>
                            )}
                          </td>
                          <td className="px-8 py-7 text-xl text-slate-500">{member.email}</td>
                          <td className="px-8 py-7">
                            <Badge className={`${member.role === ROLE_MANAGER ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'} rounded-full border-0 px-5 py-2 text-base font-bold`}>
                              {member.role === ROLE_MANAGER ? 'Manager' : 'Supervisor'}
                            </Badge>
                          </td>
                          <td className="px-8 py-7 text-xl capitalize text-slate-600">
                            {member.category?.replace('_', ' ') || 'N/A'}
                          </td>
                          <td className="px-8 py-7">
                            {member.id !== user?.id && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-11 rounded-[14px] border-slate-200 text-red-600 hover:bg-red-50"
                                onClick={() => deleteUser(member.id)}
                                data-testid={`delete-member-${member.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                            {member.id === user?.id && (
                              <MoreHorizontal className="h-6 w-6 text-slate-400" />
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
        <DialogContent className="overflow-hidden rounded-[28px] border-0 p-0 shadow-[0_26px_70px_rgba(15,23,42,0.24)] sm:max-w-2xl">
          <DialogHeader className="border-b border-slate-100 px-10 py-8 text-left">
            <DialogTitle className="font-heading text-3xl font-extrabold text-slate-950">
              Add Team Member
            </DialogTitle>
            <p className="text-lg text-slate-400">Invite a new member to the team</p>
          </DialogHeader>
          <div className="space-y-7 px-10 py-8">
            <div className="space-y-3">
              <Label htmlFor="username" className="soft-label">Username <span className="text-red-500">*</span></Label>
              <Input
                id="username"
                placeholder="e.g., Ahmed Al-Rashid"
                value={newMember.username}
                onChange={(e) => setNewMember({ ...newMember, username: e.target.value })}
                className="soft-input"
                data-testid="new-member-username"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="email" className="soft-label">Email <span className="text-red-500">*</span></Label>
              <Input
                id="email"
                type="email"
                placeholder="name@aljabrlaundry.com"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                className="soft-input"
                data-testid="new-member-email"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="password" className="soft-label">Password <span className="text-red-500">*</span></Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={newMember.password}
                onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                className="soft-input"
                data-testid="new-member-password"
              />
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-3">
                <Label htmlFor="role" className="soft-label">Role</Label>
                <Select 
                  value={newMember.role} 
                  onValueChange={(value) => setNewMember({ ...newMember, role: value })}
                >
                  <SelectTrigger className="soft-input" data-testid="new-member-role">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ROLE_MANAGER}>Manager</SelectItem>
                    <SelectItem value={ROLE_SUPERVISOR}>Supervisor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newMember.role === ROLE_SUPERVISOR && (
                <div className="space-y-3">
                  <Label htmlFor="category" className="soft-label">Department</Label>
                  <Select 
                    value={newMember.category} 
                    onValueChange={(value) => setNewMember({ ...newMember, category: value })}
                  >
                    <SelectTrigger className="soft-input" data-testid="new-member-category">
                      <SelectValue placeholder="e.g., Google Maps" />
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
          </div>
          <DialogFooter className="border-t border-slate-100 px-10 py-7">
            <Button
              variant="outline"
              onClick={() => setShowAddMemberDialog(false)}
              className="h-14 rounded-[18px] border-slate-200 px-8 text-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={addingMember}
              className="h-14 rounded-[18px] bg-blue-600 px-8 text-lg font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
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
