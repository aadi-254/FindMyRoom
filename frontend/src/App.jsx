import React, { useState, useEffect } from 'react'
import './App.css'

// Import components
import Login from './components/Login'
import Signup from './components/Signup'
import Search from './components/Search'
import Navbar from './components/Navbar'
import Profile from './components/Profile'
import Dashboard from './components/Dashboard'
import RequestHistory from './components/RequestHistory'

function App() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentView, setCurrentView] = useState('login') // 'login', 'signup', 'search', 'profile', 'dashboard', 'requests'

  // Check if user is logged in on app start
  useEffect(() => {
    const userData = localStorage.getItem('user')
    
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        // Route based on user role
        setCurrentView(parsedUser.role === 'Seller' ? 'dashboard' : 'search')
      } catch (error) {
        console.error('Error parsing user data:', error)
        localStorage.removeItem('user')
        setCurrentView('login')
      }
    } else {
      setCurrentView('login')
    }
    setIsLoading(false)
  }, [])

  // Handle successful login/signup
  const handleAuthSuccess = (userData) => {
    setUser(userData)
    // Route based on user role
    setCurrentView(userData.role === 'Seller' ? 'dashboard' : 'search')
  }

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('user')
    setUser(null)
    setCurrentView('login')
  }

  // Handle view switching
  const switchToLogin = () => setCurrentView('login')
  const switchToSignup = () => setCurrentView('signup')
  const switchToSearch = () => setCurrentView('search')
  const switchToDashboard = () => setCurrentView('dashboard')
  const switchToProfile = () => {
    setCurrentView('profile')
  }
  
  const switchToRequests = () => {
    setCurrentView('requests')
  }
  
  // Smart navigation based on user role
  const switchToHome = () => {
    if (user?.role === 'Seller') {
      setCurrentView('dashboard')
    } else {
      setCurrentView('search')
    }
  }

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }



  return (
    <div className="App">
      {user && <Navbar user={user} onLogout={handleLogout} onSwitchToProfile={switchToProfile} onSwitchToHome={switchToHome} onSwitchToRequests={switchToRequests} />}
      
      {/* Render current view */}
      {currentView === 'login' && (
        <Login 
          onSwitchToSignup={switchToSignup}
          onLoginSuccess={handleAuthSuccess}
        />
      )}
      
      {currentView === 'signup' && (
        <Signup 
          onSwitchToLogin={switchToLogin}
          onSignupSuccess={handleAuthSuccess}
        />
      )}
      
      {currentView === 'search' && user && (
        <Search user={user} />
      )}
      
      {currentView === 'dashboard' && user && (
        <Dashboard user={user} onSwitchToProfile={switchToProfile} />
      )}
      
      {currentView === 'profile' && user && (
        <Profile user={user} onBackToSearch={switchToHome} />
      )}
      
      {currentView === 'requests' && user && (
        <RequestHistory user={user} />
      )}
    </div>
  )
}



export default App
