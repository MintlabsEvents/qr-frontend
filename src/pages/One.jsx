import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaCamera, FaBarcode, FaQrcode, FaBars, FaTimes } from 'react-icons/fa';
import { Html5QrcodeScanner } from 'html5-qrcode';
import './One.css';
import { useNavigate } from 'react-router-dom';

const One = () => {
  const [message, setMessage] = useState('Select scan method to start...');
  const [messageType, setMessageType] = useState('info');
  const [user, setUser] = useState(null);
  const [scanMethod, setScanMethod] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanner, setScanner] = useState(null);
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Add processing state
  const navigate = useNavigate();

  // Refs for preventing multiple scans
  const bufferRef = useRef('');
  const lastScanTimeRef = useRef(0);
  const isProcessingRef = useRef(false);

  // Gun Scanner - Listen for barcode scanner input
  useEffect(() => {
    if (scanMethod !== 'gun') return;

    let lastKeyTime = Date.now();
    
    const onKey = (e) => {
      if (isProcessingRef.current) return; // Prevent new scans while processing
      
      const currentTime = Date.now();
      
      // Reset buffer if too much time passed between keystrokes (not from scanner)
      if (currentTime - lastKeyTime > 100) {
        bufferRef.current = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (bufferRef.current.trim()) {
          const scannedData = bufferRef.current.trim();
          bufferRef.current = '';
          processQRCode(scannedData);
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        bufferRef.current += e.key;
      }
    };
    
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [scanMethod]);

  // Initialize HTML5 QR Code Scanner - FIXED VERSION
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
          fps: 5, // Reduced FPS to prevent multiple scans
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
          supportedScanTypes: []
        },
        false
      );

      html5QrcodeScanner.render(
        (decodedText) => {
          // Prevent multiple simultaneous scans
          if (isProcessingRef.current) {
            console.log('Already processing a scan, ignoring...');
            return;
          }

          console.log('QR Code scanned:', decodedText);
          processQRCode(decodedText);
          
          // Pause scanner temporarily to prevent multiple scans
          if (html5QrcodeScanner && html5QrcodeScanner.pause) {
            html5QrcodeScanner.pause();
          }
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

  const showSuccessPopupWithTimer = (userData) => {
    setUser(userData);
    setShowSuccessPopup(true);
    
    // Hide scanner interfaces temporarily
    if (scanMethod === 'camera' && scanner) {
      try {
        scanner.pause();
      } catch (error) {
        console.log('Error pausing scanner:', error);
      }
    }
    
    // Auto-close popup after 5 seconds and resume scanning
    setTimeout(() => {
      setShowSuccessPopup(false);
      setUser(null);
      isProcessingRef.current = false;
      
      // Resume scanning
      if (scanMethod === 'camera' && scanner) {
        try {
          scanner.resume();
        } catch (error) {
          console.log('Error resuming scanner:', error);
        }
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
    isProcessingRef.current = false;
  };

  const startGunScanner = () => {
    setScanMethod('gun');
    setIsScanning(true);
    setMessage('Gun scanner active - Scan QR code');
    bufferRef.current = ''; // Clear buffer when starting
  };

  const stopGunScanner = () => {
    setScanMethod(null);
    setIsScanning(false);
    setMessage('Select scan method to start...');
    setShowSuccessPopup(false);
    setUser(null);
    bufferRef.current = ''; // Clear buffer when stopping
    isProcessingRef.current = false;
  };

  const processQRCode = async (decodedText) => {
    // Prevent multiple simultaneous processing
    if (isProcessingRef.current) {
      console.log('Already processing a scan, ignoring duplicate...');
      return;
    }

    // Debounce - prevent scanning the same code multiple times in quick succession
    const now = Date.now();
    if (now - lastScanTimeRef.current < 2000) { // 2 second debounce
      console.log('Scan too soon after previous scan, ignoring...');
      return;
    }
    lastScanTimeRef.current = now;

    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      setMessage('Processing QR code...');
      setMessageType('info');

      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/mark-attendance`, {
        qrCodeData: decodedText
      });

      if (response.data.success) {
        showSuccessPopupWithTimer(response.data.user);
        showMessage(`Attendance marked for ${response.data.user.name || 'User'}`, 'success');
      } else {
        showMessage(response.data.message, 'error');
        // Reset processing state on error
        isProcessingRef.current = false;
        setIsProcessing(false);
        
        // Resume camera if it's camera scan
        if (scanMethod === 'camera' && scanner) {
          try {
            scanner.resume();
          } catch (error) {
            console.log('Error resuming scanner after error:', error);
          }
        }
      }

    } catch (err) {
      console.error('Error:', err);
      if (err.response?.data?.message) {
        showMessage(err.response.data.message, 'error');
      } else if (err.code === 'NETWORK_ERROR') {
        showMessage('Network error - Please check your connection', 'error');
      } else {
        showMessage('Invalid QR Code or server error', 'error');
      }
      
      // Reset processing state on error
      isProcessingRef.current = false;
      setIsProcessing(false);
      
      // Resume camera if it's camera scan
      if (scanMethod === 'camera' && scanner) {
        try {
          scanner.resume();
        } catch (error) {
          console.log('Error resuming scanner after error:', error);
        }
      }
    }
  };

  // Test with sample QR data
  const testScan = () => {
    if (isProcessingRef.current) {
      console.log('Already processing, please wait...');
      return;
    }
    
    const testQRData = JSON.stringify({
      mongoId: "691176eebf220e2cba034788",
      id: 1,
      timestamp: Date.now()
    });
    processQRCode(testQRData);
  };

  // Manual QR code input for testing
  const manualQRInput = () => {
    if (isProcessingRef.current) {
      alert('Please wait, currently processing a scan...');
      return;
    }
    
    const qrData = prompt('Enter QR code data manually:');
    if (qrData) {
      processQRCode(qrData);
    }
  };

  // Close popup manually
  const closePopup = () => {
    setShowSuccessPopup(false);
    setUser(null);
    isProcessingRef.current = false;
    setIsProcessing(false);
    
    if (scanMethod === 'camera' && scanner) {
      try {
        scanner.resume();
      } catch (error) {
        console.log('Error resuming scanner:', error);
      }
    }
    setMessage(scanMethod === 'camera' ? 'Camera ready - Point at QR code' : 'Gun scanner active - Scan QR code');
  };

  return (
    <div className="one-container">
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
            <a className="sidenav-link" onClick={() => navigate('/gifting')}>
              <i className="fas fa-gift fa-fw me-3"></i><span>Gift Management</span>
            </a>
          </li>
        </ul>
      </nav>

      {/* Header Button */}
      <button className="btn btn-primary menu-toggle" onClick={toggleSideNav}>
        <FaBars />
      </button>

      <div className="one-main">
        <h1 className="page-title">Mark Attendance</h1>
        
        {/* Scan Method Selection */}
        {!scanMethod && !showSuccessPopup && (
          <div className="scan-method-selection">
            <h2>Select Scan Method</h2>
            <div className="method-buttons">
              <button 
                className="method-btn gun-scanner-btn" 
                onClick={startGunScanner}
                disabled={isProcessing}
              >
                <FaBarcode className="method-icon" />
                <span>Gun Scanner</span>
                <small>Hardware barcode scanner</small>
                {isProcessing && <div className="processing-overlay">Processing...</div>}
              </button>
              <button 
                className="method-btn camera-btn" 
                onClick={startCameraScan}
                disabled={isProcessing}
              >
                <FaCamera className="method-icon" />
                <span>Camera Scan</span>
                <small>Device camera</small>
                {isProcessing && <div className="processing-overlay">Processing...</div>}
              </button>
            </div>

            {/* Test Buttons for Development */}
            <div className="test-buttons">
              <button 
                className="test-btn" 
                onClick={testScan}
                disabled={isProcessing}
              >
                <FaQrcode /> {isProcessing ? 'Processing...' : 'Test Scan'}
              </button>
              <button 
                className="test-btn manual-btn" 
                onClick={manualQRInput}
                disabled={isProcessing}
              >
                <FaQrcode /> {isProcessing ? 'Processing...' : 'Manual Input'}
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
                {isProcessing && ' (Processing...)'}
              </h2>
              <button 
                className="stop-scan-btn"
                onClick={scanMethod === 'gun' ? stopGunScanner : stopCameraScan}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Stop Scanning'}
              </button>
            </div>

            {/* Camera View */}
            {scanMethod === 'camera' && (
              <div className="camera-container">
                <div id="qr-reader" className="qr-reader"></div>
                <div className="camera-instructions">
                  {isProcessing && (
                    <div className="processing-message">
                      <p>⏳ Processing scan... Please wait</p>
                    </div>
                  )}
                  <div className="camera-troubleshoot">
                    <button 
                      onClick={manualQRInput} 
                      className="troubleshoot-btn"
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Processing...' : 'Use Manual Input'}
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
                    <div className={`status-light ${isProcessing ? 'processing' : 'active'}`}></div>
                    <span>
                      {isProcessing 
                        ? 'Processing scan... Please wait' 
                        : 'Scanner is active and listening for input...'
                      }
                    </span>
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
            <div className="success-popup">
              <div className="popup-header">
                <h2>✅ Attendance Marked Successfully!</h2>
                <button className="close-popup" onClick={closePopup}>
                  <FaTimes />
                </button>
              </div>
              
              <div className="popup-content">
                <div className="user-avatar">
                  <div className="avatar-placeholder">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
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
                  {user.attendanceTime && (
                    <div className="detail-item">
                      <span className="detail-label">Time:</span>
                      <span className="detail-value">{user.attendanceTime}</span>
                    </div>
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

export default One;