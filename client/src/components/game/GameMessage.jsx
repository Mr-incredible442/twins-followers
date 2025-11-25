import { Alert } from 'react-bootstrap';

const GameMessage = ({ message }) => {
  if (!message) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1500,
        animation: 'fadeIn 0.5s ease-in',
      }}>
      <Alert variant='info' className='mb-0'>
        {message}
      </Alert>
    </div>
  );
};

export default GameMessage;

