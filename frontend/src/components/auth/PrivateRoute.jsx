import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUser } from '../../store/slices/authSlice';
import LoadingSpinner from '../common/LoadingSpinner';

const PrivateRoute = ({ children }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { isAuthenticated, user, isLoading, token } = useSelector((state) => state.auth);

  useEffect(() => {
    // Si on a un token mais pas d'utilisateur, récupérer l'utilisateur
    // Mais seulement si on n'est pas déjà en train de charger
    if (token && !user && !isLoading) {
      dispatch(getCurrentUser());
    }
  }, [dispatch, token, user, isLoading]);

  // Afficher le spinner pendant le chargement
  if (isLoading || (token && !user)) {
    return <LoadingSpinner />;
  }

  // Rediriger vers login si pas authentifié
  if (!isAuthenticated || !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si on a un token mais pas d'utilisateur après un délai, 
  // probablement le token est invalide
  if (token && !user && !isLoading) {
    // Nettoyer le token invalide
    localStorage.removeItem('token');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Rendre les enfants si authentifié
  return children;
};

export default PrivateRoute; 