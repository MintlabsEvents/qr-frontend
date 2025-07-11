import React, { useState, useRef, useEffect } from 'react';
import { FaBars, FaUpload, FaUserPlus, FaUser, FaSearch, FaDownload, FaQrcode } from 'react-icons/fa';
import axios from 'axios';
import './Home.css';
import { useNavigate } from 'react-router-dom';

import { PaginationControl } from 'react-bootstrap-pagination-control';
import QRCode from 'qrcode';

const Home = () => {
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [showUserDetails, ] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]); 
  const [day1Count, setDay1Count] = useState(0);
const [day2Count, setDay2Count] = useState(0);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [page, setPage] = useState(1);
  const USERS_PER_PAGE = 10;
const sortedUsers = [...filteredUsers].sort((a, b) => a.id - b.id);
const paginatedUsers = [...filteredUsers]
  .sort((a, b) => a.id - b.id) // sort by id ascending
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
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/users`);
        setUsers(response.data);
        setFilteredUsers(response.data);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();
  }, []);

  const fileInputRef = useRef(null);

  const toggleSideNav = () => {
    setIsSideNavOpen(!isSideNavOpen);
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

const handleSearch = (e) => {
  const term = e.target.value.toLowerCase();
  setSearchTerm(term);

  const filtered = users.filter((user) =>
    (user.name && user.name.toLowerCase().includes(term)) ||
    (user.email && user.email.toLowerCase().includes(term)) ||
    (user.mobile && user.mobile.toString().includes(term))
  );

  setFilteredUsers(filtered);
  setPage(1);
};




const downloadQRCode = async (user) => {
  try {
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, user.qrCodeData, {
      errorCorrectionLevel: 'H',
      width: 300,
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
        timeout: 30000 // 30 seconds timeout
      }
    );

    setUsers(response.data);
    setFilteredUsers(response.data);
    alert('File uploaded successfully!');

  } catch (error) {
    console.error('Error uploading file:', error);

    let errorMessage = 'Error uploading file';

    if (error.response) {
      errorMessage = error.response.data.error || errorMessage;
      console.error('Server error details:', error.response.data);
    } else if (error.request) {
      errorMessage = 'No response from server';
      console.error('Request error:', error.request);
    } else {
      errorMessage = error.message;
    }

    alert(errorMessage);

  } finally {
    setIsUploading(false);
  }
};




const handleExportExcel = async () => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/export-excel`, {
      responseType: 'blob' // Important for binary file
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
  if (!window.confirm("Are you sure you want to reset all attendance records?")) return;

  try {
    const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/reset-attendance`);
    alert(response.data.message || 'Attendance reset successfully!');
  } catch (error) {
    console.error('Reset error:', error);
    alert(error.response?.data?.error || 'Failed to reset attendance');
  }
};

const handleResetUser = async (userId) => {
  if (!window.confirm('Are you sure you want to reset this user\'s attendance?')) return;

  try {
    const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/reset-user-attendance-Id`, {
      userId
    });

    const updatedUser = response.data.user;
    // Update local state if needed
    setUsers((prev) => prev.map((u) => u._id === updatedUser._id ? updatedUser : u));
    setFilteredUsers((prev) => prev.map((u) => u._id === updatedUser._id ? updatedUser : u));

    alert('Attendance reset successfully');
  } catch (err) {
    console.error('Error resetting user:', err);
    alert('Failed to reset user attendance');
  }
};

const getUserCountDay1 = async () => {
  try {
    const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/count/day1`);
    setDay1Count(res.data.day1Count || 0);
  } catch (err) {
    console.error('Failed to fetch Day 1 count:', err);
  }
};

const getUserCountDay2 = async () => {
  try {
    const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/count/day2`);
    setDay2Count(res.data.day2Count || 0);
  } catch (err) {
    console.error('Failed to fetch Day 2 count:', err);
  }
};
useEffect(() => {
  getUserCountDay1();
  getUserCountDay2();
}, []);

  return (
    <div className="home-container">
      {/* Side Navigation */}
      <nav id="sidenav-1" className={`sidenav ${isSideNavOpen ? 'open' : ''}`}>
        <ul className="sidenav-menu">
           <li className="sidenav-item">
           
          </li>
          <li className="sidenav-item">
            <a className="sidenav-link" onClick={() => navigate('/one')}>
              <i className="fas fa-calendar-day fa-fw me-3"></i><span>Day One</span>
            </a>
          </li>
          <li className="sidenav-item">
            <a className="sidenav-link" onClick={() => navigate('/two')}>
              <i className="fas fa-calendar-day fa-fw me-3"></i><span>Day Two</span>
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
    placeholder="Search by name, mobile or email..."
    value={searchTerm}
    onChange={handleSearch}
  />
</div>


           
          <div className="header-actions">
            <button className="btn btn-export" onClick={getUserCountDay1}>
            Day 1: {day1Count}
          </button>

          <button className="btn btn-export" onClick={getUserCountDay2}>
            Day 2: {day2Count}
          </button>

             <button className="btn btn-export" onClick={handleReset}>
              Reset All
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
  {filteredUsers.length > 0 ? (
    <div>
      <table>
<thead>
  <tr>
    <th>id</th>
    <th>Name</th>
    <th>Email</th>
    <th>Mobile</th>
    <th>Designation</th>
    <th>Organization</th>
    <th>Day 1</th>
    <th>Day 2</th>
    <th>Actions</th>
    <th>Reset</th>
  </tr>
</thead>

<tbody>
  {paginatedUsers.map((user, index) => (
    <tr key={index}>
      <td>{user.id}</td>
      <td>{user.name}</td>
      <td>{user.email}</td>
      <td>{user.mobile}</td>
      <td>{user.designation}</td>
      <td>{user.organization}</td>

     <td>
<div className="attendance-status">
  <span
    className={`attendance-circle ${user.day1Time ? 'present' : 'absent'}`}
    title={user.day1Time ? `Present: ${user.day1Date || ''} ${user.day1Time}` : 'Absent'}
  ></span>
  <span className={`status-text ${user.day1Time ? 'present' : 'absent'}`}>
    {user.day1Time ? 'Attended' : 'Unattended'}
  </span>
</div>

</td>
<td>
<div className="attendance-status">
  <span
    className={`attendance-circle ${user.day2Time ? 'present' : 'absent'}`}
    title={user.day2Time ? `Present: ${user.day2Date || ''} ${user.day2Time}` : 'Absent'}
  ></span>
  <span className={`status-text ${user.day2Time ? 'present' : 'absent'}`}>
    {user.day2Time ? 'Attended' : 'Unattended'}
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

      {/* Styled pagination */}
<div className="pagination-control">
<PaginationControl
  page={page}
  total={filteredUsers.length}
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