import React from 'react';
import { useSelector } from 'react-redux';

const LoadingSpinner = ({ size = 'medium', message = '', className = '' }) => {
  const { isGlobalLoading, loadingMessage } = useSelector((state) => state.ui);
  
  // Utiliser le loading global si actif, sinon utiliser les props
  const isLoading = isGlobalLoading;
  const displayMessage = loadingMessage || message;
  
  // Ne rien afficher si pas de loading
  if (!isLoading && !message) {
    return null;
  }
  
  // Classes de taille
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
    xl: 'w-16 h-16',
  };
  
  const spinnerSize = sizeClasses[size] || sizeClasses.medium;
  
  // Spinner global (overlay)
  if (isGlobalLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
          <div className="flex items-center space-x-4">
            <div className={`animate-spin rounded-full border-4 border-gray-300 border-t-primary-red ${spinnerSize}`}></div>
            <div>
              <div className="text-lg font-medium text-gray-900 font-ginka h5-charte">Chargement...</div>
              {displayMessage && (
                <div className="text-sm text-gray-500 mt-1 font-ginka p-charte">{displayMessage}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Spinner local
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex items-center space-x-3">
        <div className={`animate-spin rounded-full border-4 border-gray-300 border-t-primary-red ${spinnerSize}`}></div>
        {displayMessage && (
          <span className="text-gray-600 font-ginka p-charte">{displayMessage}</span>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner; 