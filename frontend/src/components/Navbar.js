import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  if (!user) {
    return (
      <nav className="navbar">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center">
            <Link to="/" className="navbar-brand">
              Installments Manager
            </Link>
            <div>
              <Link to="/login" className="btn btn-primary me-2">
                Login
              </Link>
              <Link to="/register" className="btn btn-secondary">
                Register
              </Link>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="navbar">
      <div className="container">
        <div className="d-flex justify-content-between align-items-center">
          <Link to="/dashboard" className="navbar-brand">
            Installments Manager
          </Link>
          
          <div className="d-flex align-items-center">
            <ul className="navbar-nav">
              <li>
                <Link 
                  to="/dashboard" 
                  className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link 
                  to="/products" 
                  className={`nav-link ${isActive('/products') ? 'active' : ''}`}
                >
                  Products
                </Link>
              </li>
              <li>
                <Link 
                  to="/customers" 
                  className={`nav-link ${isActive('/customers') ? 'active' : ''}`}
                >
                  Customers
                </Link>
              </li>
              <li>
                <Link 
                  to="/orders" 
                  className={`nav-link ${isActive('/orders') ? 'active' : ''}`}
                >
                  Orders
                </Link>
              </li>
              <li>
                <Link 
                  to="/reports" 
                  className={`nav-link ${isActive('/reports') ? 'active' : ''}`}
                >
                  Reports
                </Link>
              </li>
            </ul>
            
            <div className="ms-4">
              <span className="text-muted me-3">
                Welcome, {user.business_name}
              </span>
              <button onClick={handleLogout} className="btn btn-outline-secondary btn-sm">
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
