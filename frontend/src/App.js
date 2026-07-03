import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { lazy, Suspense } from "react";
import Lottie from "lottie-react";
import loadingAnimation from "@/assets/loading-animation.json";

// Lazy load pages for better performance
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const EditBranchForm = lazy(() => import("@/pages/EditBranchForm"));
const NewBranchForm = lazy(() => import("@/pages/NewBranchForm"));
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const RequestDetail = lazy(() => import("@/pages/RequestDetail"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const VerifyEmailPage = lazy(() => import("@/pages/VerifyEmailPage"));

// Dynamic Request Form
const DynamicRequestForm = lazy(() => import("@/pages/DynamicRequestForm"));
const RequestTypesAdmin = lazy(() => import("@/pages/RequestTypesAdmin"));
const WorkflowRequestDetail = lazy(() => import("@/pages/WorkflowRequestDetail"));

// Loading component with Lottie animation
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="w-32 h-32">
      <Lottie 
        animationData={loadingAnimation} 
        loop={true}
        autoplay={true}
      />
    </div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <PageLoader />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/edit-branch" element={<EditBranchForm />} />
        <Route path="/new-branch" element={<NewBranchForm />} />
        <Route path="/request/:typeId" element={<DynamicRequestForm />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/requests/:id"
          element={
            <ProtectedRoute>
              <RequestDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/request-types"
          element={
            <ProtectedRoute>
              <RequestTypesAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/workflow/:id"
          element={
            <ProtectedRoute>
              <WorkflowRequestDetail />
            </ProtectedRoute>
          }
        />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <div className="App" dir="ltr">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
