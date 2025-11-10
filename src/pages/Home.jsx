import React, { useState, useRef, useEffect } from 'react';
import { FaBars, FaUpload, FaUserPlus, FaUser, FaSearch, FaDownload, FaQrcode, FaArchive } from 'react-icons/fa';
import axios from 'axios';
import './Home.css';
import { useNavigate } from 'react-router-dom';
import { PaginationControl } from 'react-bootstrap-pagination-control';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const Home = () => {
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]); 
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [giftCount, setGiftCount] = useState(0);
  const [filteredUsers, setFilteredUsers] = useState([]); // Initialize as empty array
  const [page, setPage] = useState(1);
  const [isExportingQR, setIsExportingQR] = useState(false);
  const USERS_PER_PAGE = 10;

  // Safe array operations - ensure filteredUsers is always an array
  const sortedUsers = [...(filteredUsers || [])].sort((a, b) => a.id - b.id);
  const paginatedUsers = [...(filteredUsers || [])]
    .sort((a, b) => a.id - b.id)
    .slice((page - 1) * USERS_PER_PAGE, page * USERS_PER_PAGE);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    designation: '',
    organization: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
    fetchCounts();
  }, []);

  const fileInputRef = useRef(null);

  const toggleSideNav = () => {
    setIsSideNavOpen(!isSideNavOpen);
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/users`);
      const usersData = response.data || []; // Ensure we get an array
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]); // Set to empty array on error
      setFilteredUsers([]);
    }
  };

  const fetchCounts = async () => {
    try {
      const attendanceRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/count/attendance`);
      const giftRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/count/gifts`);
      setAttendanceCount(attendanceRes.data?.count || 0);
      setGiftCount(giftRes.data?.count || 0);
    } catch (err) {
      console.error('Failed to fetch counts:', err);
      setAttendanceCount(0);
      setGiftCount(0);
    }
  };

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);

    // Ensure users is an array before filtering
    const usersArray = users || [];
    const filtered = usersArray.filter((user) =>
      (user.name && user.name.toLowerCase().includes(term)) ||
      (user.email && user.email.toLowerCase().includes(term)) ||
      (user.mobile && user.mobile.toString().includes(term)) ||
      (user.id && user.id.toString().includes(term))
    );

    setFilteredUsers(filtered);
    setPage(1);
  };

  const downloadQRCode = async (user) => {
    try {
      if (!user?.qrCodeData) {
        alert('No QR code data available for this user');
        return;
      }

      const canvas = document.createElement('canvas');
      await QRCode.toCanvas(canvas, user.qrCodeData, {
        errorCorrectionLevel: 'H',
        width: 300,
        margin: 2,
      });

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${user.id}_${user.name}-qrcode.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('QR download error:', err);
      alert('Failed to generate QR code');
    }
  };

  // Export All QR Codes as ZIP
  const exportAllQRCodes = async () => {
    const usersArray = users || [];
    if (!usersArray.length) {
      alert('No users found to export QR codes');
      return;
    }

    try {
      setIsExportingQR(true);
      
      const zip = new JSZip();
      const qrFolder = zip.folder("qr-codes");

      // Process in batches to avoid memory issues
      const batchSize = 10;
      let processed = 0;
      const total = usersArray.length;

      for (let i = 0; i < usersArray.length; i += batchSize) {
        const batch = usersArray.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (user) => {
          if (user?.qrCodeData) {
            try {
              const canvas = document.createElement('canvas');
              await QRCode.toCanvas(canvas, user.qrCodeData, {
                errorCorrectionLevel: 'H',
                width: 300,
                margin: 2,
              });

              return new Promise((resolve) => {
                canvas.toBlob((blob) => {
                  resolve({
                    fileName: `${user.id}.png`,
                    blob: blob,
                    user: user
                  });
                }, 'image/png', 1.0);
              });
            } catch (error) {
              console.error(`Error generating QR for user ${user.id}:`, error);
              return null;
            }
          }
          return null;
        });

        const results = await Promise.all(batchPromises);
        
        // Add successful results to zip
        results.forEach(result => {
          if (result && result.blob) {
            qrFolder.file(result.fileName, result.blob);
            processed++;
          }
        });

        // Small delay between batches to prevent UI freeze
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Generate and download zip file
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      saveAs(zipBlob, `all-qr-codes-${new Date().toISOString().split('T')[0]}.zip`);
      
      alert(`Successfully exported ${processed} QR codes!`);

    } catch (error) {
      console.error('Error exporting QR codes:', error);
      alert('Failed to export QR codes. Please try again.');
    } finally {
      setIsExportingQR(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      alert('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsUploading(true);
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/upload-excel`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 30000
        }
      );

      const usersData = response.data?.users || response.data || [];
      setUsers(usersData);
      setFilteredUsers(usersData);
      fetchCounts(); // Refresh counts after upload
      alert('File uploaded successfully!');

    } catch (error) {
      console.error('Error uploading file:', error);
      let errorMessage = 'Error uploading file';

      if (error.response) {
        errorMessage = error.response.data?.error || errorMessage;
      } else if (error.request) {
        errorMessage = 'No response from server';
      } else {
        errorMessage = error.message;
      }

      alert(errorMessage);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/export-excel`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'users_export.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Failed to export Excel.');
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to reset all attendance and gift records?")) return;

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/reset-all`);
      alert(response.data?.message || 'All records reset successfully!');
      fetchUsers();
      fetchCounts();
    } catch (error) {
      console.error('Reset error:', error);
      alert(error.response?.data?.error || 'Failed to reset records');
    }
  };

  const handleResetUser = async (userId) => {
    if (!window.confirm('Are you sure you want to reset this user\'s attendance and gift records?')) return;

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/reset-user`, {
        userId
      });

      const updatedUser = response.data?.user;
      if (updatedUser) {
        // Update local state
        setUsers((prev) => (prev || []).map((u) => u._id === updatedUser._id ? updatedUser : u));
        setFilteredUsers((prev) => (prev || []).map((u) => u._id === updatedUser._id ? updatedUser : u));
        fetchCounts(); // Refresh counts
        alert('User records reset successfully');
      }
    } catch (err) {
      console.error('Error resetting user:', err);
      alert('Failed to reset user records');
    }
  };

  // Safe user data access
  const getUserDisplayValue = (user, field) => {
    return user?.[field] || '-';
  };

  return (
    <div className="home-container">
      {/* Side Navigation */}
      <nav id="sidenav-1" className={`sidenav ${isSideNavOpen ? 'open' : ''}`}>
        <ul className="sidenav-menu">
          <li className="sidenav-item">
            <a className="sidenav-link" onClick={() => navigate('/attendance')}>
              <i className="fas fa-calendar-day fa-fw me-3"></i><span>Mark Attendance</span>
            </a>
          </li>
          <li className="sidenav-item">
            <a className="sidenav-link" onClick={() => navigate('/gifting')}>
              <i className="fas fa-gift fa-fw me-3"></i><span>Gift Management</span>
            </a>
          </li>
        </ul>
      </nav>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <header className="header">
          <button className="btn btn-primary" onClick={toggleSideNav} aria-controls="#sidenav-1" aria-haspopup="true">
            <FaBars />
          </button>

          <div className="search-bar">
            <span className="search-icon">
              <FaSearch />
            </span>
            <input
              type="text"
              placeholder="Search by ID, name, mobile or email..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>

          <div className="header-actions">
            <button className="btn btn-export">
              Attendance Marked: {attendanceCount}
            </button>

            <button className="btn btn-export">
              Gift Received: {giftCount}
            </button>

            <button className="btn btn-export" onClick={handleReset}>
              Reset All
            </button>

            <button 
              className="btn btn-export" 
              onClick={exportAllQRCodes}
              disabled={isExportingQR || !users?.length}
            >
              <FaArchive /> 
              {isExportingQR ? 'Exporting...' : 'Export All QR'}
            </button>

            <button className="btn btn-export" onClick={handleExportExcel}>
              <FaDownload /> Export Excel
            </button>

            <button className="btn btn-upload" onClick={handleUploadClick} disabled={isUploading}>
              <FaUpload /> {isUploading ? 'Uploading...' : 'Upload Excel'}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls"
              style={{ display: 'none' }}
            />

            <button className="btn btn-register" onClick={() => navigate('/register')}>
              <FaUserPlus /> Registration
            </button>
          </div>
        </header>

        {/* User List */}
        <div className="user-list">
          {filteredUsers?.length > 0 ? (
            <div>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Designation</th>
                    <th>Organization</th>
                    <th>Attendance</th>
                    <th>Gift Given</th>
                    <th>On Site</th>
                    <th>Actions</th>
                    <th>Reset</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedUsers.map((user, index) => (
                    <tr key={user._id || index}>
                      <td>{getUserDisplayValue(user, 'id')}</td>
                      <td>{getUserDisplayValue(user, 'name')}</td>
                      <td>{getUserDisplayValue(user, 'email')}</td>
                      <td>{getUserDisplayValue(user, 'mobile')}</td>
                      <td>{getUserDisplayValue(user, 'designation')}</td>
                      <td>{getUserDisplayValue(user, 'organization')}</td>

                      <td>
                        <div className="attendance-status">
                          <span
                            className={`attendance-circle ${user?.Attendance === 'Present' ? 'present' : 'absent'}`}
                            title={user?.AttendanceTime ? `Present: ${user.AttendanceTime}` : 'Absent'}
                          ></span>
                          <span className={`status-text ${user?.Attendance === 'Present' ? 'present' : 'absent'}`}>
                            {user?.Attendance === 'Present' ? 'Attended' : 'Unattended'}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="attendance-status">
                          <span
                            className={`attendance-circle ${user?.giftGiven === 'Yes' ? 'present' : 'absent'}`}
                            title={user?.GiftGivenTime ? `Gift Given: ${user.GiftGivenTime}` : 'Not Given'}
                          ></span>
                          <span className={`status-text ${user?.giftGiven === 'Yes' ? 'present' : 'absent'}`}>
                            {user?.giftGiven === 'Yes' ? 'Received' : 'Not Received'}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="attendance-status">
                          <span
                            className={`attendance-circle ${user?.onSiteDay ? 'present' : 'absent'}`}
                            title={user?.onSiteRegistration || 'Not Registered'}
                          ></span>
                          <span className={`status-text ${user?.onSiteDay ? 'present' : 'absent'}`}>
                            {user?.onSiteDay ? 'On Site' : 'Off Site'}
                          </span>
                        </div>
                      </td>

                      <td>
                        <button className="btn btn-view" onClick={() => downloadQRCode(user)}>
                          <FaQrcode /> Download QR
                        </button>
                      </td>
                      <td>
                        <button className="btn btn-danger" onClick={() => handleResetUser(user._id)}>
                          Reset
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="pagination-control">
                <PaginationControl
                  page={page}
                  total={filteredUsers?.length || 0}
                  limit={USERS_PER_PAGE}
                  changePage={(p) => setPage(p)}
                  between={3}
                  ellipsis={1}
                  next={true}
                  previous={true}
                  first={true}
                  last={true}
                />
              </div>
            </div>
          ) : (
            <div className="no-users">
              {searchTerm ? 'No users match your search' : 'No users found. Upload an Excel file or register a new user.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;