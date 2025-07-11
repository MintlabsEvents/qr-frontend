import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Registration.css';
import QRCode from 'qrcode';

const Registration = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    designation: '',
    organization: ''
  });
  const [nextId, setNextId] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/users`);
        const ids = res.data.map(u => u.id).filter(Boolean);
        setNextId(Math.max(...ids, 290) + 1); // default to 291 if no users
      } catch (err) {
        console.error('Error fetching users:', err);
        setNextId(291);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.body.style.pointerEvents = 'auto';
    return () => {
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
    };
  }, []);


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
                padding-top: 6.5cm;
                box-sizing: border-box;
                text-align: center;
              }
              .qr {
              width: 105px;
              height: 105px;
              margin-bottom: 10px;
            }
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

      // Navigate home after short delay to let print popup open
      setTimeout(() => {
        navigate('/');
      }, 500); // allow print window to load before navigating

    } catch (err) {
      console.error('Print error:', err);
      alert('Failed to generate badge');
      navigate('/');
    }
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/register-user`, {
      id: nextId,
      ...formData
    });

    const user = res.data;
    alert('User registered successfully');

    // ✅ Mark Day 1 Attendance and set onSiteDay1 true
    await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/attendance/day1`, {
      qrCodeData: user.qrCodeData,
      onSiteDay1: true  // Send this from frontend only
    });

    await handlePrint(user);
  } catch (err) {
    console.error(err);
    alert('Registration failed');
  }
};


  return (
    <div className="register-container">
      <div className="register-header">
        <h2>Register New User</h2>
        <button className="register-back" onClick={() => navigate('/')}>Back to Home</button>
      </div>
      <form className="register-form" onSubmit={handleSubmit}>
        <label>Name:
          <input type="text" name="name" value={formData.name} onChange={handleChange} required />
        </label>
        <label>Email:
          <input type="email" name="email" value={formData.email} onChange={handleChange} required />
        </label>
        <label>Mobile:
          <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} required />
        </label>
        <label>Designation:
          <input type="text" name="designation" value={formData.designation} onChange={handleChange} required />
        </label>
        <label>Organization:
          <input type="text" name="organization" value={formData.organization} onChange={handleChange} required />
        </label>
        <button type="submit" className="register-submit">Register</button>
      </form>
    </div>
  );
};

export default Registration;
