import React, { useState, useEffect, useRef, useCallback } from 'react'

const Home = () => {
  const [map, setMap] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [geocoder, setGeocoder] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false)
  const mapRef = useRef(null)
  const markersRef = useRef([])

  // Fetch API key from backend
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/maps-config')
        const data = await response.json()
        setApiKey(data.apiKey)
      } catch (error) {
        console.error('Error fetching API key:', error)
        setError('Failed to load configuration')
      }
    }
    fetchApiKey()
  }, [])

  // Load Google Maps API dynamically with proper callback loading
  useEffect(() => {
    if (!apiKey) return

    let isMounted = true

    const loadGoogleMapsScript = () => {
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps && window.google.maps.Map) {
        if (isMounted) {
          setIsGoogleMapsLoaded(true)
          setTimeout(() => initializeMap(), 100) // Small delay to ensure DOM is ready
        }
        return
      }

      // Check if script is already loading/loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
      if (existingScript) {
        // Script exists, wait for it to load
        const checkLoaded = setInterval(() => {
          if (window.google && window.google.maps && window.google.maps.Map) {
            clearInterval(checkLoaded)
            if (isMounted) {
              setIsGoogleMapsLoaded(true)
              setTimeout(() => initializeMap(), 100)
            }
          }
        }, 100)
        return
      }

      try {
        // Use a fixed callback name to avoid multiple scripts
        const callbackName = 'initGoogleMapsForFindMyRoom'
        
        // Define the global callback function
        window[callbackName] = () => {
          console.log('Google Maps API loaded successfully')
          if (isMounted) {
            setIsGoogleMapsLoaded(true)
            // Wait a bit longer to ensure container is rendered
            setTimeout(() => {
              if (mapRef.current && mapRef.current.offsetWidth > 0) {
                initializeMap()
              } else {
                // If container not ready, wait a bit more
                setTimeout(() => initializeMap(), 200)
              }
            }, 150)
          }
        }

        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&callback=${callbackName}`
        script.async = true
        script.defer = true
        script.id = 'google-maps-script'
        
        script.onerror = () => {
          if (isMounted) {
            setError('Failed to load Google Maps API')
            console.error('Google Maps script failed to load')
          }
        }
        
        document.head.appendChild(script)
      } catch (error) {
        if (isMounted) {
          setError('Error loading Google Maps script')
          console.error('Error creating Google Maps script:', error)
        }
      }
    }

    loadGoogleMapsScript()

    // Cleanup function
    return () => {
      isMounted = false
    }
  }, [apiKey])

  const initializeMap = () => {
    if (!mapRef.current) {
      console.error('Map container ref is not available')
      return
    }

    if (!window.google || !window.google.maps || !window.google.maps.Map) {
      console.error('Google Maps API is not fully loaded')
      setError('Google Maps API not available')
      return
    }

    try {
      console.log('Initializing Google Maps...')
      console.log('Map container dimensions:', mapRef.current.offsetWidth, 'x', mapRef.current.offsetHeight)
      
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: { lat: 37.7749, lng: -122.4194 }, // Default to San Francisco
        zoom: 13,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        // Removed mapId to avoid styling conflicts
      })

      const geocoderInstance = new window.google.maps.Geocoder()

      setMap(mapInstance)
      setGeocoder(geocoderInstance)
      
      // Trigger a resize to ensure map renders properly
      setTimeout(() => {
        if (mapInstance && window.google && window.google.maps && window.google.maps.event) {
          console.log('Triggering map resize...')
          window.google.maps.event.trigger(mapInstance, 'resize')
          mapInstance.setCenter({ lat: 37.7749, lng: -122.4194 })
          console.log('Map should now be visible')
        }
      }, 200)
      
      // Additional resize after a longer delay
      setTimeout(() => {
        if (mapInstance && window.google && window.google.maps && window.google.maps.event) {
          window.google.maps.event.trigger(mapInstance, 'resize')
        }
      }, 500)
      
      console.log('Google Maps initialized successfully')
    } catch (error) {
      console.error('Error initializing map:', error)
      setError('Failed to initialize map: ' + error.message)
    }
  }

  // Clear existing markers safely
  const clearMarkers = useCallback(() => {
    try {
      markersRef.current.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null)
        }
      })
      markersRef.current = []
    } catch (error) {
      console.warn('Error clearing markers:', error)
      markersRef.current = []
    }
  }, [])

  // Cleanup and resize effect
  useEffect(() => {
    const handleResize = () => {
      if (map && window.google && window.google.maps && window.google.maps.event) {
        setTimeout(() => {
          window.google.maps.event.trigger(map, 'resize')
        }, 100)
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      // Clear all markers when component unmounts
      clearMarkers()
      // Clear any open info windows
      if (window.currentInfoWindow) {
        window.currentInfoWindow.close()
        window.currentInfoWindow = null
      }
    }
  }, [map, clearMarkers])

  // Create marker (using regular markers for now to avoid complications)
  const createMarker = (position, title, content, color = 'red') => {
    if (!window.google || !window.google.maps || !map) {
      console.error('Google Maps API not available for marker creation')
      return null
    }

    try {
      // Use regular markers for stability
      const marker = new window.google.maps.Marker({
        position: position,
        map: map,
        title: title,
        icon: {
          url: `http://maps.google.com/mapfiles/ms/icons/${color}-dot.png`
        },
        animation: window.google.maps.Animation.DROP
      })

      // Add info window
      const infoWindow = new window.google.maps.InfoWindow({ 
        content: content,
        maxWidth: 300
      })
      
      marker.addListener('click', () => {
        // Close any open info windows first
        if (window.currentInfoWindow) {
          window.currentInfoWindow.close()
        }
        infoWindow.open(map, marker)
        window.currentInfoWindow = infoWindow
      })

      return marker
    } catch (error) {
      console.error('Error creating marker:', error)
      return null
    }
  }

  // Search for places
  const searchPlace = async () => {
    if (!searchInput.trim() || !map || !geocoder) {
      setError('Please enter a valid address')
      return
    }

    setIsLoading(true)
    setError('')
    clearMarkers()

    try {
      // Use promise-based geocoding instead of callback
      geocoder.geocode({ address: searchInput }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location
          const bounds = results[0].geometry.bounds
          
          // Center map on the location
          if (bounds) {
            map.fitBounds(bounds)
          } else {
            map.setCenter(location)
            map.setZoom(15)
          }

          // Create marker for the searched location
          const content = `
            <div style="padding: 10px;">
              <h4>${results[0].formatted_address}</h4>
              <p><strong>Latitude:</strong> ${location.lat().toFixed(6)}</p>
              <p><strong>Longitude:</strong> ${location.lng().toFixed(6)}</p>
              <p><strong>Type:</strong> Search Result</p>
            </div>
          `

          const marker = createMarker(
            location,
            results[0].formatted_address,
            content,
            'red'
          )

          if (marker) {
            markersRef.current.push(marker)
          }
          setIsLoading(false)
        } else {
          setError('Location not found. Please try a different address.')
          setIsLoading(false)
        }
      })
    } catch (error) {
      setError('Error searching for location')
      setIsLoading(false)
    }
  }

  // Search nearby places using the new Places API
  const searchNearbyPlaces = async (type = 'lodging') => {
    if (!map || markersRef.current.length === 0) {
      setError('Please search for a location first')
      return
    }

    const mainMarker = markersRef.current[0]
    let center

    // Get position from marker (handle both AdvancedMarkerElement and regular Marker)
    if (mainMarker.position) {
      center = mainMarker.position
    } else if (mainMarker.getPosition) {
      center = mainMarker.getPosition()
    } else {
      setError('Unable to get location from marker')
      return
    }

    try {
      // Use the newer Places API with text search
      const service = new window.google.maps.places.PlacesService(map)
      
      const request = {
        location: center,
        radius: 2000, // 2km radius
        type: type // Use string type for PlacesService
      }

      service.nearbySearch(request, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          // Clear previous nearby markers (keep the main location marker)
          const originalMarker = markersRef.current[0]
          clearMarkers()
          markersRef.current.push(originalMarker)

          // Add markers for nearby places
          results.slice(0, 10).forEach((place) => {
            if (place.geometry && place.geometry.location) {
              const content = `
                <div style="padding: 10px; max-width: 250px;">
                  <h4 style="margin: 0 0 10px 0; color: #333;">${place.name}</h4>
                  <p style="margin: 5px 0;"><strong>Rating:</strong> ${place.rating ? '⭐'.repeat(Math.floor(place.rating)) + ` (${place.rating})` : 'N/A'}</p>
                  <p style="margin: 5px 0;"><strong>Price Level:</strong> ${place.price_level ? '$'.repeat(place.price_level) : 'N/A'}</p>
                  <p style="margin: 5px 0;"><strong>Address:</strong> ${place.vicinity || 'N/A'}</p>
                  <p style="margin: 5px 0;"><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)}</p>
                  ${place.photos && place.photos[0] ? `<img src="${place.photos[0].getUrl({maxWidth: 200, maxHeight: 150})}" style="width: 100%; max-width: 200px; border-radius: 4px; margin-top: 8px;">` : ''}
                </div>
              `

              const color = type === 'lodging' ? 'blue' : type === 'restaurant' ? 'yellow' : 'green'
              
              const marker = createMarker(
                place.geometry.location,
                place.name,
                content,
                color
              )

              if (marker) {
                markersRef.current.push(marker)
              }
            }
          })
        } else {
          setError(`No ${type} places found nearby`)
        }
      })
    } catch (error) {
      console.error('Error searching nearby places:', error)
      setError('Error searching for nearby places')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchPlace()
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
        Find My Room - Location Search
      </h1>
      
      {/* Loading state for Google Maps */}
      {!isGoogleMapsLoaded && !error && (
        <div style={{ 
          color: '#007bff', 
          background: '#e7f3ff', 
          padding: '10px', 
          borderRadius: '4px', 
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          Loading Google Maps... Please wait.
        </div>
      )}
      
      {error && (
        <div style={{ 
          color: 'red', 
          background: '#ffebee', 
          padding: '10px', 
          borderRadius: '4px', 
          marginBottom: '20px' 
        }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter address (e.g., '123 Main St, New York, NY' or 'Times Square, NYC')"
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '16px',
              border: '2px solid #ddd',
              borderRadius: '6px',
              outline: 'none'
            }}
            disabled={isLoading || !isGoogleMapsLoaded}
          />
          <button
            onClick={searchPlace}
            disabled={isLoading || !searchInput.trim() || !isGoogleMapsLoaded}
            style={{
              padding: '12px 20px',
              fontSize: '16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (isLoading || !isGoogleMapsLoaded) ? 'not-allowed' : 'pointer',
              opacity: (isLoading || !isGoogleMapsLoaded) ? 0.6 : 1
            }}
          >
            {isLoading ? 'Searching...' : 'Search Location'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => searchNearbyPlaces('lodging')}
            disabled={!isGoogleMapsLoaded || markersRef.current.length === 0}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (!isGoogleMapsLoaded || markersRef.current.length === 0) ? 'not-allowed' : 'pointer',
              opacity: (!isGoogleMapsLoaded || markersRef.current.length === 0) ? 0.6 : 1
            }}
          >
            🏨 Find Hotels Nearby
          </button>
          <button
            onClick={() => searchNearbyPlaces('restaurant')}
            disabled={!isGoogleMapsLoaded || markersRef.current.length === 0}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ffc107',
              color: 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: (!isGoogleMapsLoaded || markersRef.current.length === 0) ? 'not-allowed' : 'pointer',
              opacity: (!isGoogleMapsLoaded || markersRef.current.length === 0) ? 0.6 : 1
            }}
          >
            🍽️ Find Restaurants
          </button>
          <button
            onClick={() => searchNearbyPlaces('gas_station')}
            disabled={!isGoogleMapsLoaded || markersRef.current.length === 0}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (!isGoogleMapsLoaded || markersRef.current.length === 0) ? 'not-allowed' : 'pointer',
              opacity: (!isGoogleMapsLoaded || markersRef.current.length === 0) ? 0.6 : 1
            }}
          >
            ⛽ Find Gas Stations
          </button>
        </div>
      </div>

      <div style={{ 
        width: '100%', 
        height: '500px', 
        minHeight: '500px',
        border: '2px solid #ddd',
        borderRadius: '8px',
        position: 'relative',
        overflow: 'hidden',
        display: 'block'
      }}>
        {!isGoogleMapsLoaded && !error && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f5f5f5',
            color: '#666',
            fontSize: '16px',
            zIndex: 1
          }}>
            Loading Map...
          </div>
        )}
        {error && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f5f5f5',
            color: '#dc3545',
            fontSize: '16px',
            zIndex: 1
          }}>
            Failed to load map
          </div>
        )}
        <div
          ref={mapRef}
          style={{
            width: '100%',
            height: '100%',
            minHeight: '500px',
            borderRadius: '6px',
            backgroundColor: '#e5e5e5'
          }}
        />
      </div>
    </div>
  )
}

export default Home
