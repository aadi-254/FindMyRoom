// Property Search Component for findMyRoom application
import React, { useState, useEffect, useRef, useCallback } from 'react'
import PropertyDetailsModal from './PropertyDetailsModal'

const Search = ({ user, selectedArea, accessInfo, restrictedArea, accessibleHouses, onViewHouse }) => {
  const [map, setMap] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [geocoder, setGeocoder] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false)
  const [properties, setProperties] = useState([])
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchFilters, setSearchFilters] = useState({
    room_type: '',
    min_rent: '',
    max_rent: '',
    gender_pref: ''
  })
  const [searchRadius, setSearchRadius] = useState(20) // Default 20km radius
  const [searchLocation, setSearchLocation] = useState(null) // {lat, lng} of searched location
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const searchMarkersRef = useRef([]) // Separate ref for search-related markers
  const infoWindowRef = useRef(null)

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

  // Fetch properties from backend
  const fetchProperties = async (filters = {}) => {
    // If accessibleHouses are provided (from payment), use them directly
    if (accessibleHouses && accessibleHouses.length > 0) {
      console.log('✅ Using accessible houses from payment:', accessibleHouses.length)
      console.log('📋 Accessible houses:', accessibleHouses.map(h => ({ id: h.listing_id, type: h.room_type, rent: h.rent })))
      setProperties(accessibleHouses)
      return accessibleHouses
    } else {
      console.log('⚠️ No accessible houses provided, fetching from API')
      console.log('  - accessibleHouses:', accessibleHouses)
      console.log('  - restrictedArea:', restrictedArea)
    }

    try {
      const queryParams = new URLSearchParams()
      
      // Add area parameter if available (for payment-based filtering)
      if (selectedArea || restrictedArea) {
        queryParams.append('area', selectedArea || restrictedArea)
      }
      
      // Add user_id for payment verification
      if (user && user.user_id) {
        queryParams.append('user_id', user.user_id)
      }
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value.toString().trim()) {
          queryParams.append(key, value.toString().trim())
        }
      })

      console.log('Fetching properties with filters:', filters)
      console.log('Query params:', queryParams.toString())

      const response = await fetch(`http://localhost:5000/api/listings?${queryParams}`)
      const data = await response.json()
      
      if (response.ok) {
        console.log('Properties fetched:', data.length)
        setProperties(data)
        return data
      } else {
        console.error('API error:', data)
        return []
      }
    } catch (error) {
      console.error('Error fetching properties:', error)
      return []
    }
  }

  // Load properties on component mount or when accessibleHouses changes
  useEffect(() => {
    fetchProperties(searchFilters)
  }, [accessibleHouses])

  // Reload properties when selectedArea or restrictedArea changes
  useEffect(() => {
    if (selectedArea || restrictedArea) {
      fetchProperties(searchFilters)
    }
  }, [selectedArea, restrictedArea])

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c // Distance in kilometers
  }

  // Filter properties based on location and radius
  const filterPropertiesByLocation = (allProperties, centerLat, centerLng, radiusKm) => {
    if (!centerLat || !centerLng || !radiusKm) return allProperties

    return allProperties.filter(property => {
      if (!property.latitude || !property.longitude) return false
      
      const distance = calculateDistance(
        centerLat, centerLng,
        parseFloat(property.latitude), parseFloat(property.longitude)
      )
      
      return distance <= radiusKm
    })
  }

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
        center: { lat: 23.0225, lng: 72.5714 }, // Default to Ahmedabad, India
        zoom: 10,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      })

      const geocoderInstance = new window.google.maps.Geocoder()

      setMap(mapInstance)
      setGeocoder(geocoderInstance)
      
      // Clear any previous error since map loaded successfully
      setError('')
      
      // Trigger a resize to ensure map renders properly
      setTimeout(() => {
        if (mapInstance && window.google && window.google.maps && window.google.maps.event) {
          console.log('Triggering map resize...')
          window.google.maps.event.trigger(mapInstance, 'resize')
          mapInstance.setCenter({ lat: 23.0225, lng: 72.5714 })
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

  // Clear existing markers and shapes safely
  const clearMarkers = useCallback(() => {
    try {
      // Clear property markers
      markersRef.current.forEach(item => {
        if (item && item.setMap) {
          item.setMap(null)
        }
      })
      markersRef.current = []
      
      // Clear search markers
      searchMarkersRef.current.forEach(item => {
        if (item && item.setMap) {
          item.setMap(null)
        }
      })
      searchMarkersRef.current = []
      
      // Close any open info windows
      if (infoWindowRef.current) {
        infoWindowRef.current.close()
      }
    } catch (error) {
      console.warn('Error clearing markers:', error)
      markersRef.current = []
      searchMarkersRef.current = []
    }
  }, [])

  // Clear only property markers (keep search location marker and radius circle)
  const clearPropertyMarkers = useCallback(() => {
    try {
      // Clear all markers from markersRef (property markers)
      markersRef.current.forEach(item => {
        if (item && item.setMap) {
          item.setMap(null)
        }
      })
      markersRef.current = []
      
      // Keep search markers intact (they are in searchMarkersRef)
      // Close any open info windows
      if (infoWindowRef.current) {
        infoWindowRef.current.close()
      }
    } catch (error) {
      console.warn('Error clearing property markers:', error)
      markersRef.current = []
    }
  }, [])

  // Display property markers on the map
  const displayPropertyMarkers = useCallback((propertiesToShow) => {
    if (!map || !window.google || !propertiesToShow?.length) return

    clearMarkers()

    // Create info window (reuse single instance)
    if (!infoWindowRef.current) {
      infoWindowRef.current = new window.google.maps.InfoWindow()
    }

    const bounds = new window.google.maps.LatLngBounds()
    
    propertiesToShow.forEach(property => {
      if (!property.latitude || !property.longitude) return

      const position = {
        lat: parseFloat(property.latitude),
        lng: parseFloat(property.longitude)
      }

      const marker = new window.google.maps.Marker({
        position: position,
        map: map,
        title: property.title,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="propertyShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="rgba(0,0,0,0.3)"/>
                </filter>
              </defs>
              <!-- Property marker background -->
              <circle cx="18" cy="18" r="14" fill="#667eea" stroke="#ffffff" stroke-width="2" filter="url(#propertyShadow)"/>
              <!-- House icon -->
              <path d="M18 8 L12 14 L12 24 L24 24 L24 14 Z" fill="white" stroke="#667eea" stroke-width="1"/>
              <rect x="15" y="18" width="6" height="6" fill="#667eea"/>
              <path d="M18 8 L9 17 L27 17 Z" fill="white" stroke="#667eea" stroke-width="1"/>
              <!-- Rent indicator -->
              <text x="18" y="30" text-anchor="middle" fill="#667eea" font-size="8" font-weight="bold">₹${Math.round(property.rent/1000)}K</text>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(36, 36),
          anchor: new window.google.maps.Point(18, 18)
        },
        zIndex: 100
      })

      // Create info window content
      const infoContent = `
        <div style="max-width: 300px; padding: 10px;">
          <h3 style="margin: 0 0 8px 0; color: #333;">${property.title}</h3>
          <p style="margin: 4px 0; font-weight: bold; color: #28a745; font-size: 16px;">
            ₹${parseInt(property.rent).toLocaleString()}/month
          </p>
          <p style="margin: 4px 0;"><strong>Type:</strong> ${property.room_type}</p>
          <p style="margin: 4px 0;"><strong>City:</strong> ${property.city}</p>
          <p style="margin: 4px 0;"><strong>Gender Pref:</strong> ${property.gender_pref}</p>
          <button 
            onclick="window.openPropertyDetails(${property.listing_id})"
            style="
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 4px;
              cursor: pointer;
              margin-top: 8px;
              font-weight: 600;
            "
          >
            View Details
          </button>
        </div>
      `

      marker.addListener('click', () => {
        infoWindowRef.current.setContent(infoContent)
        infoWindowRef.current.open(map, marker)
      })

      markersRef.current.push(marker)
      bounds.extend(position)
    })

    // Fit map to show all markers
    if (propertiesToShow.length > 0) {
      if (propertiesToShow.length === 1) {
        map.setCenter(bounds.getCenter())
        map.setZoom(15)
      } else {
        map.fitBounds(bounds)
        map.panToBounds(bounds)
      }
    }
  }, [map, clearMarkers])

  // Global function to handle property details opening from info window
  useEffect(() => {
    window.openPropertyDetails = (propertyId) => {
      const property = properties.find(p => p.listing_id === propertyId)
      if (property) {
        setSelectedProperty(property)
        setIsModalOpen(true)
        
        // Call onViewHouse callback if provided (for payment tracking)
        if (onViewHouse) {
          onViewHouse(property)
        }
      }
    }

    return () => {
      delete window.openPropertyDetails
    }
  }, [properties, onViewHouse])

  // Update markers when properties change
  useEffect(() => {
    if (map && properties.length > 0) {
      displayPropertyMarkers(properties)
    }
  }, [map, properties, displayPropertyMarkers])

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



  // Search for properties by location using Google Maps geocoding
  const searchProperties = async () => {
    if (!searchInput.trim()) {
      setError('Please enter a location (city, area, or address)')
      return
    }

    if (!isGoogleMapsLoaded || !map || !geocoder) {
      setError('Map is still loading, please wait...')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // First, geocode the search input to get coordinates
      geocoder.geocode({ address: searchInput.trim() }, async (results, status) => {
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location
          const searchLat = location.lat()
          const searchLng = location.lng()
          
          // Store the search location
          setSearchLocation({ lat: searchLat, lng: searchLng })
          
          // Center map on the searched location
          map.setCenter(location)
          map.setZoom(12)
          
          // Clear all markers first
          clearMarkers()
          
          // Clear previous search markers
          searchMarkersRef.current.forEach(item => {
            if (item && item.setMap) {
              item.setMap(null)
            }
          })
          searchMarkersRef.current = []
          
          // Add a distinctive marker for the searched location
          const searchMarker = new window.google.maps.Marker({
            position: location,
            map: map,
            title: `Search Center: ${results[0].formatted_address}`,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                      <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
                    </filter>
                  </defs>
                  <!-- Outer ring -->
                  <circle cx="20" cy="20" r="18" fill="#ff4444" stroke="#ffffff" stroke-width="3" filter="url(#shadow)"/>
                  <!-- Inner circle -->
                  <circle cx="20" cy="20" r="12" fill="#ffffff" stroke="#ff4444" stroke-width="2"/>
                  <!-- Location pin icon -->
                  <path d="M20 8 C16 8 13 11 13 15 C13 20 20 28 20 28 S27 20 27 15 C27 11 24 8 20 8 Z" 
                        fill="#ff4444" stroke="#ffffff" stroke-width="1"/>
                  <circle cx="20" cy="15" r="3" fill="#ffffff"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(40, 40),
              anchor: new window.google.maps.Point(20, 20)
            },
            zIndex: 1000 // Make sure search marker appears on top
          })

          // Add info window for search location
          const searchInfoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 10px; max-width: 250px;">
                <h3 style="margin: 0 0 8px 0; color: #ff4444;">🔍 Search Center</h3>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Location:</strong> ${results[0].formatted_address}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Search Radius:</strong> ${searchRadius} km</p>
                <p style="margin: 4px 0; font-size: 12px; color: #666;">Properties within this radius will be shown</p>
              </div>
            `
          })

          searchMarker.addListener('click', () => {
            if (infoWindowRef.current) {
              infoWindowRef.current.close()
            }
            searchInfoWindow.open(map, searchMarker)
          })

          searchMarkersRef.current.push(searchMarker)

          // Fetch all properties from database
          const allProperties = await fetchProperties(searchFilters)
          
          // Filter properties by distance
          const nearbyProperties = filterPropertiesByLocation(
            allProperties, 
            searchLat, 
            searchLng, 
            searchRadius
          )
          
          if (nearbyProperties.length === 0) {
            const hasFilters = Object.values(searchFilters).some(filter => filter && filter.toString().trim() !== '')
            if (hasFilters) {
              setError(`No properties found matching your filters within ${searchRadius}km of "${searchInput}". Try adjusting your filters or increasing the search radius.`)
            } else {
              setError(`No properties found within ${searchRadius}km of "${searchInput}". Try increasing the search radius.`)
            }
            setProperties([])
          } else {
            setProperties(nearbyProperties)
            setError('')
            
            // Display property markers
            displayPropertyMarkers(nearbyProperties)
            
            // Show a circle to indicate search radius
            const searchCircle = new window.google.maps.Circle({
              strokeColor: '#ff4444',
              strokeOpacity: 0.6,
              strokeWeight: 2,
              strokePattern: [10, 5], // Dashed line
              fillColor: '#ff4444',
              fillOpacity: 0.08,
              map: map,
              center: location,
              radius: searchRadius * 1000, // Convert km to meters
              clickable: false
            })
            searchMarkersRef.current.push(searchCircle) // Store for cleanup

            // Add distance labels at cardinal directions
            const addDistanceLabel = (bearing, label) => {
              const earthRadius = 6371000 // Earth radius in meters
              const distance = searchRadius * 1000 // Convert km to meters
              const lat1 = location.lat() * Math.PI / 180
              const lng1 = location.lng() * Math.PI / 180
              const bearingRad = bearing * Math.PI / 180

              const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distance / earthRadius) +
                                   Math.cos(lat1) * Math.sin(distance / earthRadius) * Math.cos(bearingRad))
              const lng2 = lng1 + Math.atan2(Math.sin(bearingRad) * Math.sin(distance / earthRadius) * Math.cos(lat1),
                                           Math.cos(distance / earthRadius) - Math.sin(lat1) * Math.sin(lat2))

              const labelMarker = new window.google.maps.Marker({
                position: { lat: lat2 * 180 / Math.PI, lng: lng2 * 180 / Math.PI },
                map: map,
                icon: {
                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="60" height="20" viewBox="0 0 60 20" xmlns="http://www.w3.org/2000/svg">
                      <rect x="0" y="0" width="60" height="20" rx="10" fill="rgba(255,68,68,0.8)" stroke="white" stroke-width="1"/>
                      <text x="30" y="14" text-anchor="middle" fill="white" font-size="11" font-weight="bold">${searchRadius}km</text>
                    </svg>
                  `),
                  scaledSize: new window.google.maps.Size(60, 20),
                  anchor: new window.google.maps.Point(30, 10)
                },
                zIndex: 50
              })
              searchMarkersRef.current.push(labelMarker)
            }

            // Add radius labels at north, south, east, west
            addDistanceLabel(0, `${searchRadius}km N`)   // North
            addDistanceLabel(90, `${searchRadius}km E`)  // East
            addDistanceLabel(180, `${searchRadius}km S`) // South
            addDistanceLabel(270, `${searchRadius}km W`) // West
          }
          
          setIsLoading(false)
        } else {
          setError(`Location "${searchInput}" not found. Please try a different search term.`)
          setIsLoading(false)
        }
      })
      
    } catch (error) {
      console.error('Search error:', error)
      setError('Error searching for location')
      setIsLoading(false)
    }
  }

  // Handle filter changes
  const handleFilterChange = async (filterType, value) => {
    const newFilters = { ...searchFilters, [filterType]: value }
    setSearchFilters(newFilters)
    
    // If we have a search location, re-apply location filter with new filters
    if (searchLocation) {
      setIsLoading(true)
      try {
        setError('')
        const allProperties = await fetchProperties(newFilters)
        const nearbyProperties = filterPropertiesByLocation(
          allProperties,
          searchLocation.lat,
          searchLocation.lng,
          searchRadius
        )
        
        if (nearbyProperties.length === 0) {
          setError(`No properties found matching your filters within ${searchRadius}km of "${searchInput}". Try adjusting your filters or increasing the search radius.`)
          setProperties([])
          // Clear property markers but keep search location marker and circle
          clearPropertyMarkers()
        } else {
          setProperties(nearbyProperties)
          setError('')
          displayPropertyMarkers(nearbyProperties)
        }
      } catch (error) {
        console.error('Filter error:', error)
        setError('Error applying filters')
      } finally {
        setIsLoading(false)
      }
    } else {
      // No search location, just fetch all properties with filters
      try {
        setError('')
        await fetchProperties(newFilters)
      } catch (error) {
        console.error('Filter change error:', error)
        setError('Error applying filters')
      }
    }
  }





  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
        Find My Room - Property Search
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
          color: error.includes('No properties found') ? '#d97706' : 'red', 
          background: error.includes('No properties found') ? '#fef3c7' : '#ffebee', 
          padding: '15px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: error.includes('No properties found') ? '1px solid #fbbf24' : '1px solid #f87171'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
            {error.includes('No properties found') ? '🏠 No Properties Found' : '❌ Error'}
          </div>
          {error}
          {error.includes('Failed to load map') && (
            <div style={{ marginTop: '8px', fontSize: '14px' }}>
              Try refreshing the page or check your internet connection.
            </div>
          )}
          {error.includes('No properties found') && (
            <div style={{ marginTop: '10px', fontSize: '14px', fontWeight: 'normal' }}>
              <strong>Suggestions:</strong>
              <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                <li>Try increasing the search radius</li>
                <li>Remove or adjust filters (room type, price range, etc.)</li>
                <li>Search for a nearby area or landmark</li>
              </ul>
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        {/* Location Search */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchProperties()}
            placeholder="Enter location (e.g., Nilkanth Residency Ahmedabad, Bandra Mumbai, Connaught Place Delhi)..."
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
          <select
            value={searchRadius}
            onChange={(e) => setSearchRadius(parseInt(e.target.value))}
            style={{
              padding: '12px',
              fontSize: '16px',
              border: '2px solid #ddd',
              borderRadius: '6px',
              backgroundColor: 'white'
            }}
          >
            <option value={5}>5 km</option>
            <option value={10}>10 km</option>
            <option value={20}>20 km</option>
            <option value={50}>50 km</option>
            <option value={100}>100 km</option>
          </select>
          <button
            onClick={searchProperties}
            disabled={isLoading || !searchInput.trim() || !isGoogleMapsLoaded}
            style={{
              padding: '12px 20px',
              fontSize: '16px',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (isLoading || !isGoogleMapsLoaded) ? 'not-allowed' : 'pointer',
              opacity: (isLoading || !isGoogleMapsLoaded) ? 0.6 : 1
            }}
          >
            {isLoading ? 'Searching...' : '🔍 Search Location'}
          </button>
        </div>

        {/* Search Filters */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '10px',
          marginBottom: '15px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          border: '1px solid #dee2e6'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#495057' }}>
              Room Type:
            </label>
            <select
              value={searchFilters.room_type}
              onChange={(e) => handleFilterChange('room_type', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">All Types</option>
              <option value="1BHK">1BHK</option>
              <option value="2BHK">2BHK</option>
              <option value="PG">PG</option>
              <option value="Shared">Shared</option>
              <option value="Hostel">Hostel</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#495057' }}>
              Min Rent (₹):
            </label>
            <input
              type="number"
              value={searchFilters.min_rent}
              onChange={(e) => handleFilterChange('min_rent', e.target.value)}
              placeholder="0"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#495057' }}>
              Max Rent (₹):
            </label>
            <input
              type="number"
              value={searchFilters.max_rent}
              onChange={(e) => handleFilterChange('max_rent', e.target.value)}
              placeholder="50000"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#495057' }}>
              Gender Preference:
            </label>
            <select
              value={searchFilters.gender_pref}
              onChange={(e) => handleFilterChange('gender_pref', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">Any</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Any">Any</option>
            </select>
          </div>
        </div>

        {/* Results Summary */}
        {properties.length > 0 && searchLocation && (
          <div style={{
            padding: '10px 15px',
            backgroundColor: '#d4edda',
            color: '#155724',
            borderRadius: '4px',
            marginBottom: '15px',
            border: '1px solid #c3e6cb'
          }}>
            Found {properties.length} properties within {searchRadius}km of "{searchInput}"
          </div>
        )}

        {/* Search Location Info */}
        {searchLocation && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: '#e9ecef',
            borderRadius: '4px',
            marginBottom: '15px',
            fontSize: '14px',
            color: '#495057'
          }}>
            🔍 Search center: {searchLocation.lat.toFixed(4)}, {searchLocation.lng.toFixed(4)} 
            | Radius: {searchRadius}km | 
            <button
              onClick={() => {
                setSearchInput('')
                setSearchLocation(null)
                setProperties([])
                clearMarkers()
                fetchProperties()
              }}
              style={{
                marginLeft: '8px',
                padding: '2px 6px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Clear Search
            </button>
          </div>
        )}

        {/* Show current filters */}
        {(searchFilters.city || searchFilters.room_type || searchFilters.min_rent || searchFilters.max_rent || searchFilters.gender_pref) && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: '#e9ecef',
            borderRadius: '4px',
            marginBottom: '15px',
            fontSize: '14px',
            color: '#495057'
          }}>
            Active filters: {' '}
            {searchFilters.city && `City: ${searchFilters.city} `}
            {searchFilters.room_type && `Type: ${searchFilters.room_type} `}
            {searchFilters.min_rent && `Min Rent: ₹${searchFilters.min_rent} `}
            {searchFilters.max_rent && `Max Rent: ₹${searchFilters.max_rent} `}
            {searchFilters.gender_pref && `Gender: ${searchFilters.gender_pref} `}
          </div>
        )}
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

      {/* Property Details Modal */}
      <PropertyDetailsModal
        property={selectedProperty}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedProperty(null)
        }}
        currentUser={user}
      />
    </div>
  )
}

export default Search
