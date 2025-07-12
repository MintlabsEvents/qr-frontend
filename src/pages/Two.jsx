import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import QRCode from 'qrcode';
import './Two.css';

const Two = () => {
  const [popup, setPopup] = useState(null);
  const [statusText, setStatusText] = useState('Waiting for barcode scanner input...');
  const [scannedUser, setScannedUser] = useState(null);
  const isProcessingRef = useRef(false); // 👈 lock for debounce

  useEffect(() => {
    let buffer = '';
    const onKey = (e) => {
      if (e.key === 'Enter') {
        if (isProcessingRef.current) return; // 👈 prevent re-entry
        isProcessingRef.current = true;

        const qr = buffer.trim();
        buffer = '';

        processQRCode(qr).finally(() => {
          // release the lock after delay
          setTimeout(() => {
            isProcessingRef.current = false;
          }, 1000);
        });
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const processQRCode = async (qrCodeData) => {
    setStatusText('Processing...');
    try {
      const checkRes = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/check-attendance`, {
        qrCodeData
      });

      const user = checkRes.data.user;
      if (!user) {
        setPopup('error');
        return;
      }

      setScannedUser(user);

      if (user.day2Date || user.day2Time) {
        setPopup('already');
      } else {
        const markRes = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/attendance/day2`, {
          qrCodeData
        });
        const updatedUser = markRes.data.user;
        setScannedUser(updatedUser);
        setPopup('success');
      }
    } catch (err) {
      console.error(err);
      setPopup('error');
    } finally {
      setStatusText('Waiting for barcode scanner input...');
    }
  };

  const handlePrint = async () => {
    if (!scannedUser) return;

    try {
      const qrBase64 = await QRCode.toDataURL(scannedUser.qrCodeData);
      const printHTML = `
        <html>
          <head>
            <title></title>
            <style>
              @page { size: 9.5cm 13.7cm; margin: 0; }
              html, body {
                margin: 0;
                padding: 0;
                height: 13.7cm;
                width: 9.5cm;
                font-family: Arial, sans-serif;
                overflow: hidden;
              }
              .print-page {
                height: 100%;
                width: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                padding-top: 7.5cm;
                box-sizing: border-box;
                text-align: center;
              }
              .qr { width: 105px; height: 105px; margin-bottom: 10px; }
              .name {
                font-size: 23px;
                font-weight: bold;
                margin-bottom: 4px;
                text-transform: uppercase;
              }
              .org {
                font-size: 19px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 90%;
                text-transform: uppercase;
              }
              @media print {
                body { -webkit-print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            <div class="print-page">
              <img id="qrImage" class="qr" src="${qrBase64}" />
              <div class="name">${scannedUser.name}</div>
              <div class="org">${scannedUser.organization}</div>
            </div>
            <script>
              const img = document.getElementById('qrImage');
              img.onload = function () { window.print(); };
              window.onafterprint = () => { window.close(); };
            </script>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (!printWindow) return alert('Popup blocked. Please allow popups for this site.');
      printWindow.document.open();
      printWindow.document.write(printHTML);
      printWindow.document.close();
    } catch (err) {
      console.error('Print error:', err);
      alert('Failed to generate badge');
    }
  };

  const renderPopup = () => {
    if (popup === 'success') {
      return (
        <div className="popup centered">
          <p>✅ Attended Successfully</p>
          <div className="popup-buttons">
            <button onClick={handlePrint}>Print</button>
            <button onClick={() => setPopup(null)}>Cancel</button>
          </div>
        </div>
      );
    } else if (popup === 'already') {
      return (
        <div className="popup centered">
          <p>⚠️ Already Attended</p>
          <button onClick={handlePrint}>Print Again</button>
        </div>
      );
    } else if (popup === 'error') {
      return (
        <div className="popup centered">
          <p>❌ Invalid QR Code</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="container">
      <h2>Day 2 Check-In</h2>
      <p className="scanner-status">{statusText}</p>
      {renderPopup()}
    </div>
  );
};

export default Two;
