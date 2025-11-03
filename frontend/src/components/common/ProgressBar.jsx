import React from 'react';

const ProgressBar = ({ 
  progress, 
  total, 
  showPercentage = true, 
  showNumbers = true,
  color = 'blue',
  size = 'md',
  className = '' 
}) => {
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return 'bg-section-green';
      case 'red':
        return 'bg-primary-red';
      case 'yellow':
        return 'bg-section-yellow';
      case 'purple':
        return 'bg-section-blue';
      case 'blue':
      default:
        return 'bg-section-blue';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-2';
      case 'lg':
        return 'h-4';
      case 'xl':
        return 'h-6';
      case 'md':
      default:
        return 'h-3';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Barre de progression */}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${getSizeClasses()}`}>
        <div
          className={`${getColorClasses()} h-full transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>

      {/* Informations textuelles */}
      {(showNumbers || showPercentage) && (
        <div className="flex justify-between items-center mt-2 text-sm font-ginka p-charte">
          {showNumbers && (
            <span className="text-gray-600">
              {progress} / {total}
            </span>
          )}
          {showPercentage && (
            <span className="text-gray-600 font-medium">
              {percentage}%
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
