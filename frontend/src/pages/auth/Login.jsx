import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { VideoIcon, Eye, EyeOff, Mail, Lock, LogIn } from 'lucide-react';
import { loginUser, clearError } from '../../store/slices/authSlice';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { isLoading, error, isAuthenticated } = useSelector((state) => state.auth);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Redirection après connexion réussie
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state?.from?.pathname]);

  // Gestion de la déconnexion (quand on arrive sur login depuis logout)
  useEffect(() => {
    // Si on arrive sur login et qu'on n'est pas en train de se connecter, 
    // c'est probablement après une déconnexion
    if (!isAuthenticated && !isLoading) {
      dispatch(clearError());
    }
  }, [isAuthenticated, isLoading, dispatch]);

  // Effacer les erreurs au démontage
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const validateForm = () => {
    const errors = {};
    
    if (!formData.email.trim()) {
      errors.email = 'Email ou nom d\'utilisateur requis';
    }
    
    if (!formData.password) {
      errors.password = 'Mot de passe requis';
    } else if (formData.password.length < 6) {
      errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Effacer l'erreur du champ quand l'utilisateur tape
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Effacer l'erreur générale
    if (error) {
      dispatch(clearError());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      await dispatch(loginUser(formData)).unwrap();
      navigate('/dashboard');
    } catch (error) {
      console.error('Erreur de connexion:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-20 w-auto object-contain"
            />
          </div>
          <h2 className="mt-6 h3-charte text-gray-900 font-ginka">
            Connexion
          </h2>
          <p className="mt-2 text-sm text-gray-600 font-ginka p-charte">
            Accédez à votre plateforme vidéo interactive
          </p>
        </div>

        {/* Formulaire */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Erreur générale */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-sm text-red-600">
                {error}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Email/Username */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 font-ginka p-charte">
                Email ou nom d'utilisateur
              </label>
              <input
                id="email"
                name="email"
                type="text"
                autoComplete="username"
                required
                value={formData.email}
                onChange={handleChange}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border rounded-charte-media placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-red focus:border-primary-red sm:text-sm font-ginka p-charte ${
                  validationErrors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="votre@email.com ou nom_utilisateur"
              />
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 font-ginka p-charte">
                Mot de passe
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`appearance-none relative block w-full px-3 py-2 pr-10 border rounded-charte-media placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-red focus:border-primary-red sm:text-sm font-ginka p-charte ${
                    validationErrors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Votre mot de passe"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link
                to="/register"
                className="font-medium text-primary-red hover:text-red-700 font-ginka p-charte"
              >
                Pas encore de compte ? S'inscrire
              </Link>
            </div>

            <div className="text-sm">
              <a
                href="#"
                className="font-medium text-primary-red hover:text-red-700 font-ginka p-charte"
                onClick={(e) => {
                  e.preventDefault();
                  // TODO: Implémenter la réinitialisation de mot de passe
                  alert('Fonctionnalité en cours de développement');
                }}
              >
                Mot de passe oublié ?
              </a>
            </div>
          </div>

          {/* Submit button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-charte btn-charte-primary group relative w-full flex justify-center py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <LoadingSpinner size="small" />
              ) : (
                'Se connecter'
              )}
            </button>
          </div>
        </form>

        {/* Info supplémentaire */}
        <div className="text-center">
          <p className="text-xs text-gray-500 font-ginka p-charte">
            En vous connectant, vous acceptez nos conditions d'utilisation
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 