import { useState, useEffect } from 'react';
import Search from './Search';
import PaymentSelectionNew from './PaymentSelectionNew';
import './SearchWithPayment.css';

const SearchWithPaymentNew = ({ user }) => {
    const [hasAccess, setHasAccess] = useState(false);
    const [checkingAccess, setCheckingAccess] = useState(true);
    const [selectedArea, setSelectedArea] = useState('');
    const [accessInfo, setAccessInfo] = useState(null);
    const [showPayment, setShowPayment] = useState(false);
    const [accessibleHouses, setAccessibleHouses] = useState([]);

    useEffect(() => {
        checkAccessStatus();
    }, []);

    const checkAccessStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            
            console.log('🔍 Checking access status for user:', user.user_id);
            
            if (!user.user_id) {
                console.log('❌ No user ID found');
                setHasAccess(false);
                setCheckingAccess(false);
                return;
            }

            // Check payment history for active plans
            const response = await fetch(`http://localhost:5000/api/payments/history?user_id=${user.user_id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            console.log('📊 Payment history:', data);
            
            if (data.success && data.payments.length > 0) {
                // Find the most recent active payment (check both status fields)
                const activePayment = data.payments.find(p => {
                    // Check if payment is completed and either marked as active or has valid expiry
                    if (p.payment_status !== 'completed') return false;
                    
                    // Check if plan is active or has status 'active'
                    if (p.plan_active === false) return false;
                    
                    // Check expiry date if available
                    if (p.plan_expires_at) {
                        const expiryDate = new Date(p.plan_expires_at);
                        if (expiryDate <= new Date()) return false;
                    }
                    
                    return true;
                });
                
                if (activePayment) {
                    console.log('✅ Found active payment:', activePayment);
                    setHasAccess(true);
                    setSelectedArea(activePayment.area);
                    
                    const expiryDate = activePayment.plan_expires_at ? new Date(activePayment.plan_expires_at) : null;
                    const daysRemaining = expiryDate ? Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24)) : 999;
                    
                    setAccessInfo({
                        paymentId: activePayment.payment_id,
                        housesToView: activePayment.houses_to_view,
                        housesViewed: activePayment.houses_viewed || 0,
                        remaining: activePayment.houses_to_view - (activePayment.houses_viewed || 0),
                        area: activePayment.area,
                        expiresAt: activePayment.plan_expires_at,
                        daysRemaining: daysRemaining
                    });

                    // Fetch accessible houses
                    await fetchAccessibleHouses(activePayment.area, user.user_id);
                } else {
                    console.log('❌ No active payment found');
                    setHasAccess(false);
                }
            } else {
                console.log('❌ No payments in history');
                setHasAccess(false);
            }
        } catch (error) {
            console.error('Error checking access:', error);
            setHasAccess(false);
        } finally {
            setCheckingAccess(false);
        }
    };

    const fetchAccessibleHouses = async (area, userId) => {
        try {
            const token = localStorage.getItem('token');
            const url = `http://localhost:5000/api/payments/accessible-houses?area=${encodeURIComponent(area)}&user_id=${userId}`;
            console.log('🏠 Fetching accessible houses from:', url);
            
            const response = await fetch(url, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });

            const data = await response.json();
            console.log('🏠 Accessible houses response:', data);
            
            if (data.success && data.houses) {
                console.log('✅ Setting accessible houses:', data.houses.length);
                setAccessibleHouses(data.houses);
            } else {
                console.log('❌ No accessible houses found:', data.message);
                setAccessibleHouses([]);
            }
        } catch (error) {
            console.error('❌ Error fetching accessible houses:', error);
            setAccessibleHouses([]);
        }
    };

    const handlePaymentComplete = async (area, housesToView) => {
        console.log('💳 Payment completed! Refreshing access status...');
        setSelectedArea(area);
        setShowPayment(false);
        setCheckingAccess(true);
        
        // Wait a bit for backend to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Refresh access status
        await checkAccessStatus();
        
        console.log('✅ Access status refreshed');
    };

    const handleBuyMore = () => {
        setShowPayment(true);
    };

    if (checkingAccess) {
        return (
            <div className="search-loading">
                <div className="loading-spinner"></div>
                <p>Checking access...</p>
            </div>
        );
    }

    if (!hasAccess && !showPayment) {
        return (
            <div className="no-access-container">
                <div className="no-access-content">
                    <div className="no-access-icon">🔒</div>
                    <h2>Get Access to View House Details</h2>
                    <p>Choose a plan to view detailed property information and owner contacts.</p>
                    
                    <div className="access-benefits">
                        <h3>What you'll get:</h3>
                        <ul>
                            <li>✅ Access to N closest houses based on your preferences</li>
                            <li>✅ Filters before payment (property type, price range)</li>
                            <li>✅ Full house details with photos</li>
                            <li>✅ Owner contact information</li>
                            <li>✅ Time-limited plan (more houses = more days)</li>
                        </ul>
                    </div>

                    <div className="plan-examples">
                        <h3>Plan Examples:</h3>
                        <div className="example-grid">
                            <div className="example-card">
                                <div className="example-houses">5 Houses</div>
                                <div className="example-duration">3 Days</div>
                                <div className="example-price">₹40</div>
                            </div>
                            <div className="example-card">
                                <div className="example-houses">10 Houses</div>
                                <div className="example-duration">7 Days</div>
                                <div className="example-price">₹80</div>
                            </div>
                            <div className="example-card">
                                <div className="example-houses">15 Houses</div>
                                <div className="example-duration">11 Days</div>
                                <div className="example-price">₹120</div>
                            </div>
                            <div className="example-card">
                                <div className="example-houses">20 Houses</div>
                                <div className="example-duration">17 Days</div>
                                <div className="example-price">₹160</div>
                            </div>
                        </div>
                    </div>

                    <button onClick={handleBuyMore} className="btn-get-access">
                        Get Access Now 🚀
                    </button>
                </div>
            </div>
        );
    }

    if (showPayment) {
        return <PaymentSelectionNew onPaymentComplete={handlePaymentComplete} />;
    }

    return (
        <div className="search-with-access">
            {accessInfo && (
                <div className="access-banner">
                    <div className="access-info-left">
                        <div className="access-item">
                            <span className="access-label">📍 Area:</span>
                            <span className="access-value">{accessInfo.area}</span>
                        </div>
                        <div className="access-item">
                            <span className="access-label">🏠 Access:</span>
                            <span className="access-value">
                                {accessInfo.housesToView} houses ({accessInfo.housesViewed} viewed)
                            </span>
                        </div>
                        <div className="access-item">
                            <span className="access-label">⏱️ Valid for:</span>
                            <span className={`access-value ${accessInfo.daysRemaining <= 1 ? 'expiring-soon' : ''}`}>
                                {accessInfo.daysRemaining} days
                            </span>
                        </div>
                    </div>
                    <button onClick={handleBuyMore} className="btn-buy-more">
                        Buy New Plan 🛒
                    </button>
                </div>
            )}
            
            {accessInfo?.daysRemaining <= 1 && (
                <div className="expiry-warning">
                    ⚠️ Your plan expires soon! Purchase a new plan to continue viewing houses.
                </div>
            )}
            
            <Search 
                user={user} 
                restrictedArea={selectedArea}
                accessibleHouses={accessibleHouses}
                onViewHouse={() => {
                    // Refresh access info when a house is viewed
                    checkAccessStatus();
                }}
            />
        </div>
    );
};

export default SearchWithPaymentNew;
