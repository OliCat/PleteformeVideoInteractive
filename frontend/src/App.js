import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Composants
import PrivateRoute from './components/auth/PrivateRoute';
import AdminRoute from './components/auth/AdminRoute';
import Navbar from './components/layout/Navbar';
import LoadingSpinner from './components/common/LoadingSpinner';

// Pages existantes
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import QuizManagement from './pages/admin/QuizManagement';
import QuizForm from './pages/admin/QuizForm';
import NotFound from './pages/NotFound';

// Nouvelles pages
import VideoLearningPath from './pages/VideoLearningPath';
import VideoWatch from './pages/VideoWatch';
import TakeQuiz from './pages/TakeQuiz';

// Pages admin
import AdminVideos from './pages/AdminVideos';
import AdminVideoUpload from './pages/AdminVideoUpload';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserForm from './pages/admin/AdminUserForm';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <Routes>
          {/* Routes publiques */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Routes protégées */}
          <Route path="/" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          
          <Route path="/profile" element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          } />
          
          {/* Routes d'apprentissage */}
          <Route path="/learning-path" element={
            <PrivateRoute>
              <VideoLearningPath />
            </PrivateRoute>
          } />
          
          <Route path="/video/:videoId/watch" element={
            <PrivateRoute>
              <VideoWatch />
            </PrivateRoute>
          } />
          
          <Route path="/quiz/:quizId/take" element={
            <PrivateRoute>
              <TakeQuiz />
            </PrivateRoute>
          } />
          
          {/* Routes administrateur */}
          <Route path="/admin/quizzes" element={
            <AdminRoute>
              <QuizManagement />
            </AdminRoute>
          } />
          
          <Route path="/admin/quizzes/create" element={
            <AdminRoute>
              <QuizForm />
            </AdminRoute>
          } />
          
          <Route path="/admin/quizzes/:quizId/edit" element={
            <AdminRoute>
              <QuizForm />
            </AdminRoute>
          } />
          
          {/* Routes admin vidéos */}
          <Route path="/admin/videos" element={
            <AdminRoute>
              <AdminVideos />
            </AdminRoute>
          } />

          <Route path="/admin/videos/upload" element={
            <AdminRoute>
              <AdminVideoUpload />
            </AdminRoute>
          } />

          <Route path="/admin/videos/:videoId/edit" element={
            <AdminRoute>
              <AdminVideoUpload />
            </AdminRoute>
          } />

          {/* Routes admin utilisateurs */}
          <Route path="/admin/users" element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          } />

          <Route path="/admin/users/create" element={
            <AdminRoute>
              <AdminUserForm />
            </AdminRoute>
          } />

          <Route path="/admin/users/:userId/edit" element={
            <AdminRoute>
              <AdminUserForm />
            </AdminRoute>
          } />

          {/* Route 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      
      {/* Notifications toast */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 5000,
        }}
      />
      
      {/* Spinner de chargement global */}
      <LoadingSpinner />
    </div>
  );
}

export default App; 