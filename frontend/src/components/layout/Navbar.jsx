import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { logoutUser } from '../../store/slices/authSlice';
import { 
  VideoIcon, 
  Home, 
  User, 
  Settings,
  Menu,
  X,
  ChevronDown,
  GraduationCap,
  BarChart3,
  BookOpen,
  Play
} from 'lucide-react';

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
    setIsProfileDropdownOpen(false);
    setIsMobileMenuOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isAdmin = user?.role === 'admin';

  // Ne pas afficher la navbar sur les pages d'auth
  if (!isAuthenticated) {
    return null;
  }

  const NavLink = ({ to, children, icon: Icon, className = '' }) => (
    <Link
      to={to}
      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive(to)
          ? 'bg-red-50 text-primary-red'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      } ${className}`}
      onClick={() => setIsMobileMenuOpen(false)}
    >
      {Icon && <Icon className="w-5 h-5" />}
      <span>{children}</span>
    </Link>
  );

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo et navigation principale */}
          <div className="flex items-center">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="h-10 w-auto object-contain"
              />
              <span className="text-xl font-bold text-gray-900 font-ginka">
                Plateforme Vidéo
              </span>
            </Link>

            {/* Navigation desktop */}
            <div className="hidden md:ml-8 md:flex md:space-x-1">
              <NavLink to="/" icon={Home}>
                Accueil
              </NavLink>
              
              <NavLink to="/learning-path" icon={BookOpen}>
                Parcours
              </NavLink>
              
              {isAdmin && (
                <>
                  <NavLink to="/admin/videos" icon={VideoIcon}>
                    Vidéos
                  </NavLink>
                  <NavLink to="/admin/quizzes" icon={GraduationCap}>
                    Quiz
                  </NavLink>
                  <NavLink to="/admin/users" icon={User}>
                    Utilisateurs
                  </NavLink>
                </>
              )}
            </div>
          </div>

          {/* Menu utilisateur */}
          <div className="flex items-center space-x-4">
            {/* Dropdown profil - Desktop */}
            <div className="hidden md:block relative">
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <User className="w-5 h-5" />
                <span>{user?.username || user?.email}</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                  <Link
                    to="/profile"
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsProfileDropdownOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    <span>Mon Profil</span>
                  </Link>
                  
                  <div className="border-t border-gray-100"></div>
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-primary-red hover:bg-red-50"
                  >
                    <span>Déconnexion</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bouton menu mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <NavLink to="/" icon={Home} className="block">
              Accueil
            </NavLink>
            
            <NavLink to="/learning-path" icon={BookOpen} className="block">
              Parcours
            </NavLink>
            
            {isAdmin && (
              <>
                <NavLink to="/admin/videos" icon={VideoIcon} className="block">
                  Vidéos
                </NavLink>
                <NavLink to="/admin/quizzes" icon={GraduationCap} className="block">
                  Quiz
                </NavLink>
                <NavLink to="/admin/users" icon={User} className="block">
                  Utilisateurs
                </NavLink>
              </>
            )}
            
            <div className="border-t border-gray-200 pt-3 mt-3">
              <div className="flex items-center px-3 py-2 text-sm text-gray-600">
                <User className="w-5 h-5 mr-2" />
                {user?.username || user?.email}
              </div>
              
              <NavLink to="/profile" icon={User} className="block">
                Mon Profil
              </NavLink>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 w-full text-left px-3 py-2 text-sm text-primary-red hover:bg-red-50 rounded-md"
              >
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar; 