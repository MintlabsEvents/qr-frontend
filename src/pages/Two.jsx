import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Two.css';

const Two = () => {
  const [popup, setPopup] = useState('');
  const [statusText, setStatusText] = useState('Waiting for barcode scanner input...');
  const [scannerActive, setScannerActive] = useState(false);

  useEffect(() => {
    // Start barcode listening on mount
    let buffer = '';
    const onKey = (e) => {
      if (e.key === 'Enter') {
        markAttendance(buffer.trim());
        buffer = '';
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    if (!scannerActive) {
      document.addEventListener('keydown', onKey);
      setScannerActive(true);
    }

    return () => {
      document.removeEventListener('keydown', onKey);
      setScannerActive(false);
    };
  }, [scannerActive]);

  const showPopup = (message) => {
    setPopup(message);
    setTimeout(() => setPopup(''), 5000);
  };

  const markAttendance = async (qrCodeData) => {
    setStatusText('Processing...');
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/attendance/day2`, { qrCodeData });
      const user = res.data.user;

      if (user?.day2Date && user?.day2Time) {
        showPopup('✅ Attended successfully');
      } else {
        showPopup('⚠️ Already attended');
      }
    } catch (err) {
      console.error(err);
      showPopup('❌ Invalid QR Code');
    } finally {
      setStatusText('Waiting for barcode scanner input...');
    }
  };

  return (
    <div className="container">
      <h2>Day 2 Check-In</h2>
      <p className="scanner-status">{statusText}</p>

      {popup && <div className="popup">{popup}</div>}
    </div>
  );
};

export default Two;
