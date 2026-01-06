import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MyLeadRequests.css';

const MyLeadRequests = ({ userId }) => {
    const [leadRequests, setLeadRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userPoints, setUserPoints] = useState(0);

    useEffect(() => {
        fetchLeadRequests();
        fetchUserPoints();
    }, [userId]);

    const fetchLeadRequests = async () => {
        try {
            const response = await axios.get(
                `http://localhost:5000/api/lead-requests/user/${userId}`
            );
            if (response.data.success) {
                setLeadRequests(response.data.leadRequests);
            }
        } catch (error) {
            console.error('Error fetching lead requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserPoints = async () => {
        try {
            const response = await axios.get(
                `http://localhost:5000/api/auth/user/${userId}`
            );
            if (response.data.success) {
                setUserPoints(response.data.user.points);
            }
        } catch (error) {
            console.error('Error fetching user points:', error);
        }
    };

    const getStatusBadge = (confirmed, pointsAwarded) => {
        if (confirmed && pointsAwarded) {
            return <span className="status-badge confirmed">✓ Confirmed & Rewarded</span>;
        } else if (confirmed) {
            return <span className="status-badge confirmed">✓ Confirmed</span>;
        } else {
            return <span className="status-badge pending">⏳ Pending Verification</span>;
        }
    };

    if (loading) {
        return <div className="loading">Loading your lead requests...</div>;
    }

    return (
        <div className="my-lead-requests">
            <div className="points-banner">
                <div className="points-display">
                    <span className="points-icon">🏆</span>
                    <div className="points-info">
                        <span className="points-label">Your Reward Points</span>
                        <span className="points-value">{userPoints}</span>
                    </div>
                </div>
                <p className="points-description">
                    Earn more points by suggesting properties to list on FindMyRoom!
                </p>
            </div>

            <div className="lead-requests-section">
                <h2>Your Lead Requests</h2>
                
                {leadRequests.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">📋</span>
                        <p>You haven't submitted any lead requests yet.</p>
                        <p className="empty-hint">
                            Start earning rewards by suggesting properties!
                        </p>
                    </div>
                ) : (
                    <div className="lead-requests-grid">
                        {leadRequests.map((request) => (
                            <div key={request.lead_request_id} className="lead-request-card">
                                <div className="card-header">
                                    <h3>{request.property_address}</h3>
                                    {getStatusBadge(request.confirmed, request.points_awarded)}
                                </div>
                                
                                <div className="card-body">
                                    <div className="detail-row">
                                        <span className="label">Owner:</span>
                                        <span className="value">{request.owner_name}</span>
                                    </div>
                                    
                                    <div className="detail-row">
                                        <span className="label">Phone:</span>
                                        <span className="value">{request.owner_phone}</span>
                                    </div>
                                    
                                    <div className="detail-row">
                                        <span className="label">City:</span>
                                        <span className="value">{request.city}</span>
                                    </div>
                                    
                                    {request.room_type && (
                                        <div className="detail-row">
                                            <span className="label">Type:</span>
                                            <span className="value">{request.room_type}</span>
                                        </div>
                                    )}
                                    
                                    {request.expected_rent && (
                                        <div className="detail-row">
                                            <span className="label">Expected Rent:</span>
                                            <span className="value">₹{request.expected_rent}</span>
                                        </div>
                                    )}
                                    
                                    {request.points_awarded && (
                                        <div className="reward-info">
                                            <span className="reward-icon">🎉</span>
                                            <span>Earned {request.reward_points} points!</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="card-footer">
                                    <span className="submitted-date">
                                        Submitted on {new Date(request.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyLeadRequests;
