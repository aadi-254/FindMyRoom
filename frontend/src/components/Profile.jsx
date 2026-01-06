import React, { useState, useEffect } from 'react'
import './Profile.css'

const Profile = ({ user, onUserUpdate, onBackToSearch }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    gender: '',
    bio: '',
    role: ''
  })
  const [originalData, setOriginalData] = useState({})
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Initialize form data with user data
  useEffect(() => {
    if (user) {
      const userData = {
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        gender: user.gender || '',
        bio: user.bio || '',
        role: user.role || ''
      }
      setFormData(userData)
      setOriginalData(userData)
    }
  }, [user])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
    
    // Clear success message when editing
    if (successMessage) {
      setSuccessMessage('')
    }
  }

  const validateForm = () => {
    const newErrors = {}

    // Full name validation
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required'
    } else if (formData.full_name.trim().length < 2) {
      newErrors.full_name = 'Full name must be at least 2 characters'
    }

    // Phone validation (optional but if provided should be valid)
    if (formData.phone && !/^[+]?[\d\s\-\(\)]{10,15}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number'
    }

    // Bio validation (optional, but limit length if provided)
    if (formData.bio && formData.bio.length > 500) {
      newErrors.bio = 'Bio must be less than 500 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch(`http://localhost:5000/api/auth/profile/${user.user_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          phone: formData.phone || null,
          gender: formData.gender || null,
          bio: formData.bio || null
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Update user data in localStorage
        localStorage.setItem('user', JSON.stringify(data.user))
        
        // Update parent component
        if (onUserUpdate) {
          onUserUpdate(data.user)
        }
        
        setOriginalData(formData)
        setIsEditing(false)
        setSuccessMessage('Profile updated successfully!')
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setErrors({ general: data.message || 'Profile update failed' })
      }
    } catch (error) {
      console.error('Profile update error:', error)
      setErrors({ general: 'Network error. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData(originalData)
    setErrors({})
    setSuccessMessage('')
    setIsEditing(false)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getRoleColor = (role) => {
    return role === 'Seller' ? '#28a745' : '#007bff'
  }

  const getRoleIcon = (role) => {
    return role === 'Seller' ? '🏠' : '🔍'
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <button className="back-button" onClick={onBackToSearch}>
          ← Back to Search
        </button>
        <h1>My Profile</h1>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          {/* Profile Avatar Section */}
          <div className="profile-avatar-section">
            <div className="profile-avatar">
              {formData.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="profile-basic-info">
              <h2>{formData.full_name}</h2>
              <div className="role-badge" style={{ backgroundColor: getRoleColor(formData.role) }}>
                {getRoleIcon(formData.role)} {formData.role}
              </div>
              <p className="join-date">
                Member since {formatDate(user?.created_at)}
              </p>
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="success-message">
              ✅ {successMessage}
            </div>
          )}

          {/* Error Message */}
          {errors.general && (
            <div className="error-message">
              ❌ {errors.general}
            </div>
          )}

          {/* Profile Form */}
          <div className="profile-form">
            <div className="form-section">
              <h3>Personal Information</h3>
              
              <div className="form-row">
                <div className="input-group">
                  <label htmlFor="full_name">Full Name *</label>
                  <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={errors.full_name ? 'error' : ''}
                  />
                  {errors.full_name && (
                    <span className="error-text">{errors.full_name}</span>
                  )}
                </div>

                <div className="input-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    disabled={true}
                    className="disabled-input"
                    title="Email cannot be changed"
                  />
                  <small className="input-note">Email cannot be modified</small>
                </div>
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="Enter your phone number"
                    className={errors.phone ? 'error' : ''}
                  />
                  {errors.phone && (
                    <span className="error-text">{errors.phone}</span>
                  )}
                </div>

                <div className="input-group">
                  <label htmlFor="gender">Gender</label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    disabled={!isEditing}
                  >
                    <option value="">Select gender (optional)</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="role">Role</label>
                <input
                  type="text"
                  id="role"
                  name="role"
                  value={formData.role}
                  disabled={true}
                  className="disabled-input"
                  title="Role cannot be changed"
                />
                <small className="input-note">Role cannot be modified</small>
              </div>

              <div className="input-group">
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="Tell us a bit about yourself"
                  rows="4"
                  className={errors.bio ? 'error' : ''}
                />
                <small className="char-count">
                  {formData.bio.length}/500 characters
                </small>
                {errors.bio && (
                  <span className="error-text">{errors.bio}</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="profile-actions">
            {!isEditing ? (
              <button
                className="edit-button"
                onClick={() => setIsEditing(true)}
              >
                ✏️ Edit Profile
              </button>
            ) : (
              <div className="edit-actions">
                <button
                  className="save-button"
                  onClick={handleSave}
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : '💾 Save Changes'}
                </button>
                <button
                  className="cancel-button"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  ❌ Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Statistics Card */}
        <div className="stats-card">
          <h3>Account Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-icon">📅</div>
              <div className="stat-info">
                <span className="stat-label">Joined</span>
                <span className="stat-value">{formatDate(user?.created_at)}</span>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">{getRoleIcon(formData.role)}</div>
              <div className="stat-info">
                <span className="stat-label">Role</span>
                <span className="stat-value">{formData.role}</span>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">✅</div>
              <div className="stat-info">
                <span className="stat-label">Status</span>
                <span className="stat-value">Active</span>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">📧</div>
              <div className="stat-info">
                <span className="stat-label">Email</span>
                <span className="stat-value">Verified</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile