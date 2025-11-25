import { useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';

const NameEntry = ({ onSubmit }) => {
  const [name, setName] = useState('');
  const [show, setShow] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim().length > 0) {
      localStorage.setItem('playerName', name.trim());
      setShow(false);
      onSubmit(name.trim());
    }
  };

  return (
    <Modal show={show} centered backdrop="static" keyboard={false}>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Enter Your Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={20}
            />
          </Form.Group>
          <Button variant="primary" type="submit" disabled={!name.trim()}>
            Continue
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default NameEntry;

