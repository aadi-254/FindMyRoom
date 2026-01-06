import React, { useState } from 'react'
import './Navbar.css'

const Navbar = ({ user, onLogout, onSwitchToProfile, onSwitchToHome, onSwitchToRequests }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleLogout = (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    console.log('Logout button clicked!')
    console.log('onLogout function:', onLogout)
    
    // Close menu first
    setIsMenuOpen(false)
    
    // Then logout with a small delay to ensure menu closes
    setTimeout(() => {
      if (onLogout) {
        onLogout()
        console.log('Logout function called successfully!')
      } else {
        console.error('onLogout function is not available!')
      }
    }, 150)
  }

  const handleProfileClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Profile button clicked!')
    console.log('onSwitchToProfile function:', onSwitchToProfile)
    
    // Close menu first
    setIsMenuOpen(false)
    
    // Then switch to profile with a small delay
    setTimeout(() => {
      if (onSwitchToProfile) {
        onSwitchToProfile()
        console.log('Profile switch function called successfully!')
      } else {
        console.error('onSwitchToProfile function is not available!')
      }
    }, 100)
  }

  const handleHomeClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Home button clicked!')
    if (onSwitchToHome) {
      onSwitchToHome()
    }
    setIsMenuOpen(false)
  }

  const handleRequestsClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Requests button clicked!')
    if (onSwitchToRequests) {
      onSwitchToRequests()
    }
    setIsMenuOpen(false)
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <div className="navbar-brand" onClick={handleHomeClick} style={{ cursor: 'pointer' }}>
          <h2>🏠 FindMyRoom</h2>
        </div>

        {/* User info and menu */}
        <div className="navbar-user">
          <div className="user-info">
            <span className="user-name">Hello, {user.full_name}</span>
            <span className="user-role">{user.role}</span>
          </div>
          
          {/* Direct Profile Button */}
          <button 
            className="profile-btn-navbar"
            onClick={() => {
              console.log('Direct navbar profile button clicked!')
              onSwitchToProfile && onSwitchToProfile()
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              marginRight: '10px',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
          >
            👤 Profile
          </button>

          {/* Request History Button */}
          <button 
            className="requests-btn-navbar"
            onClick={() => {
              console.log('Direct navbar requests button clicked!')
              onSwitchToRequests && onSwitchToRequests()
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              marginRight: '10px',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
          >
            📋 Requests
          </button>

          {/* Direct Logout Button for Testing */}
        

          <div className="user-menu">
            <button 
              className="menu-toggle"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <div className="avatar">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
            </button>
            


            {isMenuOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-header">
                  <div className="dropdown-user-info">
                    <strong>{user.full_name}</strong>
                    <small>{user.email}</small>
                  </div>
                </div>
                
                <div className="dropdown-divider"></div>
                
                <button className="dropdown-item" onClick={handleHomeClick}>
                  🏠 {user.role === 'Seller' ? 'Dashboard' : 'Search Rooms'}
                </button>
               
                <button className="dropdown-item">
                  ❤️ Bookmarks
                </button>
                <button className="dropdown-item">
                  ⚙️ Settings
                </button>
                
                <div className="dropdown-divider"></div>
                
                <div 
                  className="dropdown-item logout"
                  onClick={() => {
                    console.log('Dropdown logout div clicked!')
                    setIsMenuOpen(false)
                    setTimeout(() => {
                      onLogout && onLogout()
                    }, 100)
                  }}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  🚪 Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close menu */}
      {isMenuOpen && (
        <div 
          className="menu-overlay"
          onClick={(e) => {
            e.stopPropagation()
            setTimeout(() => setIsMenuOpen(false), 100)
          }}
        ></div>
      )}
    </nav>
  )
}

export default Navbar