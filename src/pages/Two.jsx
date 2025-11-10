import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaCamera, FaBarcode, FaQrcode, FaBars, FaTimes, FaGift } from 'react-icons/fa';
import { Html5QrcodeScanner } from 'html5-qrcode';
import './Two.css';
import { useNavigate } from 'react-router-dom';

const Two = () => {
  const [message, setMessage] = useState('Select scan method to start...');
  const [messageType, setMessageType] = useState('info');
  const [user, setUser] = useState(null);
  const [scanMethod, setScanMethod] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanner, setScanner] = useState(null);
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const navigate = useNavigate();

  // Gun Scanner - Listen for barcode scanner input
  useEffect(() => {
    if (scanMethod !== 'gun') return;

    let buffer = '';
    let lastKeyTime = Date.now();
    
    const onKey = (e) => {
      const currentTime = Date.now();
      
      // Reset buffer if too much time passed between keystrokes (not from scanner)
      if (currentTime - lastKeyTime > 100) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.trim()) {
          processQRCode(buffer.trim());
        }
        buffer = '';
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        buffer += e.key;
      }
    };
    
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [scanMethod]);

  // Initialize HTML5 QR Code Scanner
  const initializeCameraScanner = () => {
    try {
      // Clear any existing scanner
      if (scanner) {
        scanner.clear().catch(error => {
          console.log("Scanner clear error:", error);
        });
      }

      const html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
          supportedScanTypes: []
        },
        false
      );

      html5QrcodeScanner.render(
        (decodedText) => {
          console.log('QR Code scanned:', decodedText);
          processQRCode(decodedText);
        },
        (errorMessage) => {
          console.log('QR Scan error:', errorMessage);
        }
      );

      setScanner(html5QrcodeScanner);
      setMessage('Camera ready - Point at QR code');
      
    } catch (error) {
      console.error('Scanner initialization error:', error);
      setMessage('Failed to initialize camera scanner', 'error');
      stopCameraScan();
    }
  };

  const toggleSideNav = () => {
    setIsSideNavOpen(!isSideNavOpen);
  };

  // Cleanup scanner
  useEffect(() => {
    return () => {
      if (scanner) {
        scanner.clear().catch(error => {
          console.log("Scanner cleanup error:", error);
        });
      }
    };
  }, [scanner]);

  const showMessage = (text, type = 'info') => {
    setMessage(text);
    setMessageType(type);
  };

  const showSuccessPopupWithTimer = (userData, type = 'success') => {
    setUser({...userData, popupType: type});
    setShowSuccessPopup(true);
    
    // Hide scanner interfaces temporarily
    if (scanMethod === 'camera' && scanner) {
      scanner.pause();
    }
    
    // Auto-close popup after 5 seconds and resume scanning
    setTimeout(() => {
      setShowSuccessPopup(false);
      setUser(null);
      
      // Resume scanning
      if (scanMethod === 'camera' && scanner) {
        scanner.resume();
      }
      
      setMessage(scanMethod === 'camera' ? 'Camera ready - Point at QR code' : 'Gun scanner active - Scan QR code');
      setMessageType('info');
    }, 5000);
  };

  const startCameraScan = async () => {
    try {
      setScanMethod('camera');
      setIsScanning(true);
      setMessage('Initializing camera scanner...');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }

      await navigator.mediaDevices.getUserMedia({ video: true });

      setTimeout(() => {
        initializeCameraScanner();
      }, 500);

    } catch (error) {
      console.error('Camera error:', error);
      setMessage(`Camera error: ${error.message}`, 'error');
      setIsScanning(false);
      setScanMethod(null);
    }
  };

  const stopCameraScan = () => {
    if (scanner) {
      scanner.clear().catch(error => {
        console.log("Scanner stop error:", error);
      });
      setScanner(null);
    }
    setIsScanning(false);
    setScanMethod(null);
    setMessage('Select scan method to start...');
    setShowSuccessPopup(false);
    setUser(null);
  };

  const startGunScanner = () => {
    setScanMethod('gun');
    setIsScanning(true);
    setMessage('Gun scanner active - Scan QR code');
  };

  const stopGunScanner = () => {
    setScanMethod(null);
    setIsScanning(false);
    setMessage('Select scan method to start...');
    setShowSuccessPopup(false);
    setUser(null);
  };

  const processQRCode = async (decodedText) => {
    try {
      setMessage('Processing QR code...');
      setMessageType('info');

      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/mark-gift`, {
        qrCodeData: decodedText
      });

      if (response.data.success) {
        showSuccessPopupWithTimer(response.data.user, 'success');
        showMessage(`Gift marked for ${response.data.user.name || 'User'}`, 'success');
      } else {
        // If gift already given, show already received popup
        if (response.data.message?.includes('already given')) {
          showSuccessPopupWithTimer(response.data.user, 'already');
          showMessage(response.data.message, 'error');
        } else {
          showMessage(response.data.message, 'error');
        }
      }

    } catch (err) {
      console.error('Error:', err);
      if (err.response?.data?.message) {
        if (err.response.data.message.includes('already given')) {
          // Extract user info from error response if available
          const userData = err.response.data.user || { name: 'User' };
          showSuccessPopupWithTimer(userData, 'already');
        } else {
          showMessage(err.response.data.message, 'error');
        }
      } else if (err.code === 'NETWORK_ERROR') {
        showMessage('Network error - Please check your connection', 'error');
      } else {
        showMessage('Invalid QR Code or server error', 'error');
      }
    }
  };

  // Test with sample QR data
  const testScan = () => {
    const testQRData = JSON.stringify({
      mongoId: "691176eebf220e2cba034788",
      id: 1,
      timestamp: Date.now()
    });
    processQRCode(testQRData);
  };

  // Manual QR code input for testing
  const manualQRInput = () => {
    const qrData = prompt('Enter QR code data manually:');
    if (qrData) {
      processQRCode(qrData);
    }
  };

  // Close popup manually
  const closePopup = () => {
    setShowSuccessPopup(false);
    setUser(null);
    if (scanMethod === 'camera' && scanner) {
      scanner.resume();
    }
    setMessage(scanMethod === 'camera' ? 'Camera ready - Point at QR code' : 'Gun scanner active - Scan QR code');
  };

  return (
    <div className="two-container">
      {/* Side Navigation */}
      <nav id="sidenav-1" className={`sidenav ${isSideNavOpen ? 'open' : ''}`}>
        <div className="sidenav-header">
          <button className="close-sidenav" onClick={toggleSideNav}>
            <FaTimes />
          </button>
        </div>
        <ul className="sidenav-menu">
          <li className="sidenav-item">
            <a className="sidenav-link" onClick={() => navigate('/')}>
              <i className="fas fa-home fa-fw me-3"></i><span>Home</span>
            </a>
          </li>
          <li className="sidenav-item">
            <a className="sidenav-link" onClick={() => navigate('/attendance')}>
              <i className="fas fa-calendar-day fa-fw me-3"></i><span>Mark Attendance</span>
            </a>
          </li>
        </ul>
      </nav>

      {/* Header Button */}
      <button className="btn btn-primary menu-toggle" onClick={toggleSideNav}>
        <FaBars />
      </button>

      <div className="two-main">
        <h1 className="page-title">🎁 Gift Management</h1>
        
        {/* Scan Method Selection */}
        {!scanMethod && !showSuccessPopup && (
          <div className="scan-method-selection">
            <h2>Select Scan Method</h2>
            <div className="method-buttons">
              <button className="method-btn gun-scanner-btn" onClick={startGunScanner}>
                <FaBarcode className="method-icon" />
                <span>Gun Scanner</span>
                <small>Hardware barcode scanner</small>
              </button>
              <button className="method-btn camera-btn" onClick={startCameraScan}>
                <FaCamera className="method-icon" />
                <span>Camera Scan</span>
                <small>Device camera</small>
              </button>
            </div>

            {/* Test Buttons for Development */}
            <div className="test-buttons">
              <button className="test-btn" onClick={testScan}>
                <FaQrcode /> Test Scan
              </button>
              <button className="test-btn manual-btn" onClick={manualQRInput}>
                <FaQrcode /> Manual Input
              </button>
            </div>
          </div>
        )}

        {/* Active Scanning Interface - Hidden when popup is shown */}
        {scanMethod && !showSuccessPopup && (
          <div className="active-scanning">
            <div className="scanning-header">
              <h2>
                {scanMethod === 'gun' ? '🔫 Gun Scanner Active' : '📷 Camera Scanner Active'}
              </h2>
              <button 
                className="stop-scan-btn"
                onClick={scanMethod === 'gun' ? stopGunScanner : stopCameraScan}
              >
                Stop Scanning
              </button>
            </div>

            {/* Camera View */}
            {scanMethod === 'camera' && (
              <div className="camera-container">
                <div id="qr-reader" className="qr-reader"></div>
                <div className="camera-instructions">
                  <div className="camera-troubleshoot">
                    <button onClick={manualQRInput} className="troubleshoot-btn">
                      Use Manual Input
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Gun Scanner Instructions */}
            {scanMethod === 'gun' && (
              <div className="gun-scanner-instructions">
                <div className="instruction-box">
                  <div className="scanner-status-indicator">
                    <div className="status-light active"></div>
                    <span>Scanner is active and listening for input...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status Message */}
        {!showSuccessPopup && (
          <div className={`scanner-status ${messageType}`}>
            <div className="status-content">
              <div className={`status-icon ${messageType}`}>
                {messageType === 'success' && '✅'}
                {messageType === 'error' && '❌'}
                {messageType === 'info' && 'ℹ️'}
              </div>
              <p className="scanner-status-text">{message}</p>
            </div>
          </div>
        )}

        {/* Success Popup - Centered Modal */}
        {showSuccessPopup && user && (
          <div className="success-popup-overlay">
            <div className={`success-popup ${user.popupType === 'already' ? 'already-popup' : ''}`}>
              <div className="popup-header">
                <h2>
                  {user.popupType === 'already' ? '⚠️ Gift Already Received' : '🎉 Gift Marked Successfully!'}
                </h2>
                <button className="close-popup" onClick={closePopup}>
                  <FaTimes />
                </button>
              </div>
              
              <div className="popup-content">
                <div className="user-avatar">
                  <div className={`avatar-placeholder ${user.popupType === 'already' ? 'already-avatar' : ''}`}>
                    {user.popupType === 'already' ? '⚠️' : (user.name ? user.name.charAt(0).toUpperCase() : 'U')}
                  </div>
                </div>
                
                <div className="user-details-popup">
                  <div className="detail-item">
                    <span className="detail-label">ID:</span>
                    <span className="detail-value">{user.id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Name:</span>
                    <span className="detail-value">{user.name || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Organization:</span>
                    <span className="detail-value">{user.organization || 'N/A'}</span>
                  </div>
                  {user.giftGivenTime && (
                    <div className="detail-item">
                      <span className="detail-label">
                        {user.popupType === 'already' ? 'Received Time:' : 'Gift Given Time:'}
                      </span>
                      <span className="detail-value">{user.giftGivenTime}</span>
                    </div>
                  )}
                </div>

                <div className="popup-message">
                  {user.popupType === 'already' ? (
                    <p className="already-message">This user has already received their gift.</p>
                  ) : (
                    <p className="success-message">Gift has been successfully recorded!</p>
                  )}
                </div>

                <div className="popup-timer">
                  <div className="timer-bar">
                    <div className="timer-progress"></div>
                  </div>
                  <p>Continuing scanning in 5 seconds...</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Two;