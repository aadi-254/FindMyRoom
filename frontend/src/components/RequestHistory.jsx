import React, { useState, useEffect } from 'react'

const RequestHistory = ({ user }) => {
  const [activeTab, setActiveTab] = useState('sent') // 'sent' or 'received'
  const [sentRequests, setSentRequests] = useState([])
  const [receivedRequests, setReceivedRequests] = useState([])
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all') // 'all', 'pending', 'accepted', 'rejected'

  // Fetch all data on component mount
  useEffect(() => {
    if (user?.user_id) {
      fetchAllData()
    }
  }, [user])

  const fetchAllData = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      await Promise.all([
        fetchSentRequests(),
        fetchReceivedRequests(),
        fetchStats()
      ])
    } catch (error) {
      console.error('Error fetching request data:', error)
      setError('Failed to load request history')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSentRequests = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/requests/sent/${user.user_id}`)
      const data = await response.json()
      if (response.ok) {
        setSentRequests(data)
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      console.error('Error fetching sent requests:', error)
    }
  }

  const fetchReceivedRequests = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/requests/received/${user.user_id}`)
      const data = await response.json()
      if (response.ok) {
        setReceivedRequests(data)
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      console.error('Error fetching received requests:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/requests/stats/${user.user_id}`)
      const data = await response.json()
      if (response.ok) {
        setStats(data)
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/api/requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          user_id: user.user_id
        })
      })

      const data = await response.json()
      if (response.ok) {
        // Refresh data after successful update
        await fetchAllData()
        setError('')
      } else {
        setError(data.message || 'Failed to update request status')
      }
    } catch (error) {
      console.error('Error updating request status:', error)
      setError('Failed to update request status')
    }
  }

  const cancelRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) {
      return
    }

    try {
      const response = await fetch(`http://localhost:5000/api/requests/${requestId}?user_id=${user.user_id}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (response.ok) {
        // Refresh data after successful cancellation
        await fetchAllData()
        setError('')
      } else {
        setError(data.message || 'Failed to cancel request')
      }
    } catch (error) {
      console.error('Error cancelling request:', error)
      setError('Failed to cancel request')
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return '#f59e0b'
      case 'Accepted': return '#10b981'
      case 'Rejected': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending': return '⏳'
      case 'Accepted': return '✅'
      case 'Rejected': return '❌'
      default: return '📋'
    }
  }

  const filterRequests = (requests) => {
    if (filter === 'all') return requests
    return requests.filter(request => 
      request.status.toLowerCase() === filter.toLowerCase()
    )
  }

  if (!user) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Please log in to view your request history.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading request history...</p>
      </div>
    )
  }

  const currentRequests = activeTab === 'sent' ? filterRequests(sentRequests) : filterRequests(receivedRequests)

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
        Request History
      </h1>

      {/* Error Display */}
      {error && (
        <div style={{ 
          color: 'red', 
          background: '#ffebee', 
          padding: '15px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #f87171'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
            ❌ Error
          </div>
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '20px', 
          marginBottom: '30px' 
        }}>
          <div style={{ 
            background: '#f8fafc', 
            padding: '20px', 
            borderRadius: '12px', 
            border: '1px solid #e2e8f0',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#1e40af' }}>📤 Sent Requests</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#374151' }}>{stats.sent.total_sent}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Total</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.sent.pending_sent}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Pending</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{stats.sent.accepted_sent}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Accepted</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{stats.sent.rejected_sent}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Rejected</div>
              </div>
            </div>
          </div>

          <div style={{ 
            background: '#f8fafc', 
            padding: '20px', 
            borderRadius: '12px', 
            border: '1px solid #e2e8f0',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#dc2626' }}>📥 Received Requests</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#374151' }}>{stats.received.total_received}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Total</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.received.pending_received}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Pending</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{stats.received.accepted_received}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Accepted</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{stats.received.rejected_received}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Rejected</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '2px solid #e2e8f0', 
        marginBottom: '20px',
        gap: '20px'
      }}>
        <button
          onClick={() => setActiveTab('sent')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'sent' ? '#3b82f6' : 'transparent',
            color: activeTab === 'sent' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '16px',
            borderBottom: activeTab === 'sent' ? '3px solid #3b82f6' : 'none'
          }}
        >
          📤 Sent Requests ({sentRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('received')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'received' ? '#dc2626' : 'transparent',
            color: activeTab === 'received' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '16px',
            borderBottom: activeTab === 'received' ? '3px solid #dc2626' : 'none'
          }}
        >
          📥 Received Requests ({receivedRequests.length})
        </button>
      </div>

      {/* Filter Controls */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        alignItems: 'center'
      }}>
        <span style={{ fontWeight: 'bold', color: '#374151' }}>Filter by status:</span>
        {['all', 'pending', 'accepted', 'rejected'].map(filterOption => (
          <button
            key={filterOption}
            onClick={() => setFilter(filterOption)}
            style={{
              padding: '8px 16px',
              background: filter === filterOption ? '#6366f1' : '#f3f4f6',
              color: filter === filterOption ? 'white' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              textTransform: 'capitalize',
              fontSize: '14px'
            }}
          >
            {filterOption}
          </button>
        ))}
      </div>

      {/* Request List */}
      {currentRequests.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: '#f9fafb',
          borderRadius: '12px',
          border: '2px dashed #d1d5db'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>📭</div>
          <h3 style={{ color: '#6b7280', margin: '0 0 10px 0' }}>
            No {filter !== 'all' ? filter : ''} {activeTab} requests found
          </h3>
          <p style={{ color: '#9ca3af', margin: 0 }}>
            {activeTab === 'sent' 
              ? "You haven't sent any requests yet. Start browsing properties!"
              : "No one has requested your properties yet. Make sure your listings are attractive!"
            }
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {currentRequests.map((request) => (
            <div
              key={request.request_id}
              style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '15px'
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ 
                    margin: '0 0 8px 0', 
                    color: '#1f2937',
                    fontSize: '18px'
                  }}>
                    🏠 {request.listing_title}
                  </h3>
                  <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>
                    💰 Rent: ₹{request.listing_rent?.toLocaleString()}
                    {request.listing_city && ` • 📍 ${request.listing_city}`}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '14px' }}>
                    {activeTab === 'sent' 
                      ? `📧 To: ${request.receiver_name} (${request.receiver_email})`
                      : `📧 From: ${request.sender_name} (${request.sender_email})`
                    }
                    {activeTab === 'received' && request.sender_phone && (
                      <span> • 📱 {request.sender_phone}</span>
                    )}
                  </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: getStatusColor(request.status),
                    color: 'white',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginBottom: '8px'
                  }}>
                    {getStatusIcon(request.status)} {request.status}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    📅 {formatDate(request.created_at)}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ 
                display: 'flex', 
                gap: '10px', 
                justifyContent: 'flex-end',
                marginTop: '15px',
                paddingTop: '15px',
                borderTop: '1px solid #f3f4f6'
              }}>
                {activeTab === 'received' && request.status === 'Pending' && (
                  <>
                    <button
                      onClick={() => handleStatusUpdate(request.request_id, 'Accepted')}
                      style={{
                        padding: '8px 16px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      ✅ Accept
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(request.request_id, 'Rejected')}
                      style={{
                        padding: '8px 16px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      ❌ Reject
                    </button>
                  </>
                )}
                
                {activeTab === 'sent' && request.status === 'Pending' && (
                  <button
                    onClick={() => cancelRequest(request.request_id)}
                    style={{
                      padding: '8px 16px',
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    🗑️ Cancel Request
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RequestHistory