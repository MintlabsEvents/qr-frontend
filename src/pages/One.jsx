import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import QRCode from 'qrcode';
import './One.css';

const One = () => {
  const [alreadyAttendedUser, setAlreadyAttendedUser] = useState(null);
  const printContainerRef = useRef(null);

  // Listen for barcode scanner input
  useEffect(() => {
    let buffer = '';
    const onKey = (e) => {
      if (e.key === 'Enter') {
        processQRCode(buffer.trim());
        buffer = '';
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const showAlreadyPopup = (user) => {
    setAlreadyAttendedUser(user);
    setTimeout(() => setAlreadyAttendedUser(null), 5000);
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
            .qr {
              width: 105px;
              height: 105px;
              margin-bottom: 10px;
            }
            .name {
              font-size: 26px;
              font-weight: bold;
              margin-bottom: 4px;
              text-transform: uppercase;
            }
            .org {
              font-size: 24px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 90%;
              text-transform: uppercase;
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
        showAlreadyPopup(user);
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

  return (
    <div className="one-container">
      <div className="one-main">
        <p className="scanner-status-text">Waiting for barcode scan...</p>

        {alreadyAttendedUser && (
          <div className="popup-message">
            <p>Already Attended</p>
            <button onClick={() => handlePrint(alreadyAttendedUser)}>Print Again</button>
          </div>
        )}
      </div>

      <div ref={printContainerRef} style={{ display: 'none' }} />
    </div>
  );
};

export default One;
