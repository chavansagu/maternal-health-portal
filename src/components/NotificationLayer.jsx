import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import { notificationAPI } from '../services/api';
import { getRedirectUrl, getCategoryIcon, getPriorityColor, categoryFilterOptions } from '../utils/notificationMaps';

const NotificationLayer = () => {
    const [notifications, setNotifications] = useState([]);
    const [filter, setFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    useEffect(() => {
        fetchNotifications();
    }, [filter, categoryFilter]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const data = await notificationAPI.getNotifications(
                0, 
                1000, 
                filter === 'unread' ? false : null,
                categoryFilter || null
            );
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

    const handleDelete = async (id) => {
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

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    const paginatedNotifications = notifications.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const totalPages = Math.ceil(notifications.length / itemsPerPage);

    return (
        <div className="card h-100 p-0 radius-12">
            <div className="card-body p-24">
                <div className="d-flex justify-content-between align-items-center mb-20">
                    <h5 className="mb-0">All Notifications</h5>
                    <button className="btn btn-sm btn-primary" onClick={handleMarkAllAsRead}>
                        <Icon icon="solar:check-read-outline" className="me-1" />
                        Mark All as Read
                    </button>
                </div>

                <div className="d-flex gap-2 mb-20 flex-wrap">
                    <button className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setFilter('all')}>All</button>
                    <button className={`btn btn-sm ${filter === 'unread' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setFilter('unread')}>Unread</button>
                    <select className="form-select form-select-sm" style={{width: 'auto'}} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                        <option value="">All Categories</option>
                        {categoryFilterOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                {loading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                        <Icon icon="solar:bell-off-outline" style={{fontSize: '48px'}} className="mb-3" />
                        <p className="mb-0">No notifications found</p>
                    </div>
                ) : (
                    <>
                        <div className="notification-list">
                            {paginatedNotifications.map(notif => (
                                <div
                                    key={notif.id}
                                    className={`p-12 mb-8 border rounded cursor-pointer ${!notif.is_read ? 'bg-neutral-50' : ''}`}
                                    onClick={() => handleNotificationClick(notif)}
                                    style={{ borderLeft: `3px solid ${getPriorityColor(notif.priority)}` }}
                                >
                                    <div className="d-flex gap-2 align-items-start">
                                        <div className="flex-shrink-0">
                                            <Icon icon={getCategoryIcon(notif.category)} className="text-xl text-primary-600" />
                                        </div>
                                        <div className="flex-grow-1">
                                            <div className="d-flex justify-content-between align-items-start mb-1">
                                                <h6 className="mb-0 fw-semibold text-sm">{notif.title}</h6>
                                                <div className="d-flex align-items-center gap-2">
                                                    <small className="text-muted" style={{fontSize: '11px'}}>{formatDate(notif.created_at)}</small>
                                                    {!notif.is_read && <span className="badge bg-primary" style={{fontSize: '10px', padding: '2px 6px'}}>New</span>}
                                                </div>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center">
                                                <p className="mb-0 text-sm text-secondary-light">{notif.message}</p>
                                                <button 
                                                    className="btn btn-sm btn-link text-danger p-0 ms-2" 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(notif.id);
                                                    }}
                                                >
                                                    <Icon icon="solar:trash-bin-minimalistic-outline" style={{fontSize: '16px'}} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="d-flex align-items-center justify-content-between mt-24">
                                <span>Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, notifications.length)} of {notifications.length} notifications</span>
                                <ul className="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
                                    <li className="page-item">
                                        <button
                                            className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px"
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <Icon icon="ep:d-arrow-left" />
                                        </button>
                                    </li>
                                    {[...Array(totalPages)].map((_, i) => (
                                        <li key={i + 1} className="page-item">
                                            <button
                                                className={`page-link fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px ${
                                                    currentPage === i + 1 ? 'bg-primary-600 text-white' : 'bg-neutral-200 text-secondary-light'
                                                }`}
                                                onClick={() => setCurrentPage(i + 1)}
                                            >
                                                {i + 1}
                                            </button>
                                        </li>
                                    ))}
                                    <li className="page-item">
                                        <button
                                            className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px"
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                        >
                                            <Icon icon="ep:d-arrow-right" />
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default NotificationLayer;