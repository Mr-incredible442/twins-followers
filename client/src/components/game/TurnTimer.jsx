import React, { useState, useEffect } from 'react';
import './TurnTimer.css';

const TurnTimer = ({ turnStartTime, turnTimeLimit, currentPlayerSocketId, socketId, isPaused, hasFightData }) => {
  const [timeRemaining, setTimeRemaining] = useState(turnTimeLimit || 30);
  const [isActive, setIsActive] = useState(false);
  const [pausedAt, setPausedAt] = useState(null);

  useEffect(() => {
    if (!turnStartTime || !currentPlayerSocketId) {
      setIsActive(false);
      setTimeRemaining(turnTimeLimit || 30);
      return;
    }

    // Show timer to all players (not just current player)
    setIsActive(true);

    // Handle pause/resume
    if (isPaused || hasFightData) {
      if (!pausedAt) {
        // Just paused - store current time
        const startTime = new Date(turnStartTime).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        const remaining = Math.max(0, (turnTimeLimit || 30) - elapsed);
        setPausedAt(remaining);
      }
      return; // Don't update timer while paused
    } else {
      // Resumed - clear pause state
      setPausedAt(null);
    }

    // Calculate initial time remaining
    const startTime = new Date(turnStartTime).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - startTime) / 1000);
    const remaining = pausedAt !== null ? pausedAt : Math.max(0, (turnTimeLimit || 30) - elapsed);
    setTimeRemaining(remaining);

    // Update every second (only if not paused)
    if (isPaused || hasFightData) {
      return; // Don't set interval if paused
    }

    const interval = setInterval(() => {
      const currentTime = Date.now();
      const elapsed = Math.floor((currentTime - startTime) / 1000);
      const remaining = Math.max(0, (turnTimeLimit || 30) - elapsed);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        setIsActive(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [turnStartTime, turnTimeLimit, currentPlayerSocketId, socketId, isPaused, hasFightData, pausedAt]);

  if (!isActive || !turnStartTime) {
    return null;
  }

  // Determine color based on time remaining
  let timerColor = '#28a745'; // Green (>15s)
  let timerClass = 'timer-normal';

  if (timeRemaining <= 5) {
    timerColor = '#dc3545'; // Red (<5s)
    timerClass = 'timer-critical';
  } else if (timeRemaining <= 10) {
    timerColor = '#ffc107'; // Yellow (5-10s)
    timerClass = 'timer-warning';
  } else if (timeRemaining <= 15) {
    timerColor = '#ffc107'; // Yellow (10-15s)
    timerClass = 'timer-warning';
  }

  // Calculate percentage for circular progress
  const percentage = (timeRemaining / (turnTimeLimit || 30)) * 100;

  return (
    <div className={`turn-timer ${timerClass}`}>
      <div className="timer-circle">
        <svg className="timer-svg" viewBox="0 0 100 100">
          <circle
            className="timer-background"
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="8"
          />
          <circle
            className="timer-progress"
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={timerColor}
            strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - percentage / 100)}`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className="timer-text">
          <span className="timer-seconds">{timeRemaining}</span>
          <span className="timer-label">s</span>
        </div>
      </div>
    </div>
  );
};

export default TurnTimer;

