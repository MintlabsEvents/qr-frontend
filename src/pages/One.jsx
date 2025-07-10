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
      html5QrCodeRef.current.stop().then(() => {
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
        setShowScanner(false);
      }).catch(console.warn);
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
    const printWindow = window.open('', '_blank', 'width=600,height=600');

    if (!printWindow) {
      alert('Popup blocked — please allow popups for this site');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Badge: ${user.name}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
            text-align: center;
          }
          .badge {
            border: 1px solid #ddd;
            padding: 20px;
            border-radius: 5px;
            max-width: 100%;
          }
          .qr-container {
            margin: 0 auto 15px;
          }
          .qr-code {
            width: 120px;
            height: 120px;
          }
          .name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .org {
            font-size: 18px;
            color: #555;
          }
          @media print {
            body {
              height: auto;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @page {
              size: auto;
              margin: 5mm;
            }
            .badge {
              border: none;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="badge">
          <div class="qr-container">
            <img class="qr-code" src="${qrBase64}" 
                 alt="QR Code" 
                 onload="window.qrLoaded = true;" />
          </div>
          <div class="name">${user.name}</div>
          <div class="org">${user.organization}</div>
        </div>

        <script>
          let printAttempts = 0;
          const maxPrintAttempts = 5;

          function checkAndPrint() {
            printAttempts++;
            
            if (window.qrLoaded) {
              // Focus window for better print reliability
              window.focus();
              
              // Small delay before printing
              setTimeout(() => {
                window.print();
              }, 300);
            } else if (printAttempts < maxPrintAttempts) {
              setTimeout(checkAndPrint, 300);
            } else {
              console.error('QR code failed to load after multiple attempts');
              alert('Printing failed - please try again');
            }
          }

          // Start the print process after everything loads
          window.addEventListener('load', () => {
            // Extra delay for HP printer compatibility
            setTimeout(checkAndPrint, 1000);
          });

          // Close window after printing
          window.onafterprint = () => {
            setTimeout(() => {
              window.close();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

  } catch (error) {
    console.error('Printing error:', error);
    alert('Error generating print preview. Please try again.');
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
      else alert('Attendance marking failed');
    } catch (err) {
      console.error(err);
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
        handleScanFromCamera
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
    </div>
  );
};

export default One;
