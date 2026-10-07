import { Icon } from '@iconify/react';
import React, { useState } from 'react';
import { authAPI } from '../services/api';
import PasswordRequirements from './child/PasswordRequirements';
import { validatePassword } from '../helper/passwordValidation';

const ChangePasswordLayer = () => {
  const [formData, setFormData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.new_password !== formData.confirm_password) {
      setError('New passwords do not match');
      return;
    }

    const passwordValidationErrors = validatePassword(formData.new_password);
    if (passwordValidationErrors.length > 0) {
      setError('New password does not meet requirements');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.changePassword(formData.old_password, formData.new_password);
      setSuccess(response.message || 'Password changed successfully');
      setFormData({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card h-100 p-0 radius-12">
      <div className="card-body p-24">
        <div className="row justify-content-center">
          <div className="col-xxl-6 col-xl-8 col-lg-10">
            <div className="card border">
              <div className="card-body">
                <h6 className="text-md text-primary-light mb-16">Change Password</h6>
                
                <form onSubmit={handleSubmit}>
                  {error && (
                    <div className='alert alert-danger mb-20 text-sm'>
                      {error}
                    </div>
                  )}
                  
                  {success && (
                    <div className='alert alert-success mb-20 text-sm'>
                      {success}
                    </div>
                  )}

                  <div className="mb-20">
                    <label className="form-label">Old Password <span className="text-danger-600">*</span></label>
                    <div className="position-relative">
                      <input
                        type={showOldPassword ? 'text' : 'password'}
                        name="old_password"
                        className="form-control h-48-px"
                        placeholder="Enter old password"
                        value={formData.old_password}
                        onChange={handleChange}
                        required
                      />
                      <span 
                        className="position-absolute end-0 top-50 translate-middle-y me-16 cursor-pointer"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        style={{ cursor: 'pointer' }}
                      >
                        <Icon icon={showOldPassword ? 'ri:eye-line' : 'ri:eye-off-line'} />
                      </span>
                    </div>
                  </div>

                  <div className="mb-20">
                    <label className="form-label">New Password <span className="text-danger-600">*</span></label>
                    <div className="position-relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        name="new_password"
                        className="form-control h-48-px"
                        placeholder="Enter new password"
                        value={formData.new_password}
                        onChange={handleChange}
                        required
                      />
                      <span 
                        className="position-absolute end-0 top-50 translate-middle-y me-16 cursor-pointer"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={{ cursor: 'pointer' }}
                      >
                        <Icon icon={showNewPassword ? 'ri:eye-line' : 'ri:eye-off-line'} />
                      </span>
                    </div>
                    {formData.new_password && (
                      <div className="mt-2">
                        <PasswordRequirements password={formData.new_password} showStrength={true} />
                      </div>
                    )}
                  </div>

                  <div className="mb-20">
                    <label className="form-label">Confirm New Password <span className="text-danger-600">*</span></label>
                    <div className="position-relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirm_password"
                        className="form-control h-48-px"
                        placeholder="Confirm new password"
                        value={formData.confirm_password}
                        onChange={handleChange}
                        required
                      />
                      <span 
                        className="position-absolute end-0 top-50 translate-middle-y me-16 cursor-pointer"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{ cursor: 'pointer' }}
                      >
                        <Icon icon={showConfirmPassword ? 'ri:eye-line' : 'ri:eye-off-line'} />
                      </span>
                    </div>
                  </div>

                  <div className="d-flex align-items-center justify-content-center gap-3">
                    <button 
                      type="button" 
                      className="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8"
                      onClick={() => setFormData({ old_password: '', new_password: '', confirm_password: '' })}
                    >
                      Reset
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary border border-primary-600 text-md px-40 py-12 radius-8" 
                      disabled={loading}
                    >
                      {loading ? 'Changing...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordLayer;
