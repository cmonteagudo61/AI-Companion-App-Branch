

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Loading from './Loading';

const UserProfile = () => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState('');
  const { token } = useAuth();

  console.log('UserProfile component rendered, token:', token);

  useEffect(() => {
    console.log('About to call fetchProfile');
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        console.log('Fetching profile...');
        console.log('Token:', token);
        if (!token) {
          throw new Error('No authentication token available');
        }
        const response = await fetch('http://localhost:5000/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('Response status:', response.status);
        console.log('Response headers:', JSON.stringify([...response.headers]));
        const responseText = await response.text();
        console.log('Response text:', responseText);
        if (!response.ok) {
          throw new Error(`Failed to fetch profile: ${response.status} - ${responseText}`);
        }
        const data = JSON.parse(responseText);
        console.log('Profile data:', data);
        setProfile(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchProfile();
    } else {
      setError('No authentication token available');
      setIsLoading(false);
    }
  }, [token]);


  const handleEmailUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email })
      });
      if (!response.ok) {
        throw new Error('Failed to update email');
      }
      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      alert('Email updated successfully');
    } catch (err) {
      console.error('Error updating email:', err);
      setError(err.message);
    }
  };

  if (isLoading) return <Loading />;
  if (error) return <div className="error"><p>{error}</p></div>;

  return (
    <div className="user-profile">
      <h2>User Profile</h2>
      {profile && (
        <>
          <p><strong>Username:</strong> {profile.username}</p>
          <p><strong>Email:</strong> {profile.email || 'Not set'}</p>
          <form onSubmit={handleEmailUpdate}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Update email"
            />
            <button type="submit">Update Email</button>
          </form>
        </>
      )}
    </div>
  );
};

export default UserProfile;
