import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaCamera, FaBarcode, FaQrcode, FaBars, FaTimes } from 'react-icons/fa';
import { Html5QrcodeScanner } from 'html5-qrcode';
import './One.css';
import { useNavigate } from 'react-router-dom';
import Logo from '../assets/black.png'

const One = () => {
  const [message, setMessage] = useState('Select scan method to start...');
  const [messageType, setMessageType] = useState('info');
  const [user, setUser] = useState(null);
  const [scanMethod, setScanMethod] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanner, setScanner] = useState(null);
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [attendanceStatus, setAttendanceStatus] = useState(null); // 'not_marked', 'already_marked'
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
      if (isProcessingRef.current) return;
      
      const currentTime = Date.now();
      
      if (currentTime - lastKeyTime > 100) {
        bufferRef.current = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (bufferRef.current.trim()) {
          const scannedData = bufferRef.current.trim();
          bufferRef.current = '';
          handleQRCodeScan(scannedData);
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        bufferRef.current += e.key;
      }
    };
    
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [scanMethod]);

  // Initialize HTML5 QR Code Scanner
  const initializeCameraScanner = () => {
    try {
      if (scanner) {
        scanner.clear().catch(error => {
          console.log("Scanner clear error:", error);
        });
      }

      const html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 5,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
          supportedScanTypes: []
        },
        false
      );

      html5QrcodeScanner.render(
        (decodedText) => {
          if (isProcessingRef.current) {
            console.log('Already processing a scan, ignoring...');
            return;
          }

          console.log('QR Code scanned:', decodedText);
          handleQRCodeScan(decodedText);
          
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

  // Reset to main page state
  const resetToMainPage = () => {
    // Clear scanner
    if (scanner) {
      scanner.clear().catch(error => {
        console.log("Scanner clear error:", error);
      });
      setScanner(null);
    }
    
    // Reset all states
    setIsScanning(false);
    setScanMethod(null);
    setShowPopup(false);
    setUser(null);
    setScannedData(null);
    setIsProcessing(false);
    setAttendanceStatus(null);
    isProcessingRef.current = false;
    bufferRef.current = '';
    
    // Reset message to initial state
    setMessage('Select scan method to start...');
    setMessageType('info');
  };

  // Handle QR code scan - Check attendance status first
  const handleQRCodeScan = async (decodedText) => {
    if (isProcessingRef.current) {
      console.log('Already processing a scan, ignoring duplicate...');
      return;
    }

    const now = Date.now();
    if (now - lastScanTimeRef.current < 2000) {
      console.log('Scan too soon after previous scan, ignoring...');
      return;
    }
    lastScanTimeRef.current = now;

    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      setMessage('Processing QR code...');
      setMessageType('info');

      // Store the scanned data for later submission
      setScannedData(decodedText);
      
      // Parse QR code data to get mongoId
      let qrData;
      try {
        qrData = JSON.parse(decodedText);
      } catch (e) {
        // If QR code is not JSON, create basic user object
        qrData = {
          id: decodedText,
          name: 'User from QR Code',
          organization: 'Unknown Organization'
        };
      }

      // First, check if user exists and get their attendance status
      let userResponse;
      if (qrData.mongoId) {
        userResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/user/${qrData.mongoId}`);
      } else {
        // Fallback: try to mark attendance directly which will check status
        userResponse = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/mark-attendance`, {
          qrCodeData: decodedText
        });
      }

      const userData = userResponse.data;
      
      // Determine attendance status
      if (userData.alreadyMarked || userData.Attendance === 'Present') {
        setAttendanceStatus('already_marked');
        setUser({
          id: userData.id || qrData.id,
          name: userData.name || qrData.name,
          organization: userData.organization || qrData.organization,
          attendanceTime: userData.attendanceTime || userData.AttendanceTime,
          totalRegistrations: userData.totalRegistrations || (userData.attendanceHistory ? userData.attendanceHistory.length : 1)
        });
      } else {
        setAttendanceStatus('not_marked');
        setUser({
          id: userData.id || qrData.id,
          name: userData.name || qrData.name,
          organization: userData.organization || qrData.organization,
          isNewScan: true
        });
      }

      setShowPopup(true);
      
      // Stop camera scanning
      if (scanMethod === 'camera') {
        if (scanner) {
          scanner.clear().catch(error => {
            console.log("Scanner clear error:", error);
          });
          setScanner(null);
        }
      }
      
      setMessage('Please check attendance status in the popup', 'info');

    } catch (err) {
      console.error('Error processing QR code:', err);
      if (err.response?.data?.message) {
        showMessage(err.response.data.message, 'error');
      } else {
        showMessage('Error processing QR code', 'error');
      }
    } finally {
      // Reset processing state
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

// Mark attendance when user clicks submit
const markAttendance = async () => {
  if (!scannedData) return;

  setIsProcessing(true);
  isProcessingRef.current = true;

  try {
    setMessage('Marking attendance...');
    
    const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/mark-attendance`, {
      qrCodeData: scannedData
    });

    if (response.data.success) {
      // Show success message with registration count
      const successMessage = response.data.user.totalRegistrations 
        ? `Attendance marked successfully! (Registration #${response.data.user.totalRegistrations})`
        : 'Attendance marked successfully!';
      
      showMessage(successMessage, 'success');
      
      // Update popup with success state
      setUser(prevUser => ({
        ...prevUser,
        ...response.data.user,
        success: true,
        registrationCount: response.data.user.totalRegistrations || 1
      }));
      setAttendanceStatus('marked');
      
      // Auto-close popup after 2 seconds
      setTimeout(() => {
        resetToMainPage();
      }, 2000);

    } else if (response.data.alreadyMarked) {
      // If already marked, show message and auto-close
      showMessage('Attendance already marked for today', 'info');
      
      // Update the popup
      setUser(prevUser => ({
        ...prevUser,
        ...response.data.user
      }));
      
      // Auto-close popup after 2 seconds
      setTimeout(() => {
        resetToMainPage();
      }, 2000);
      
    } else {
      showMessage(response.data.message, 'error');
    }

  } catch (err) {
    console.error('Error marking attendance:', err);
    if (err.response?.data?.message) {
      showMessage(err.response.data.message, 'error');
    } else {
      showMessage('Error marking attendance', 'error');
    }
  } finally {
    isProcessingRef.current = false;
    setIsProcessing(false);
  }
};

  // Close popup without marking attendance
  const closePopup = () => {
    resetToMainPage();
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
    resetToMainPage();
  };

  const startGunScanner = () => {
    setScanMethod('gun');
    setIsScanning(true);
    setMessage('Gun scanner active - Scan QR code');
    bufferRef.current = '';
  };

  const stopGunScanner = () => {
    resetToMainPage();
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
        </ul>
      </nav>

      {/* Header Button */}
      <button className="btn btn-primary menu-toggle" onClick={toggleSideNav}>
        <FaBars />
      </button>



      <div className="one-main">
          <img src={Logo} alt="Logo" className="headers-logo" />
        <h1 className="page-title">Mark Attendance</h1>
        
        {/* Scan Method Selection - MAIN PAGE */}
        {!scanMethod && !showPopup && (
          <div className="scan-method-selection">
            <h2>Select Scan Method</h2>
            <div className="method-buttons">
              <button 
                className="method-btn camera-btn" 
                onClick={startCameraScan}
                disabled={isProcessing}
              >
                <FaCamera className="method-icon" />
                <span>Camera Scan</span>
                <small>Click to open camera and scan QR code</small>
              </button>
            </div>
          </div>
        )}

        {/* Active Scanning Interface - Hidden when popup is shown */}
        {scanMethod && !showPopup && (
          <div className="active-scanning">
            <div className="scanning-header">
              <h2>
                {scanMethod === 'gun' ? '🔫 Gun Scanner Active' : '📷 Camera Scanner Active'}
              </h2>
              <button 
                className="stop-scan-btn"
                onClick={scanMethod === 'gun' ? stopGunScanner : stopCameraScan}
                disabled={isProcessing}
              >
                Stop Scanning
              </button>
            </div>

            {/* Camera View */}
            {scanMethod === 'camera' && (
              <div className="camera-container">
                <div id="qr-reader" className="qr-reader"></div>
                <div className="camera-instructions">
                  <p>Point your camera at the QR code to scan</p>
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
        {!showPopup && (
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

        {/* Single Popup */}
        {showPopup && user && (
          <div className="popup-overlay">
            <div className="popup">
              <div className="popup-header">
                <h2>
                  {attendanceStatus === 'already_marked' ? 'Attendance Already Marked' : 
                   attendanceStatus === 'marked' ? '✅ Success!' : 'Welcome!'}
                </h2>
              </div>
              
              <div className="popup-content">
                {/* Attendance Status Message */}
                {attendanceStatus === 'already_marked' && (
                  <div className="already-marked-notice">
                    <div className="already-marked-icon">⚠️</div>
                    <p className="already-marked-text">Attendance Already Marked</p>
                    <p className="already-marked-subtext">This user has already registered today</p>
                  </div>
                )}

                {attendanceStatus === 'not_marked' && (
                  <div className="welcome-notice">
                    <div className="welcome-icon">👋</div>
                    <p className="welcome-text">Welcome!</p>
                    <p className="welcome-subtext">Please submit to mark attendance</p>
                  </div>
                )}

                {/* Success Message */}
                {attendanceStatus === 'marked' && (
                  <div className="success-message">
                    <p className="success-text">
                      Attendance marked successfully!
                      {user.registrationCount && (
                        <span className="registration-count">
                          (Registration #{user.registrationCount})
                        </span>
                      )}
                    </p>
                    <p className="success-subtext">
                      Returning to scanner...
                    </p>
                  </div>
                )}

                <div className="user-details-popup">
                  <div className="detail-item">
                    <span className="detail-label">User ID:</span>
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
                  
                  {/* Show attendance time if available */}
                  {user.attendanceTime && (
                    <div className="detail-item">
                      <span className="detail-label">Attendance Time:</span>
                      <span className="detail-value">{user.attendanceTime}</span>
                    </div>
                  )}
                  
                  {/* Show registration count if available */}
                  {/* {user.totalRegistrations && (
                    <div className="detail-item highlight">
                      <span className="detail-label">Total Registrations:</span>
                      <span className="detail-value highlight-value">
                        {user.totalRegistrations}
                      </span>
                    </div>
                  )} */}
                </div>

{/* Show buttons based on attendance status */}
{attendanceStatus === 'not_marked' && (
  <div className="popup-actions">
    <button 
      className="submit-attendance-btn"
      onClick={markAttendance}
      disabled={isProcessing}
    >
      {isProcessing ? 'Marking Attendance...' : 'Submit Attendance'}
    </button>
    <button 
      className="cancel-btn"
      onClick={closePopup}
      disabled={isProcessing}
    >
      Cancel
    </button>
  </div>
)}

{attendanceStatus === 'already_marked' && (
  <div className="popup-actions">
    <button 
      className="submit-attendance-btn"
      onClick={markAttendance}
      disabled={isProcessing}
    >
      {isProcessing ? 'Marking Attendance...' : 'Submit Attendance'}
    </button>
    <button 
      className="close-btn"
      onClick={closePopup}
      disabled={isProcessing}
    >
      Close
    </button>
  </div>
)}

{attendanceStatus === 'marked' && (
  <div className="popup-actions">
    <button 
      className="close-btn"
      onClick={closePopup}
    >
      Close
    </button>
  </div>
)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default One;