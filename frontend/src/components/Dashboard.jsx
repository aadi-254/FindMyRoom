import React, { useState, useEffect } from 'react'
import './Dashboard.css'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix default marker icon issue with Leaflet in React
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const Dashboard = ({ user, onSwitchToProfile }) => {
  const [listings, setListings] = useState([])
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddListing, setShowAddListing] = useState(false)
  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0,
    totalRequests: 0,
    pendingRequests: 0
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch user's listings
      const listingsResponse = await fetch(`http://localhost:5000/api/listings/user/${user.user_id}`)
      const listingsData = await listingsResponse.json()
      
      // Fetch requests for user's listings
      const requestsResponse = await fetch(`http://localhost:5000/api/requests/received/${user.user_id}`)
      const requestsData = await requestsResponse.json()
      
      setListings(listingsData)
      setRequests(requestsData)
      
      // Calculate stats
      setStats({
        totalListings: listingsData.length,
        activeListings: listingsData.length,
        totalRequests: requestsData.length,
        pendingRequests: requestsData.filter(req => req.status === 'Pending').length
      })
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequestAction = async (requestId, action) => {
    try {
      const response = await fetch(`http://localhost:5000/api/requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: action, user_id: user.user_id })
      })
      
      if (response.ok) {
        fetchDashboardData() // Refresh data
      }
    } catch (error) {
      console.error('Error updating request:', error)
    }
  }

  const handleDeleteListing = async (listingId) => {
    if (window.confirm('Are you sure you want to delete this listing?')) {
      try {
        const response = await fetch(`http://localhost:5000/api/listings/${listingId}?user_id=${user.user_id}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          fetchDashboardData() // Refresh data
        }
      } catch (error) {
        console.error('Error deleting listing:', error)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>🏠 Seller Dashboard</h1>
        <p>Welcome back, {user.full_name}!</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🏡</div>
          <div className="stat-info">
            <h3>{stats.totalListings}</h3>
            <p>Total Listings</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>{stats.activeListings}</h3>
            <p>Active Listings</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📩</div>
          <div className="stat-info">
            <h3>{stats.totalRequests}</h3>
            <p>Total Requests</p>
          </div>
        </div>
        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <h3>{stats.pendingRequests}</h3>
            <p>Pending Requests</p>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Left Column - Listings */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>🏠 Your Listings</h2>
            <button 
              className="add-listing-btn"
              onClick={() => setShowAddListing(true)}
            >
              + Add New Listing
            </button>
          </div>

          {listings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏠</div>
              <h3>No listings yet</h3>
              <p>Create your first listing to start receiving rental requests</p>
              <button 
                className="primary-btn"
                onClick={() => setShowAddListing(true)}
              >
                Create Your First Listing
              </button>
            </div>
          ) : (
            <div className="listings-grid">
              {listings.map(listing => (
                <div key={listing.listing_id} className="listing-card">
                  <div className="listing-header">
                    <h3>{listing.title}</h3>
                    <div className="listing-actions">
                      <button className="edit-btn">✏️</button>
                      <button 
                        className="delete-btn"
                        onClick={() => handleDeleteListing(listing.listing_id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="listing-details">
                    <p><strong>Rent:</strong> ₹{listing.rent}/month</p>
                    <p><strong>Type:</strong> {listing.room_type}</p>
                    <p><strong>City:</strong> {listing.city}</p>
                    <p><strong>Gender Preference:</strong> {listing.gender_pref}</p>
                    <p><strong>Available From:</strong> {new Date(listing.available_from).toLocaleDateString()}</p>
                  </div>
                  <div className="listing-description">
                    <p>{listing.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Requests */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>📩 Rental Requests</h2>
          </div>

          {requests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📩</div>
              <h3>No requests yet</h3>
              <p>Once you create listings, interested users will send you requests</p>
            </div>
          ) : (
            <div className="requests-list">
              {requests.map(request => (
                <div key={request.request_id} className={`request-card ${request.status.toLowerCase()}`}>
                  <div className="request-header">
                    <div className="requester-info">
                      <div className="requester-avatar">
                        {request.sender_name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4>{request.sender_name}</h4>
                        <p>{request.sender_email}</p>
                      </div>
                    </div>
                    <div className={`status-badge ${request.status.toLowerCase()}`}>
                      {request.status}
                    </div>
                  </div>
                  
                  <div className="request-details">
                    <p><strong>Property:</strong> {request.listing_title}</p>
                    <p><strong>Request Date:</strong> {new Date(request.created_at).toLocaleDateString()}</p>
                  </div>

                  {request.status === 'Pending' && (
                    <div className="request-actions">
                      <button 
                        className="accept-btn"
                        onClick={() => handleRequestAction(request.request_id, 'Accepted')}
                      >
                        ✅ Accept
                      </button>
                      <button 
                        className="reject-btn"
                        onClick={() => handleRequestAction(request.request_id, 'Rejected')}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Listing Modal */}
      {showAddListing && (
        <AddListingModal 
          user={user}
          onClose={() => setShowAddListing(false)}
          onSuccess={() => {
            setShowAddListing(false)
            fetchDashboardData()
          }}
        />
      )}
    </div>
  )
}

// Map Location Selector Component
const LocationSelector = ({ position, setPosition }) => {
  const map = useMapEvents({
    click(e) {
      setPosition({
        lat: e.latlng.lat,
        lng: e.latlng.lng
      })
    }
  })

  return position ? <Marker position={[position.lat, position.lng]} /> : null
}

// Add Listing Modal Component
const AddListingModal = ({ user, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rent: '',
    city: '',
    address: '',
    room_type: '1BHK',
    gender_pref: 'Any',
    available_from: ''
  })
  const [mapPosition, setMapPosition] = useState({ lat: 20.5937, lng: 78.9629 }) // Default center of India
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('http://localhost:5000/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          user_id: user.user_id,
          latitude: mapPosition.lat,
          longitude: mapPosition.lng
        })
      })

      if (response.ok) {
        onSuccess()
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to create listing')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Add New Listing</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="listing-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-row">
            <div className="input-group">
              <label>Property Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Spacious 2BHK in Downtown"
                required
              />
            </div>
            <div className="input-group">
              <label>Monthly Rent (₹)</label>
              <input
                type="number"
                name="rent"
                value={formData.rent}
                onChange={handleChange}
                placeholder="15000"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label>Room Type</label>
              <select name="room_type" value={formData.room_type} onChange={handleChange}>
                <option value="1BHK">1BHK</option>
                <option value="2BHK">2BHK</option>
                <option value="PG">PG</option>
                <option value="Shared">Shared</option>
                <option value="Hostel">Hostel</option>
              </select>
            </div>
            <div className="input-group">
              <label>Gender Preference</label>
              <select name="gender_pref" value={formData.gender_pref} onChange={handleChange}>
                <option value="Any">Any</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label>City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Mumbai"
                required
              />
            </div>
            <div className="input-group">
              <label>Available From</label>
              <input
                type="date"
                name="available_from"
                value={formData.available_from}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Full Address *</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter complete address with street, landmark, etc."
              required
            />
          </div>

          <div className="input-group">
            <label>Select Location on Map *</label>
            <p className="map-instruction">Click on the map to select the exact location of your property</p>
            <div className="map-container">
              <MapContainer 
                center={[mapPosition.lat, mapPosition.lng]} 
                zoom={5} 
                style={{ height: '300px', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <LocationSelector position={mapPosition} setPosition={setMapPosition} />
              </MapContainer>
            </div>
            <p className="coordinates-display">
              📍 Selected: Latitude {mapPosition.lat.toFixed(6)}, Longitude {mapPosition.lng.toFixed(6)}
            </p>
          </div>

          <div className="input-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your property, amenities, nearby locations..."
              rows="4"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Dashboard