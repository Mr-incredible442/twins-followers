import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { SocketContext } from './socketContextValue';

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    // Prevent double initialization in Strict Mode
    if (isInitialized.current) {
      return;
    }
    isInitialized.current = true;

    // Auto-detect server URL based on current hostname
    const getServerUrl = () => {
      // If VITE_SERVER_URL is explicitly set, use it
      if (import.meta.env.VITE_SERVER_URL) {
        return import.meta.env.VITE_SERVER_URL;
      }

      // Otherwise, use the same hostname as the frontend
      const hostname = window.location.hostname;
      const protocol =
        window.location.protocol === 'https:' ? 'https:' : 'http:';

      // If accessing from localhost, use localhost for server
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:8000';
      }

      // Otherwise, use the same hostname with port 8000
      return `${protocol}//${hostname}:8000`;
    };

    const serverUrl = getServerUrl();
    console.log('Connecting to server at:', serverUrl);

    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling'], // Allow fallback to polling if websocket fails
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    // Set socket in next tick to avoid setState in effect
    setTimeout(() => {
      setSocket(newSocket);
    }, 0);

    return () => {
      // Cleanup on unmount
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.close();
        socketRef.current = null;
        isInitialized.current = false;
        setSocket(null);
        setConnected(false);
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};
