import React from 'react';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div>
      <h1>Welcome to Generative Dialogue AI</h1>
      {isAuthenticated ? (
        <p>You are logged in. Start creating dialogues!</p>
      ) : (
        <p>Please log in or register to start.</p>
      )}
    </div>
  );
};

export default Home;