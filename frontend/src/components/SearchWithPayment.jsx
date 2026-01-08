import { useState, useEffect } from 'react';
import Search from './Search';
import PaymentSelection from './PaymentSelection';
import './SearchWithPayment.css';

const SearchWithPayment = ({ user }) => {
    const [hasAccess, setHasAccess] = useState(false);
    const [checkingAccess, setCheckingAccess] = useState(true);
    const [selectedArea, setSelectedArea] = useState('');
    const [accessInfo, setAccessInfo] = useState(null);
    const [showPayment, setShowPayment] = useState(false);

    useEffect(() => {
        checkAccessStatus();
    }, []);

    const checkAccessStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            
            // For now, we'll check if user has any active payment
            // Later this can be modified to check specific area
            const response = await fetch(`http://localhost:5000/api/payments/history?user_id=${user.user_id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            
            if (data.success && data.payments.length > 0) {
                // Check if user has any active payment (houses_viewed < houses_to_view)
                const activePayment = data.payments.find(p => 
                    p.houses_viewed < p.houses_to_view && p.payment_status === 'completed'
                );
                
                if (activePayment) {
                    setHasAccess(true);
                    setSelectedArea(activePayment.area);
                    setAccessInfo({
                        housesToView: activePayment.houses_to_view,
                        housesViewed: activePayment.houses_viewed,
                        remaining: activePayment.houses_to_view - activePayment.houses_viewed,
                        area: activePayment.area
                    });
                } else {
                    setHasAccess(false);
                }
            } else {
                setHasAccess(false);
            }
        } catch (error) {
            console.error('Error checking access:', error);
            setHasAccess(false);
        } finally {
            setCheckingAccess(false);
        }
    };

    const handlePaymentComplete = (area, housesToView) => {
        setSelectedArea(area);
        setAccessInfo({
            housesToView,
            housesViewed: 0,
            remaining: housesToView,
            area
        });
        setHasAccess(true);
        setShowPayment(false);
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
                    <h2>Payment Required to View Listings</h2>
                    <p>To view house details and owner information, you need to purchase viewing access.</p>
                    
                    <div className="access-benefits">
                        <h3>What you'll get:</h3>
                        <ul>
                            <li>✅ Full house details with photos</li>
                            <li>✅ Owner contact information</li>
                            <li>✅ Direct communication ability</li>
                            <li>✅ Area-specific property access</li>
                        </ul>
                    </div>

                    <button className="btn-get-access" onClick={() => setShowPayment(true)}>
                        Get Access Now
                    </button>
                </div>
            </div>
        );
    }

    if (showPayment) {
        return <PaymentSelection onPaymentComplete={handlePaymentComplete} />;
    }

    return (
        <div className="search-with-payment">
            {hasAccess && accessInfo && (
                <div className="access-info-bar">
                    <div className="access-info-content">
                        <span className="access-icon">✅</span>
                        <span className="access-text">
                            <strong>{accessInfo.area}</strong> - {accessInfo.remaining} of {accessInfo.housesToView} houses remaining
                        </span>
                    </div>
                    <button className="btn-buy-more" onClick={handleBuyMore}>
                        Buy More Access
                    </button>
                </div>
            )}
            <Search user={user} selectedArea={selectedArea} accessInfo={accessInfo} />
        </div>
    );
};

export default SearchWithPayment;
