import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Login from './components/Login';
import Register from './components/Register';
import CreateDialogue from './pages/CreateDialogue';
import UserProfile from './components/UserProfile';
import ProtectedRoute from './components/ProtectedRoute';
import DialogueRoom from './components/DialogueRoom';
import DialogueList from './components/DialogueList';
import VideoConferences from './components/VideoConferences';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navigation />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route 
              path="/create-dialogue" 
              element={
                <ProtectedRoute>
                  <CreateDialogue />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dialogues" 
              element={
                <ProtectedRoute>
                  <DialogueList />
                </ProtectedRoute>
              } 
            />          
            <Route 
              path="/dialogue/:id" 
              element={
                <ProtectedRoute>
                  <DialogueRoom />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/video-conferences" 
              element={
                <ProtectedRoute>
                  <VideoConferences />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
