import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'qrcode';
import './One.css';

const One = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [alreadyAttended, setAlreadyAttended] = useState(false);
  const printContainerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  const stopCameraScanner = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().then(() => {
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
        setShowScanner(false);
      }).catch(err => console.warn('Stop error:', err));
    } else {
      setShowScanner(false);
    }
  };

  const showAlreadyPopup = () => {
    setAlreadyAttended(true);
    setTimeout(() => setAlreadyAttended(false), 5000);
  };

const handlePrint = async (user) => {
  try {
    const qrBase64 = await QRCode.toDataURL(user.qrCodeData);

    const printHTML = `
      <html>
        <head>
          <title></title>
          <style>
            @page {
              size: 9.5cm 13.7cm;
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              height: 100%;
              width: 100%;
              font-family: Arial, sans-serif;
            }
            .print-page {
              width: 9.5cm;
              height: 13.7cm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: flex-start;
              padding-top: 7cm;
              padding-left:-5px;
              box-sizing: border-box;
              text-align: center;
            }
            .qr {
              width: 90px;
              height: 90px;
              margin-bottom: 10px;
            }
            .name {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .org {
              font-size: 16px;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-page">
            <img id="qrImage" class="qr" src="${qrBase64}" />
            <div class="name">${user.name}</div>
            <div class="org">${user.organization}</div>
          </div>
          <script>
            const img = document.getElementById('qrImage');
            img.onload = function () {
              window.print();
            };
            window.onafterprint = () => {
              window.close();
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocked. Please allow popups for this site.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(printHTML);
    printWindow.document.close();
  } catch (err) {
    console.error('Print error:', err);
    alert('Failed to generate badge');
  }
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

      {/* Hidden div for future reference if needed */}
      <div ref={printContainerRef} style={{ display: 'none' }} />
    </div>
  );
};

export default One;
