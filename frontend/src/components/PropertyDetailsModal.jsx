import React, { useState } from 'react'
import './PropertyDetailsModal.css'

const PropertyDetailsModal = ({ property, isOpen, onClose, currentUser }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [requestSent, setRequestSent] = useState(false)

  if (!isOpen || !property) return null

  const handleSendRequest = async () => {
    if (!currentUser) {
      alert('Please log in to send a request')
      return
    }

    if (currentUser.user_id === property.user_id) {
      alert('You cannot request your own property')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:5000/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listing_id: property.listing_id,
          sender_id: currentUser.user_id,
          message: message || 'I am interested in this property'
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        setRequestSent(true)
        alert('Request sent successfully!')
      } else {
        alert(data.message || 'Failed to send request')
      }
    } catch (error) {
      console.error('Error sending request:', error)
      alert('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (date) => {
    if (!date) return 'Not specified'
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{property.title}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="property-info">
            <div className="info-section">
              <h3>Property Details</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Rent:</label>
                  <span className="rent-amount">{formatCurrency(property.rent)}/month</span>
                </div>
                <div className="info-item">
                  <label>Room Type:</label>
                  <span>{property.room_type}</span>
                </div>
                <div className="info-item">
                  <label>City:</label>
                  <span>{property.city}</span>
                </div>
                <div className="info-item">
                  <label>Gender Preference:</label>
                  <span>{property.gender_pref}</span>
                </div>
                <div className="info-item">
                  <label>Available From:</label>
                  <span>{formatDate(property.available_from)}</span>
                </div>
              </div>
              
              {property.description && (
                <div className="description">
                  <label>Description:</label>
                  <p>{property.description}</p>
                </div>
              )}
            </div>

            <div className="info-section">
              <h3>Owner Information</h3>
              <div className="owner-info">
                <div className="info-item">
                  <label>Name:</label>
                  <span>{property.owner_name}</span>
                </div>
                <div className="info-item">
                  <label>Email:</label>
                  <span>{property.owner_email}</span>
                </div>
                {property.owner_phone && (
                  <div className="info-item">
                    <label>Phone:</label>
                    <span>{property.owner_phone}</span>
                  </div>
                )}
              </div>
            </div>

            {currentUser && currentUser.role === 'Taker' && currentUser.user_id !== property.user_id && (
              <div className="info-section">
                <h3>Send Request</h3>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a message (optional)"
                  className="message-input"
                  rows="3"
                />
                <button 
                  onClick={handleSendRequest}
                  disabled={isLoading || requestSent}
                  className={`send-request-btn ${requestSent ? 'sent' : ''}`}
                >
                  {isLoading ? 'Sending...' : requestSent ? 'Request Sent' : 'Send Request'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PropertyDetailsModal