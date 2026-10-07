import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import { useNavigate } from 'react-router-dom';
import { notificationAPI } from '../services/api';
import { formatDateTime } from '../utils/dateFormatter';
import { getRedirectUrl, getCategoryIcon, getPriorityColor } from '../utils/notificationMaps';

const NotificationPanel = ({ isOpen, onClose }) => {
    const [notifications, setNotifications] = useState([]);
    const [filter, setFilter] = useState('unread');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen, filter]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const data = await notificationAPI.getNotifications(0, 10, filter === 'unread' ? false : null);
            setNotifications(data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id) => {
        try {
            await notificationAPI.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationAPI.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        try {
            await notificationAPI.deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const handleNotificationClick = (notification) => {
        if (!notification.is_read) {
            handleMarkAsRead(notification.id);
        }
        const redirectUrl = getRedirectUrl(notification);
        if (redirectUrl) {
            window.location.href = redirectUrl;
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                <div className="modal-dialog modal-dialog-scrollable modal-dialog-centered" style={{ maxWidth: '500px' }}>
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Notifications</h5>
                            <button type="button" className="btn-close" onClick={onClose}></button>
                        </div>
                        <div className="d-flex justify-content-between align-items-center px-24 py-12 border-bottom">
                            <div className="btn-group btn-group-sm">
                                <button className={`btn ${filter === 'unread' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setFilter('unread')}>Unread</button>
                                <button className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setFilter('all')}>All</button>
                            </div>
                            <button className="btn btn-sm btn-link text-decoration-none" onClick={handleMarkAllAsRead}>
                                <Icon icon="solar:check-read-outline" className="me-1" />Mark all read
                            </button>
                        </div>
                        <div className="modal-body p-0" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {loading ? (
                                <div className="text-center py-4">
                                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="text-center py-5 text-muted">
                                    <Icon icon="solar:bell-off-outline" className="text-4xl mb-2" />
                                    <p className="mb-0">No notifications</p>
                                </div>
                            ) : (
                                notifications.map(notif => (
                                    <div
                                        key={notif.id}
                                        className={`p-16 border-bottom cursor-pointer ${!notif.is_read ? 'bg-neutral-50' : ''}`}
                                        onClick={() => handleNotificationClick(notif)}
                                        style={{ borderLeft: `4px solid ${getPriorityColor(notif.priority)}` }}
                                    >
                                        <div className="d-flex gap-3">
                                            <div className="flex-shrink-0">
                                                <Icon icon={getCategoryIcon(notif.category)} className="text-2xl text-primary-600" />
                                            </div>
                                            <div className="flex-grow-1">
                                                <div className="d-flex justify-content-between align-items-start mb-1">
                                                    <h6 className="mb-0 fw-semibold text-sm">{notif.title}</h6>
                                                    {!notif.is_read && <span className="badge bg-primary rounded-circle" style={{ width: '8px', height: '8px', padding: 0 }}></span>}
                                                </div>
                                                <p className="mb-1 text-sm text-secondary-light">{notif.message}</p>
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <small className="text-muted">{formatDateTime(notif.created_at)}</small>
                                                    <button className="btn btn-sm btn-link text-danger p-0" onClick={(e) => handleDelete(notif.id, e)}>
                                                        <Icon icon="solar:trash-bin-minimalistic-outline" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="modal-footer border-top">
                            <button 
                                // className="btn btn-primary w-100" 
                                className="btn w-100"
                                onClick={() => {
                                    onClose();
                                    navigate('/notifications');
                                }}
                            >
                                See All Notifications
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show" onClick={onClose}></div>
        </>
    );
};

export default NotificationPanel;