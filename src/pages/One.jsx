import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'qrcode';
import './One.css';

const One = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [alreadyAttended, setAlreadyAttended] = useState(false);
  const html5QrCodeRef = useRef(null);

  const stopCameraScanner = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop()
        .then(() => {
          html5QrCodeRef.current.clear();
          html5QrCodeRef.current = null;
          setShowScanner(false);
        })
        .catch(err => console.warn('Stop error:', err));
    } else {
      setShowScanner(false);
    }
  };

  const showAlreadyPopup = () => {
    setAlreadyAttended(true);
    setTimeout(() => setAlreadyAttended(false), 5000);
  };

  const handlePrint = async (user) => {
    const qrBase64 = await QRCode.toDataURL(user.qrCodeData);
    const printZone = document.getElementById('print-zone');
    if (!printZone) return;

    printZone.innerHTML = `
      <div class="print-wrapper">
        <img class="qr" src="${qrBase64}" />
        <div class="name">${user.name}</div>
        <div class="org">${user.organization}</div>
      </div>
    `;

    await new Promise((res) => setTimeout(res, 300)); // Wait for DOM to update

    window.print();

    setTimeout(() => {
      printZone.innerHTML = ''; // Clear after print
    }, 1000);
  };

  const processQRCode = async (decodedText) => {
    try {
      const checkRes = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/check-attendance`, {
        qrCodeData: decodedText
      });

      const user = checkRes.data.user;
      if (!user) return alert('User not found');

      if (user.day1Date || user.day1Time) {
        showAlreadyPopup();
        return;
      }

      const markRes = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/attendance/day1`, {
        qrCodeData: decodedText
      });

      const updatedUser = markRes.data.user;
      if (updatedUser) handlePrint(updatedUser);
      else alert('Attendance failed');
    } catch (err) {
      console.error('Error:', err);
      alert('Invalid QR Code');
    }
  };

  const handleScanFromCamera = (decodedText) => {
    stopCameraScanner();
    processQRCode(decodedText);
  };

  const startCameraScanner = () => {
    stopCameraScanner();
    setShowScanner(true);

    setTimeout(() => {
      const scannerElement = document.getElementById('scanner');
      if (!scannerElement) return alert('Scanner element missing');

      const config = { fps: 10, qrbox: { width: 300, height: 300 } };
      const html5QrCode = new Html5Qrcode('scanner');
      html5QrCodeRef.current = html5QrCode;

      html5QrCode.start(
        { facingMode: 'environment' },
        config,
        handleScanFromCamera,
        err => console.warn('QR scan error', err)
      ).catch(err => alert('Camera error: ' + err));
    }, 300);
  };

  const handleBarcodeGun = () => {
    stopCameraScanner();
    let buffer = '';
    const onKey = (e) => {
      if (e.key === 'Enter') {
        document.removeEventListener('keydown', onKey);
        processQRCode(buffer.trim());
        buffer = '';
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };
    document.addEventListener('keydown', onKey);
  };

  return (
    <div className="one-container">
      <div className="one-main">
        <div className="scanner-options">
          <button onClick={handleBarcodeGun}>Scan Using Barcode Scanner</button>
          <button onClick={startCameraScanner}>Scan Using Camera</button>
        </div>

        {showScanner ? (
          <div id="scanner" className="camera-box"></div>
        ) : (
          <p className="scanner-status-text">Ready for barcode scan</p>
        )}

        {alreadyAttended && (
          <div className="popup-message">
            <p>Already Attended</p>
          </div>
        )}
      </div>

      {/* Hidden Print Area */}
      <div id="print-zone" style={{ display: 'none' }}></div>

      {/* Print CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-zone, #print-zone * {
            visibility: visible;
          }
          #print-zone {
            position: absolute;
            top: 0;
            left: 0;
            width: 9.5cm;
            height: 13.7cm;
            margin: 0;
            padding-top: 6.5cm;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            font-family: Arial, sans-serif;
          }
          .qr {
            width: 90px;
            height: 90px;
            margin-bottom: 10px;
          }
          .name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 4px;
            text-align: center;
          }
          .org {
            font-size: 14px;
            text-align: center;
          }
          @page {
            size: 9.5cm 13.7cm;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default One;
