import { Icon } from '@iconify/react/dist/iconify.js'
import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authAPI } from '../services/api'
import PasswordRequirements from './child/PasswordRequirements'
import { validatePassword } from '../helper/passwordValidation'

const ResetPasswordLayer = () => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const [formData, setFormData] = useState({
        identifier: searchParams.get('email') || '',
        otp: '',
        new_password: '',
        confirm_password: ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (formData.new_password !== formData.confirm_password) {
            setError('Passwords do not match')
            return
        }

        const passwordValidationErrors = validatePassword(formData.new_password)
        if (passwordValidationErrors.length > 0) {
            setError('Password does not meet requirements')
            return
        }

        setLoading(true)
        setError('')

        try {
            const response = await authAPI.resetPassword({
                identifier: formData.identifier,
                otp: formData.otp,
                new_password: formData.new_password
            })
            setSuccessMessage(response.message || 'Password reset successfully. You can now login with your new password')
            setShowSuccessModal(true)
        } catch (err) {
            setError(err.message || 'Failed to reset password')
        } finally {
            setLoading(false)
        }
    }

    const handleSuccessModalClose = () => {
        setShowSuccessModal(false)
        navigate('/sign-in')
    }

    return (
        <section className="auth d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', backgroundColor: 'var(--nirikhyana)' }}>
            <div className="p-24" style={{ border: '2px solid white', borderRadius: '24px', maxWidth: '700px', width: '100%', margin: '20px' }}>
                <div className="card bg-base p-48" style={{ borderRadius: '20px', border: 'none' }}>
                    <div className="text-center mb-40">
                        <Link to='/' className='d-inline-block mb-16'>
                            <img src='assets/images/SignUpLayer.png' alt='Logo' style={{ width: '120px', height: '120px' }} />
                        </Link>
                        <h4 className='mb-8 text-primary-light fw-bold'>Reset Password</h4>
                        <p className='text-secondary-light mb-0'>
                            Enter OTP and create new password
                        </p>
                    </div>
                    
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div className='alert alert-danger mb-20 text-sm'>
                                {error}
                            </div>
                        )}

                        <div className='row'>
                            <div className='col-md-6 mb-24'>
                                <label className='form-label text-primary-light fw-medium mb-8'>
                                    Email Address<span className='text-danger-main'>*</span>
                                </label>
                                <input
                                    type='email'
                                    name='identifier'
                                    className='form-control h-48-px bg-neutral-50'
                                    placeholder='Enter your email address'
                                    value={formData.identifier}
                                    onChange={handleChange}
                                    required
                                    readOnly
                                    style={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 3px 5px rgba(0, 0, 0, 0.1)', backgroundColor: '#f9fafb', cursor: 'not-allowed' }}
                                />
                            </div>

                            <div className='col-md-6 mb-24'>
                                <label className='form-label text-primary-light fw-medium mb-8'>
                                    OTP<span className='text-danger-main'>*</span>
                                </label>
                                <div className='d-flex gap-2 justify-content-center'>
                                    {[0, 1, 2, 3, 4, 5].map((index) => (
                                        <input
                                            key={index}
                                            type='text'
                                            className='form-control text-center'
                                            maxLength='1'
                                            value={formData.otp[index] || ''}
                                            onChange={(e) => {
                                                const newOtp = formData.otp.split('');
                                                newOtp[index] = e.target.value;
                                                setFormData({...formData, otp: newOtp.join('')});
                                                
                                                // Auto focus next input
                                                if (e.target.value && index < 5) {
                                                    const nextInput = e.target.parentElement.children[index + 1];
                                                    if (nextInput) nextInput.focus();
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                // Handle backspace to focus previous input
                                                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                                                    const prevInput = e.target.parentElement.children[index - 1];
                                                    if (prevInput) prevInput.focus();
                                                }
                                            }}
                                            style={{ 
                                                width: '35px', 
                                                height: '35px', 
                                                borderRadius: '8px', 
                                                border: '2px solid #e5e7eb', 
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                boxShadow: '0 3px 5px rgba(0, 0, 0, 0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '0',
                                                lineHeight: '1'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className='col-md-6 mb-24'>
                                <label className='form-label text-primary-light fw-medium mb-8'>
                                    New Password<span className='text-danger-main'>*</span>
                                </label>
                                <div className='position-relative'>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name='new_password'
                                        className='form-control h-48-px bg-neutral-50'
                                        placeholder='Enter new password'
                                        value={formData.new_password}
                                        onChange={handleChange}
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
                                {formData.new_password && (
                                    <div className="mt-2">
                                        <PasswordRequirements password={formData.new_password} showStrength={true} />
                                    </div>
                                )}
                            </div>

                            <div className='col-md-6 mb-24'>
                                <label className='form-label text-primary-light fw-medium mb-8'>
                                    Confirm Password<span className='text-danger-main'>*</span>
                                </label>
                                <div className='position-relative'>
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name='confirm_password'
                                        className='form-control h-48-px bg-neutral-50'
                                        placeholder='Confirm new password'
                                        value={formData.confirm_password}
                                        onChange={handleChange}
                                        required
                                        style={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 3px 5px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <span 
                                        className='position-absolute end-0 top-50 translate-middle-y me-16 text-secondary-light cursor-pointer'
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        <Icon icon={showConfirmPassword ? 'ri:eye-line' : 'ri:eye-off-line'} />
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            type='submit'
                            className='btn w-100 h-48-px text-white fw-medium'
                            style={{ backgroundColor: '#8B4513', borderRadius: '12px', border: 'none' }}
                            disabled={loading}
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>

                        <div className='text-center mt-32'>
                            <Link to='/sign-in' className='text-primary-6000 fw-medium text-sm'>
                                Back to Sign In
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
            
            {/* Success Modal */}
            {showSuccessModal && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content" style={{ borderRadius: '20px', border: 'none' }}>
                            <div className="modal-body p-40 text-center">
                                <div className="mb-32">
                                    <Icon icon="material-symbols:check-circle" style={{ fontSize: '64px', color: '#45b369' }} />
                                </div>
                                <h6 className="mb-12 text-primary-light fw-bold">Password Reset Successful!</h6>
                                <p className="text-secondary-light text-sm mb-0">
                                    {successMessage}
                                </p>
                                <button
                                    type="button"
                                    className="btn w-100 h-48-px text-white fw-medium mt-32"
                                    style={{ backgroundColor: '#8B4513', borderRadius: '12px', border: 'none' }}
                                    onClick={handleSuccessModalClose}
                                >
                                    Continue to Sign In
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}

export default ResetPasswordLayer