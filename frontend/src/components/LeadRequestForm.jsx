import React, { useState } from 'react';
import axios from 'axios';
import './LeadRequestForm.css';

const LeadRequestForm = () => {
    const [formData, setFormData] = useState({
        ownerName: '',
        ownerPhone: '',
        ownerEmail: '',
        propertyAddress: '',
        city: '',
        roomType: '1BHK',
        expectedRent: '',
        additionalDetails: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage({ type: '', text: '' });

        try {
            const user = JSON.parse(localStorage.getItem('user'));
            
            if (!user) {
                setMessage({ 
                    type: 'error', 
                    text: 'Please login to submit a lead request' 
                });
                setIsSubmitting(false);
                return;
            }

            const response = await axios.post(
                'http://localhost:5000/api/lead-requests/submit',
                {
                    requesterId: user.user_id,
                    requesterName: user.full_name,
                    ...formData
                }
            );

            if (response.data.success) {
                setMessage({ 
                    type: 'success', 
                    text: response.data.message + ' You will earn reward points once verified!' 
                });
                
                // Reset form
                setFormData({
                    ownerName: '',
                    ownerPhone: '',
                    ownerEmail: '',
                    propertyAddress: '',
                    city: '',
                    roomType: '1BHK',
                    expectedRent: '',
                    additionalDetails: ''
                });
            }
        } catch (error) {
            setMessage({ 
                type: 'error', 
                text: error.response?.data?.message || 'Failed to submit lead request' 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="lead-request-container">
            <div className="lead-request-header">
                <h2>🎯 Suggest a Property - Earn Rewards!</h2>
                <p className="lead-description">
                    Know a property owner looking to rent? Share their details with us and earn 
                    <strong> reward points</strong> when they list their property!
                </p>
                <div className="reward-badge">
                    <span className="reward-icon">🏆</span>
                    <span>Earn up to 50 points per confirmed listing!</span>
                </div>
            </div>

            <form className="lead-request-form" onSubmit={handleSubmit}>
                <div className="form-section">
                    <h3>Property Owner Details</h3>
                    
                    <div className="form-group">
                        <label htmlFor="ownerName">Owner's Name *</label>
                        <input
                            type="text"
                            id="ownerName"
                            name="ownerName"
                            value={formData.ownerName}
                            onChange={handleChange}
                            placeholder="Enter property owner's name"
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="ownerPhone">Phone Number *</label>
                            <input
                                type="tel"
                                id="ownerPhone"
                                name="ownerPhone"
                                value={formData.ownerPhone}
                                onChange={handleChange}
                                placeholder="Enter phone number"
                                pattern="[0-9]{10}"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="ownerEmail">Email (Optional)</label>
                            <input
                                type="email"
                                id="ownerEmail"
                                name="ownerEmail"
                                value={formData.ownerEmail}
                                onChange={handleChange}
                                placeholder="Enter email address"
                            />
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <h3>Property Details</h3>
                    
                    <div className="form-group">
                        <label htmlFor="propertyAddress">Property Address *</label>
                        <textarea
                            id="propertyAddress"
                            name="propertyAddress"
                            value={formData.propertyAddress}
                            onChange={handleChange}
                            placeholder="Enter complete property address"
                            rows="3"
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="city">City *</label>
                            <input
                                type="text"
                                id="city"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                placeholder="Enter city name"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="roomType">Room Type</label>
                            <select
                                id="roomType"
                                name="roomType"
                                value={formData.roomType}
                                onChange={handleChange}
                            >
                                <option value="1BHK">1BHK</option>
                                <option value="2BHK">2BHK</option>
                                <option value="PG">PG</option>
                                <option value="Shared">Shared</option>
                                <option value="Hostel">Hostel</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="expectedRent">Expected Rent (₹)</label>
                            <input
                                type="number"
                                id="expectedRent"
                                name="expectedRent"
                                value={formData.expectedRent}
                                onChange={handleChange}
                                placeholder="Enter expected rent"
                                min="0"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="additionalDetails">Additional Details</label>
                        <textarea
                            id="additionalDetails"
                            name="additionalDetails"
                            value={formData.additionalDetails}
                            onChange={handleChange}
                            placeholder="Any additional information about the property..."
                            rows="4"
                        />
                    </div>
                </div>

                {message.text && (
                    <div className={`message ${message.type}`}>
                        {message.text}
                    </div>
                )}

                <div className="form-actions">
                    <button 
                        type="submit" 
                        className="submit-btn"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Lead Request'}
                    </button>
                </div>

                <div className="info-box">
                    <h4>How it works:</h4>
                    <ol>
                        <li>Submit the property owner's details and location</li>
                        <li>We'll verify and contact the property owner</li>
                        <li>Once they list their property, you earn reward points!</li>
                        <li>Use your points for premium features</li>
                    </ol>
                </div>
            </form>
        </div>
    );
};

export default LeadRequestForm;
