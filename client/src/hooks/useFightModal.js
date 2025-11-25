import { useState, useEffect, useRef } from 'react';

const useFightModal = (fightData) => {
  const [showFightModal, setShowFightModal] = useState(false);
  const fightModalTimerRef = useRef(null);

  useEffect(() => {
    if (fightData) {
      // Defer state update to avoid cascading renders
      const timer = setTimeout(() => {
        setShowFightModal(true);
      }, 0);

      // Clear any existing timer
      if (fightModalTimerRef.current) {
        clearTimeout(fightModalTimerRef.current);
      }

      // Auto-dismiss after 5 seconds
      fightModalTimerRef.current = setTimeout(() => {
        setShowFightModal(false);
        fightModalTimerRef.current = null;
      }, 5000);

      return () => {
        clearTimeout(timer);
        if (fightModalTimerRef.current) {
          clearTimeout(fightModalTimerRef.current);
        }
      };
    } else {
      // Defer state update
      const timer = setTimeout(() => {
        setShowFightModal(false);
      }, 0);

      if (fightModalTimerRef.current) {
        clearTimeout(fightModalTimerRef.current);
        fightModalTimerRef.current = null;
      }

      return () => {
        clearTimeout(timer);
        if (fightModalTimerRef.current) {
          clearTimeout(fightModalTimerRef.current);
        }
      };
    }
  }, [fightData]);

  return showFightModal;
};

export default useFightModal;

