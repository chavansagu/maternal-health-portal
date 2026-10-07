import { Icon } from "@iconify/react/dist/iconify.js";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import { setAuthToken, setUserRole, setUsername, decodeToken } from "../services/auth";
import { Link } from "react-router-dom";

const SignInLayer = () => {
  const [username, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState('error');
  const [showPassword, setShowPassword] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrorType('error');
    setLoading(true);

    try {
      const response = await authAPI.login(username, password);
      const decoded = decodeToken(response.access_token);
      
      setAuthToken(response.access_token);
      setUserRole(decoded.role);
      setUsername(decoded.sub);

      const roleRoutes = {
        district: '/dashboard-district',
        block: '/dashboard-block',
        sub_centre: '/dashboard-sub-centre',
        usg_centre: '/dashboard-usg-centre',
        dp: '/dashboard-dp',
        pmsma: '/dashboard-pmsma',
      };

      navigate(roleRoutes[decoded.role] || '/dashboard-district');
    } catch (err) {
      const errorMessage = err.message || 'Invalid username or password';
      
      // Check if account is locked (429 error)
      if (errorMessage.includes('Account locked') || errorMessage.includes('too many failed')) {
        setErrorType('error');
        setIsLocked(true);
      } 
      // Check if it's a warning about remaining attempts
      else if (errorMessage.includes('attempts remaining') || errorMessage.includes('will be locked')) {
        setErrorType('warning');
        setIsLocked(false);
      }
      else {
        setErrorType('error');
        setIsLocked(false);
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', backgroundColor: 'var(--nirikhyana)' }}>
      <div className="p-24" style={{ border: '2px solid white', borderRadius: '24px', maxWidth: '500px', width: '100%', margin: '20px' }}>
        <div className="card bg-base p-48" style={{ borderRadius: '20px', border: 'none' }}>
          <div className="text-center mb-40">
            <Link to='/' className='d-inline-block mb-16'>
              <img src='assets/images/SignUpLayer.png' alt='Logo' style={{ width: '120px', height: '120px' }} />
            </Link>
            <h4 className='mb-8 text-primary-light fw-bold'>Welcome Back!</h4>
            <p className='text-secondary-light mb-0'>
              Sign in to your Account
            </p>
          </div>
          
          <form onSubmit={handleSubmit}>
            {error && (
              <div className={`alert mb-20 text-sm ${
                errorType === 'warning' 
                  ? 'alert-warning' 
                  : 'alert-danger'
              }`} style={{
                borderLeft: errorType === 'warning' ? '4px solid #ffc107' : '4px solid #dc3545'
              }}>
                {error}
              </div>
            )}

            <div className='mb-24'>
              <label className='form-label text-primary-light fw-medium mb-8'>
                Username<span className='text-danger-main'>*</span>
              </label>
              <input
                type='text'
                className='form-control h-48-px bg-neutral-50'
                placeholder='Enter your username'
                value={username}
                onChange={(e) => setUsernameInput(e.target.value)}
                required
                style={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 3px 5px rgba(0, 0, 0, 0.1)' }}
              />
            </div>

            <div className='mb-24'>
              <label className='form-label text-primary-light fw-medium mb-8'>
                Password<span className='text-danger-main'>*</span>
              </label>
              <div className='position-relative'>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className='form-control h-48-px bg-neutral-50'
                  placeholder='Enter your password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 3px 5px rgba(0, 0, 0, 0.1)' }}
                />
                <span 
                  className='position-absolute end-0 top-50 translate-middle-y me-16 text-secondary-light cursor-pointer'
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <Icon icon={showPassword ? 'ri:eye-line' : 'ri:eye-off-line'} />
                </span>
              </div>
            </div>

            <div className='text-end mb-32'>
              <Link to='/forgot-password' className='text-primary-6000 fw-medium text-sm'>
                Forgot Password?
              </Link>
            </div>

            <button
              type='submit'
              className='btn w-100 h-48-px text-white fw-medium'
              style={{ backgroundColor: '#8B4513', borderRadius: '12px', border: 'none' }}
              disabled={loading || isLocked}
            >
              {loading ? 'Signing In...' : isLocked ? 'Account Locked' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default SignInLayer;
