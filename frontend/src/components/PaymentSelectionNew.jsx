import { useState, useEffect } from 'react';
import './PaymentSelection.css';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon issue with Leaflet in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Map Location Selector Component
const LocationSelector = ({ position, setPosition }) => {
  const map = useMapEvents({
    click(e) {
      setPosition({
        lat: e.latlng.lat,
        lng: e.latlng.lng
      });
    }
  });

  return position ? <Marker position={[position.lat, position.lng]} /> : null;
};

const PaymentSelectionNew = ({ onPaymentComplete }) => {
    const [areas, setAreas] = useState([]);
    const [selectedArea, setSelectedArea] = useState('');
    const [availableHouses, setAvailableHouses] = useState(0);
    const [housesToView, setHousesToView] = useState('');
    const [calculatedPrice, setCalculatedPrice] = useState(0);
    const [expiryDays, setExpiryDays] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState(1);
    const [mapPosition, setMapPosition] = useState({ lat: 20.5937, lng: 78.9629 });
    
    // Filter states
    const [propertyType, setPropertyType] = useState('all');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');

    const PRICING_TABLE = {
        1: 10, 2: 20, 3: 30, 4: 40, 5: 40,
        6: 48, 7: 56, 8: 64, 9: 72, 10: 80,
        15: 120, 20: 160, 25: 200, 30: 240,
        35: 280, 40: 320, 45: 360, 50: 400
    };

    // Calculate expiry days
    const calculateExpiryDays = (houses) => {
        return Math.floor((houses / 5) * 4) - 1;
    };

    // Fetch areas
    useEffect(() => {
        const fetchAreas = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('http://localhost:5000/api/payments/areas', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (data.success) {
                    setAreas(data.areas);
                }
            } catch (error) {
                console.error('Error fetching areas:', error);
                setError('Failed to load areas');
            }
        };
        fetchAreas();
    }, []);

    // Fetch houses count with filters
    const fetchHousesCount = async () => {
        if (!selectedArea) return;
        
        try {
            const token = localStorage.getItem('token');
            let url = `http://localhost:5000/api/payments/available-houses?area=${encodeURIComponent(selectedArea)}`;
            
            if (propertyType !== 'all') {
                url += `&propertyType=${encodeURIComponent(propertyType)}`;
            }
            if (minPrice) {
                url += `&minPrice=${minPrice}`;
            }
            if (maxPrice) {
                url += `&maxPrice=${maxPrice}`;
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setAvailableHouses(data.availableHouses);
            }
        } catch (error) {
            console.error('Error fetching houses count:', error);
        }
    };

    // Update houses count when filters change
    useEffect(() => {
        fetchHousesCount();
    }, [selectedArea, propertyType, minPrice, maxPrice]);

    // Calculate price and expiry
    useEffect(() => {
        if (housesToView) {
            const num = parseInt(housesToView);
            if (!isNaN(num) && num > 0) {
                const price = PRICING_TABLE[num] || num * 8;
                const days = calculateExpiryDays(num);
                setCalculatedPrice(price);
                setExpiryDays(days);
            } else {
                setCalculatedPrice(0);
                setExpiryDays(0);
            }
        }
    }, [housesToView]);

    const handleAreaSelect = () => {
        if (!selectedArea) {
            setError('Please select an area');
            return;
        }
        if (availableHouses === 0) {
            setError('No houses available with current filters');
            return;
        }
        setError('');
        setStep(2); // Move to filters
    };

    const handleFiltersApply = () => {
        if (availableHouses === 0) {
            setError('No houses match your filters. Please adjust your criteria.');
            return;
        }
        setError('');
        setStep(3); // Move to location selection
    };

    const handleLocationSelect = () => {
        setError('');
        setStep(4); // Move to house selection
    };

    const handleProceedToPayment = () => {
        const num = parseInt(housesToView);
        if (!num || num <= 0) {
            setError('Please enter a valid number of houses');
            return;
        }
        if (num > availableHouses) {
            setError(`Only ${availableHouses} houses available with your filters`);
            return;
        }
        setError('');
        setStep(5); // Move to payment
    };

    const handlePaymentSuccess = async () => {
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const response = await fetch('http://localhost:5000/api/payments/process-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    area: selectedArea,
                    housesToView: parseInt(housesToView),
                    user_id: user.user_id,
                    latitude: mapPosition.lat,
                    longitude: mapPosition.lng,
                    propertyType: propertyType !== 'all' ? propertyType : null,
                    minPrice: minPrice || null,
                    maxPrice: maxPrice || null
                })
            });

            const data = await response.json();

            if (data.success) {
                onPaymentComplete(selectedArea, parseInt(housesToView));
            } else {
                setError(data.message || 'Payment failed');
            }
        } catch (error) {
            console.error('Error processing payment:', error);
            setError('Payment processing failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const popularOptions = [5, 10, 15, 20];

    return (
        <div className="payment-selection-overlay">
            <div className="payment-selection-container">
                {/* Step 1: Select Area */}
                {step === 1 && (
                    <div className="payment-step">
                        <h2>🏠 Select Your Preferred Area</h2>
                        <p className="step-description">Choose the area where you want to find accommodation</p>

                        <div className="area-selection">
                            <select 
                                value={selectedArea} 
                                onChange={(e) => setSelectedArea(e.target.value)}
                                className="area-select"
                            >
                                <option value="">-- Select Area --</option>
                                {areas.map((area, index) => (
                                    <option key={index} value={area}>{area}</option>
                                ))}
                            </select>
                        </div>

                        {selectedArea && (
                            <div className="houses-info">
                                <p className="houses-count">
                                    📍 <strong>{availableHouses}</strong> houses available in <strong>{selectedArea}</strong>
                                </p>
                            </div>
                        )}

                        {error && <p className="error-message">{error}</p>}

                        <button 
                            onClick={handleAreaSelect}
                            className="btn-primary"
                            disabled={!selectedArea || availableHouses === 0}
                        >
                            Continue to Filters →
                        </button>
                    </div>
                )}

                {/* Step 2: Apply Filters */}
                {step === 2 && (
                    <div className="payment-step">
                        <h2>🔍 Filter Your Preferences</h2>
                        <p className="step-description">Tell us what you're looking for to find the best matches</p>

                        <div className="filters-section">
                            <div className="filter-group">
                                <label>Property Type</label>
                                <select 
                                    value={propertyType} 
                                    onChange={(e) => setPropertyType(e.target.value)}
                                    className="filter-select"
                                >
                                    <option value="all">All Types</option>
                                    <option value="1BHK">1BHK</option>
                                    <option value="2BHK">2BHK</option>
                                    <option value="PG">PG (Paying Guest)</option>
                                    <option value="Shared">Shared Room</option>
                                    <option value="Hostel">Hostel</option>
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Price Range (₹/month)</label>
                                <div className="price-range">
                                    <input 
                                        type="number" 
                                        placeholder="Min Price"
                                        value={minPrice}
                                        onChange={(e) => setMinPrice(e.target.value)}
                                        className="price-input"
                                    />
                                    <span className="price-separator">to</span>
                                    <input 
                                        type="number" 
                                        placeholder="Max Price"
                                        value={maxPrice}
                                        onChange={(e) => setMaxPrice(e.target.value)}
                                        className="price-input"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="filter-results">
                            <p className="houses-count">
                                ✨ <strong>{availableHouses}</strong> houses match your filters in <strong>{selectedArea}</strong>
                            </p>
                        </div>

                        {error && <p className="error-message">{error}</p>}

                        <div className="button-group">
                            <button onClick={() => setStep(1)} className="btn-secondary">
                                ← Back
                            </button>
                            <button 
                                onClick={handleFiltersApply}
                                className="btn-primary"
                                disabled={availableHouses === 0}
                            >
                                Continue to Location →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Select Location on Map */}
                {step === 3 && (
                    <div className="payment-step">
                        <h2>📍 Select Your Location</h2>
                        <p className="step-description">Click on the map to mark your location. We'll show you the closest houses.</p>

                        <div className="map-container">
                            <MapContainer 
                                center={[mapPosition.lat, mapPosition.lng]} 
                                zoom={5} 
                                style={{ height: '400px', width: '100%', borderRadius: '10px' }}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                />
                                <LocationSelector position={mapPosition} setPosition={setMapPosition} />
                            </MapContainer>
                        </div>

                        {mapPosition && (
                            <div className="location-info">
                                <p>📌 Location: {mapPosition.lat.toFixed(4)}, {mapPosition.lng.toFixed(4)}</p>
                            </div>
                        )}

                        {error && <p className="error-message">{error}</p>}

                        <div className="button-group">
                            <button onClick={() => setStep(2)} className="btn-secondary">
                                ← Back
                            </button>
                            <button 
                                onClick={handleLocationSelect}
                                className="btn-primary"
                            >
                                Continue to Plan Selection →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Select Number of Houses */}
                {step === 4 && (
                    <div className="payment-step">
                        <h2>💰 Choose Your Plan</h2>
                        <p className="step-description">
                            Select how many closest houses you want to view. 
                            Plan duration increases with more houses!
                        </p>

                        <div className="popular-options">
                            <p>Popular Plans:</p>
                            <div className="options-grid">
                                {popularOptions.map(option => {
                                    const days = calculateExpiryDays(option);
                                    const price = PRICING_TABLE[option] || option * 8;
                                    return (
                                        <button
                                            key={option}
                                            onClick={() => setHousesToView(option.toString())}
                                            className={`option-card ${housesToView == option ? 'selected' : ''}`}
                                        >
                                            <div className="option-houses">{option} Houses</div>
                                            <div className="option-days">⏱️ {days} days</div>
                                            <div className="option-price">₹{price}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="custom-input">
                            <p>Or enter custom amount:</p>
                            <input
                                type="number"
                                value={housesToView}
                                onChange={(e) => setHousesToView(e.target.value)}
                                placeholder="Enter number of houses"
                                min="1"
                                max={availableHouses}
                                className="houses-input"
                            />
                            {housesToView && (
                                <div className="plan-summary">
                                    <p>✓ Access to <strong>{housesToView}</strong> closest houses</p>
                                    <p>✓ Valid for <strong>{expiryDays}</strong> days</p>
                                    <p>✓ Total: <strong>₹{calculatedPrice}</strong></p>
                                </div>
                            )}
                        </div>

                        {error && <p className="error-message">{error}</p>}

                        <div className="button-group">
                            <button onClick={() => setStep(3)} className="btn-secondary">
                                ← Back
                            </button>
                            <button 
                                onClick={handleProceedToPayment}
                                className="btn-primary"
                                disabled={!housesToView || parseInt(housesToView) <= 0}
                            >
                                Proceed to Payment →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 5: Payment Gateway */}
                {step === 5 && (
                    <div className="payment-step">
                        <h2>💳 Complete Payment</h2>
                        <div className="payment-summary">
                            <div className="summary-item">
                                <span>📍 Area:</span>
                                <strong>{selectedArea}</strong>
                            </div>
                            <div className="summary-item">
                                <span>🏠 Houses:</span>
                                <strong>{housesToView} closest houses</strong>
                            </div>
                            <div className="summary-item">
                                <span>⏱️ Duration:</span>
                                <strong>{expiryDays} days</strong>
                            </div>
                            {propertyType !== 'all' && (
                                <div className="summary-item">
                                    <span>🏘️ Type:</span>
                                    <strong>{propertyType}</strong>
                                </div>
                            )}
                            {(minPrice || maxPrice) && (
                                <div className="summary-item">
                                    <span>💵 Price Range:</span>
                                    <strong>₹{minPrice || '0'} - ₹{maxPrice || '∞'}</strong>
                                </div>
                            )}
                            <div className="summary-total">
                                <span>Total Amount:</span>
                                <strong>₹{calculatedPrice}</strong>
                            </div>
                        </div>

                        <div className="dummy-payment-info">
                            <p>🔒 This is a dummy payment gateway for testing</p>
                            <p>No real transaction will be processed</p>
                        </div>

                        {error && <p className="error-message">{error}</p>}

                        <div className="button-group">
                            <button onClick={() => setStep(4)} className="btn-secondary" disabled={loading}>
                                ← Back
                            </button>
                            <button 
                                onClick={handlePaymentSuccess}
                                className="btn-primary btn-pay"
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : `Pay ₹${calculatedPrice}`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentSelectionNew;
