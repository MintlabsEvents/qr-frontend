import React, { useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';
import './Two.css';

const Two = () => {
  const [scanner, setScanner] = useState(null);
  const [popup, setPopup] = useState('');
  const [statusText, setStatusText] = useState('Ready to scan');

  const showPopup = (message) => {
    setPopup(message);
    setTimeout(() => setPopup(''), 5000);
  };

  const handleCameraScan = async () => {
    if (scanner) return;
    const html5QrCode = new Html5Qrcode("qr-reader");
    setScanner(html5QrCode);
    setStatusText('Waiting for camera scan...');

    try {
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          stopCameraScan();
          markAttendance(decodedText);
        }
      );
    } catch (err) {
      console.error("Camera start failed", err);
      showPopup("Camera access failed");
      setStatusText('Camera failed to start');
    }
  };

  const stopCameraScan = () => {
    if (scanner) {
      scanner.stop().then(() => {
        setScanner(null);
        setStatusText('Ready to scan');
      }).catch(console.error);
    } else {
      setStatusText('Ready to scan');
    }
  };

  const handleBarcodeGun = () => {
    stopCameraScan();
    setStatusText('Waiting for barcode scanner input...');
    let buffer = '';
    const onKey = (e) => {
      if (e.key === 'Enter') {
        document.removeEventListener('keydown', onKey);
        markAttendance(buffer);
        buffer = '';
      } else {
        buffer += e.key;
      }
    };
    document.addEventListener('keydown', onKey);
  };

  const markAttendance = async (qrCodeData) => {
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/attendance/day2`, { qrCodeData });
      const user = res.data.user;
      if (user?.day2Date && user?.day2Time) {
        showPopup("✅ Attended successfully");
      } else {
        showPopup("⚠️ Already attended");
      }
    } catch (err) {
      console.error(err);
      showPopup("❌ Invalid QR Code");
    } finally {
      setStatusText('Ready to scan');
    }
  };

  return (
    <div className="container">
      <h2>Day 2 Check-In</h2>
      <div className="btn-group">
        <button onClick={handleBarcodeGun}>Scan using Barcode Scanner</button>
        <button onClick={handleCameraScan}>Scan using Camera</button>
      </div>

      <p className="scanner-status">{statusText}</p>

      <div id="qr-reader" style={{ width: 400, margin: 'auto', paddingTop: 20 }} />

      {popup && <div className="popup">{popup}</div>}
    </div>
  );
};

export default Two;
