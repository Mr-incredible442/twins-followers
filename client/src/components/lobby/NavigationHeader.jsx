import { Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

/**
 * Reusable navigation header component for lobby views
 * @param {Function} onBack - Callback for back button (optional)
 * @param {string} backLabel - Label for back button (default: "← Back to Lobby")
 */
const NavigationHeader = ({ onBack, backLabel = '← Back to Lobby' }) => {
  const navigate = useNavigate();

  return (
    <div className='mb-3 d-flex justify-content-between align-items-center'>
      {onBack && (
        <Button variant='outline-secondary' onClick={onBack}>
          {backLabel}
        </Button>
      )}
      {!onBack && <div />}
      <Button variant='outline-secondary' onClick={() => navigate('/')}>
        Home
      </Button>
    </div>
  );
};

export default NavigationHeader;

