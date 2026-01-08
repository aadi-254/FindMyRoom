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

const PaymentSelection = ({ onPaymentComplete }) => {
    const [areas, setAreas] = useState([]);
    const [selectedArea, setSelectedArea] = useState('');
    const [availableHouses, setAvailableHouses] = useState(0);
    const [housesToView, setHousesToView] = useState('');
    const [calculatedPrice, setCalculatedPrice] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState(1); // 1: Select Area, 2: Select Location on Map, 3: Select Houses, 4: Payment Gateway
    const [mapPosition, setMapPosition] = useState({ lat: 20.5937, lng: 78.9629 }); // Default center of India

    const PRICING_TABLE = {
        1: 10, 2: 20, 3: 30, 4: 40, 5: 40,
        6: 48, 7: 56, 8: 64, 9: 72, 10: 80,
        15: 120, 20: 160, 25: 200, 30: 240,
        35: 280, 40: 320, 45: 360, 50: 400
    };

    // Fetch available areas
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

    // Fetch available houses count when area is selected
    useEffect(() => {
        if (selectedArea) {
            const fetchHousesCount = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(
                        `http://localhost:5000/api/payments/available-houses?area=${encodeURIComponent(selectedArea)}`,
                        { headers: { 'Authorization': `Bearer ${token}` } }
                    );
                    const data = await response.json();
                    if (data.success) {
                        setAvailableHouses(data.availableHouses);
                    }
                } catch (error) {
                    console.error('Error fetching houses count:', error);
                }
            };
            fetchHousesCount();
        }
    }, [selectedArea]);

    // Calculate price when houses to view changes
    useEffect(() => {
        if (housesToView) {
            const num = parseInt(housesToView);
            if (!isNaN(num) && num > 0) {
                const price = PRICING_TABLE[num] || num * 8;
                setCalculatedPrice(price);
            } else {
                setCalculatedPrice(0);
            }
        }
    }, [housesToView]);

    const handleAreaSelect = () => {
        if (!selectedArea) {
            setError('Please select an area');
            return;
        }
        if (availableHouses === 0) {
            setError('No houses available in this area');
            return;
        }
        setError('');
        setStep(2); // Move to map selection
    };

    const handleLocationSelect = () => {
        setError('');
        setStep(3); // Move to house selection
    };

    const handleProceedToPayment = () => {
        const num = parseInt(housesToView);
        if (!num || num <= 0) {
            setError('Please enter a valid number of houses');
            return;
        }
        if (num > availableHouses) {
            setError(`Only ${availableHouses} houses available in this area`);
            return;
        }
        setError('');
        setStep(4); // Move to payment
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
                    longitude: mapPosition.lng
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

    const popularOptions = [5, 10, 15, 20, 50];

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
                            Continue
                        </button>
                    </div>
                )}

                {/* Step 2: Select Location on Map */}
                {step === 2 && (
                    <div className="payment-step">
                        <button className="btn-back" onClick={() => setStep(1)}>← Back</button>
                        
                        <h2>📍 Select Your Preferred Location</h2>
                        <p className="step-description">
                            Click on the map to select the location where you want to search for houses. 
                            We'll show you the <strong>closest houses</strong> from this point.
                        </p>
                        <p className="area-display">
                            Selected Area: <strong>{selectedArea}</strong>
                        </p>

                        <div className="map-container-payment">
                            <MapContainer 
                                center={[mapPosition.lat, mapPosition.lng]} 
                                zoom={5} 
                                style={{ height: '400px', width: '100%' }}
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

                        {error && <p className="error-message">{error}</p>}

                        <button 
                            onClick={handleLocationSelect}
                            className="btn-primary"
                        >
                            Continue to House Selection
                        </button>
                    </div>
                )}

                {/* Step 3: Select Houses to View */}
                {step === 3 && (
                    <div className="payment-step">
                        <button className="btn-back" onClick={() => setStep(2)}>← Back</button>
                        
                        <h2>📊 Select Number of Houses to View</h2>
                        <p className="step-description">
                            Area: <strong>{selectedArea}</strong> | Available: <strong>{availableHouses} houses</strong>
                        </p>

                        <div className="popular-options">
                            <p className="popular-label">Popular Options:</p>
                            <div className="popular-buttons">
                                {popularOptions.map((num) => (
                                    <button
                                        key={num}
                                        onClick={() => setHousesToView(num.toString())}
                                        className={`popular-btn ${housesToView == num ? 'active' : ''}`}
                                        disabled={num > availableHouses}
                                    >
                                        {num} Houses
                                        <span className="popular-price">₹{PRICING_TABLE[num]}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="custom-input">
                            <label>Or enter custom amount:</label>
                            <input
                                type="number"
                                min="1"
                                max={availableHouses}
                                value={housesToView}
                                onChange={(e) => setHousesToView(e.target.value)}
                                placeholder="Number of houses"
                                className="houses-input"
                            />
                        </div>

                        {housesToView && calculatedPrice > 0 && (
                            <div className="price-summary">
                                <h3>Price Summary</h3>
                                <div className="price-details">
                                    <p>Houses to View: <strong>{housesToView}</strong></p>
                                    <p className="total-price">Total Amount: <strong>₹{calculatedPrice}</strong></p>
                                </div>
                            </div>
                        )}

                        {error && <p className="error-message">{error}</p>}

                        <button 
                            onClick={handleProceedToPayment}
                            className="btn-primary"
                            disabled={!housesToView || calculatedPrice === 0}
                        >
                            Proceed to Payment
                        </button>

                        <div className="pricing-table-info">
                            <details>
                                <summary>View Full Pricing Table</summary>
                                <table className="pricing-table">
                                    <thead>
                                        <tr>
                                            <th>Houses</th>
                                            <th>Price (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(PRICING_TABLE).map(([houses, price]) => (
                                            <tr key={houses}>
                                                <td>{houses}</td>
                                                <td>₹{price}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </details>
                        </div>
                    </div>
                )}

                {/* Step 4: Payment Gateway */}
                {step === 4 && (
                    <div className="payment-step payment-gateway">
                        <button className="btn-back" onClick={() => setStep(3)}>← Back</button>
                        
                        <h2>💳 Payment Gateway</h2>
                        
                        <div className="payment-summary-card">
                            <h3>Order Summary</h3>
                            <div className="summary-details">
                                <p><span>Area:</span> <strong>{selectedArea}</strong></p>
                                <p><span>Houses to View:</span> <strong>{housesToView}</strong></p>
                                <p className="summary-total"><span>Total Amount:</span> <strong>₹{calculatedPrice}</strong></p>
                            </div>
                        </div>

                        <div className="dummy-payment-form">
                            <h3>Card Details (Dummy)</h3>
                            <div className="form-group">
                                <label>Card Number</label>
                                <input type="text" placeholder="1234 5678 9012 3456" className="payment-input" defaultValue="1234 5678 9012 3456" readOnly />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Expiry Date</label>
                                    <input type="text" placeholder="MM/YY" className="payment-input" defaultValue="12/25" readOnly />
                                </div>
                                <div className="form-group">
                                    <label>CVV</label>
                                    <input type="text" placeholder="123" className="payment-input" defaultValue="123" readOnly />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Cardholder Name</label>
                                <input type="text" placeholder="John Doe" className="payment-input" defaultValue="John Doe" readOnly />
                            </div>

                            <div className="payment-note">
                                <p>🔒 This is a dummy payment gateway for demonstration purposes only.</p>
                                <p>No real transaction will be processed.</p>
                            </div>
                        </div>

                        {error && <p className="error-message">{error}</p>}

                        <button 
                            onClick={handlePaymentSuccess}
                            className="btn-pay"
                            disabled={loading}
                        >
                            {loading ? 'Processing...' : `Pay ₹${calculatedPrice}`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentSelection;
