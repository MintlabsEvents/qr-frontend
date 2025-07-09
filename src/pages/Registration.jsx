// Updated Registration.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Registration.css';

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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/register-user`, {
        id: nextId,
        ...formData
      });
      alert('User registered successfully');
      navigate('/');
    } catch (err) {
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