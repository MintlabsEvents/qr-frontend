import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'qrcode';
import './One.css';

const One = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [alreadyAttended, setAlreadyAttended] = useState(false);
  const [printHtml, setPrintHtml] = useState('');
  const html5QrCodeRef = useRef(null);
  const printContainerRef = useRef(null);

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

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    alert('Popup blocked.');
    return;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>Print</title>
        <style>
          @page {
            size: 9.5cm 13.5cm;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .badge {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
            height: 100%;
          }
          .qr img {
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
        </style>
      </head>
      <body>
        <div class="badge">
          <div class="qr"><img src="${qrBase64}" /></div>
          <div class="name">${user.name}</div>
          <div class="org">${user.organization}</div>
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  // Wait for image to load
  printWindow.onload = () => {
    printWindow.print();
    setTimeout(() => printWindow.close(), 200);
  };
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

      {/* ✅ Print zone */}
      <div
        ref={printContainerRef}
        id="print-badge"
        dangerouslySetInnerHTML={{ __html: printHtml }}
      />

      {/* ✅ Print Styles */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }

          @page {
            size: 9.5cm 13.5cm;
            margin: 0;
          }

          .one-container, .one-main, .scanner-options, #scanner, .scanner-status-text, .popup-message {
            display: none !important;
          }

          #print-badge {
            display: block;
            width: 9.5cm;
            height: 13.5cm;
            overflow: hidden;
            page-break-after: avoid;
          }

          .print-sheet {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            box-sizing: border-box;
          }

          .badge {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
          }

          .qr img {
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
        }

        /* Hide print badge on screen */
        #print-badge {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default One;
