import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUser } from '../../store/slices/authSlice';

const AdminRoute = ({ children }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { user, token, isLoading } = useSelector((state) => state.auth);

  useEffect(() => {
    // Si on a un token mais pas d'utilisateur, récupérer l'utilisateur
    if (token && !user && !isLoading) {
      dispatch(getCurrentUser());
    }
  }, [dispatch, token, user, isLoading]);

  // Afficher un spinner pendant le chargement
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Si pas de token, rediriger vers login
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si pas d'utilisateur, rediriger vers login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si l'utilisateur n'est pas admin, rediriger vers le dashboard
  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Si tout est OK, afficher le composant enfant
  return children;
};

export default AdminRoute; 