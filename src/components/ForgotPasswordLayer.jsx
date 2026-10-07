import { Icon } from '@iconify/react/dist/iconify.js'
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'

const ForgotPasswordLayer = () => {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!email) {
            setError('Email is required')
            return
        }
        
        setLoading(true)
        setError('')
        
        try {
            await authAPI.forgotPassword({ identifier: email })
            setShowModal(true)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send reset email')
        } finally {
            setLoading(false)
        }
    }

    const handleCloseModal = () => {
        setShowModal(false)
        navigate(`/reset-password?email=${encodeURIComponent(email)}`)
    }

    return (
        <>
            <section className="auth d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', backgroundColor: 'var(--nirikhyana)' }}>
                <div className="p-24" style={{ border: '2px solid white', borderRadius: '24px', maxWidth: '500px', width: '100%', margin: '20px' }}>
                    <div className="card bg-base p-48" style={{ borderRadius: '20px', border: 'none' }}>
                        <div className="text-center mb-40">
                            <Link to='/' className='d-inline-block mb-16'>
                                <img src='assets/images/SignUpLayer.png' alt='Logo' style={{ width: '120px', height: '120px' }} />
                            </Link>
                            <h4 className='mb-8 text-primary-light fw-bold'>Forgot Password?</h4>
                            <p className='text-secondary-light mb-0'>
                                Enter your email to reset password
                            </p>
                        </div>
                        
                        <form onSubmit={handleSubmit}>
                            {error && (
                                <div className='alert alert-danger mb-20 text-sm'>
                                    {error}
                                </div>
                            )}

                            <div className='mb-24'>
                                <label className='form-label text-primary-light fw-medium mb-8'>
                                    Email Address<span className='text-danger-main'>*</span>
                                </label>
                                <input
                                    type='email'
                                    className='form-control h-48-px bg-neutral-50'
                                    placeholder='Enter your email address'
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    style={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 3px 5px rgba(0, 0, 0, 0.1)' }}
                                />
                            </div>

                            <button
                                type='submit'
                                className='btn w-100 h-48-px text-white fw-medium'
                                style={{ backgroundColor: '#8B4513', borderRadius: '12px', border: 'none' }}
                                disabled={loading}
                            >
                                {loading ? 'Sending...' : 'Send Reset OTP'}
                            </button>

                            <div className='text-center mt-32'>
                                <Link to='/sign-in' className='text-primary-6000 fw-medium text-sm'>
                                    Back to Sign In
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </section>
            
            {/* Modal */}
            {showModal && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content" style={{ borderRadius: '20px', border: 'none' }}>
                            <div className="modal-body p-40 text-center">
                                <div className="mb-32">
                                    <Icon icon="mage:email-check" style={{ fontSize: '64px', color: '#8B4513' }} />
                                </div>
                                <h6 className="mb-12 text-primary-light fw-bold">Check Your Email</h6>
                                <p className="text-secondary-light text-sm mb-0">
                                    We've sent password reset instructions to your email address.
                                </p>
                                <button
                                    type="button"
                                    className="btn w-100 h-48-px text-white fw-medium mt-32"
                                    style={{ backgroundColor: '#8B4513', borderRadius: '12px', border: 'none' }}
                                    onClick={handleCloseModal}
                                >
                                    Continue to Reset Password
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default ForgotPasswordLayer