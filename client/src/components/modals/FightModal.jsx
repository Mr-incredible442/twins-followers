import { Modal, Badge } from 'react-bootstrap';
import CardComponent from '../Card';

const FightModal = ({ show, onHide, fightData, playerName }) => {
  if (!fightData) return null;

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size='lg'
      backdrop='static'
      keyboard={false}>
      <Modal.Header
        style={{
          backgroundColor: '#dc3545',
          color: 'white',
          borderBottom: 'none',
        }}>
        <Modal.Title style={{ fontSize: '24px', fontWeight: 'bold' }}>
          ⚔️ FIGHT! ⚔️
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: '#1a1a1a', color: 'white' }}>
        <div className='text-center mb-4'>
          <p style={{ fontSize: '18px', marginBottom: '20px' }}>
            Multiple players can win with this card!
          </p>

          {/* Card that triggered the fight */}
          <div className='mb-4'>
            <p style={{ fontSize: '14px', marginBottom: '10px' }}>
              Card that triggered the fight:
            </p>
            <div style={{ display: 'inline-block' }}>
              <CardComponent card={fightData.fightCard} disabled />
            </div>
          </div>

          {/* Fighting players and their hands */}
          <div className='mt-4'>
            {fightData.fightParticipants?.map((participantName) => {
              const originalHand =
                fightData.fightOriginalHands?.[participantName] || [];
              const droppedCard =
                fightData.fightDroppedCards?.[participantName];
              const isMe = participantName === playerName;

              return (
                <div
                  key={participantName}
                  style={{
                    marginBottom: '30px',
                    padding: '15px',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderRadius: '8px',
                    border: '2px solid rgba(220, 53, 69, 0.3)',
                  }}>
                  <h5 style={{ marginBottom: '15px' }}>
                    {participantName}
                    {isMe && (
                      <Badge bg='primary' className='ms-2'>
                        You
                      </Badge>
                    )}
                  </h5>
                  <p style={{ fontSize: '12px', marginBottom: '10px' }}>
                    Original Hand (card to drop highlighted):
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '10px',
                      justifyContent: 'center',
                    }}>
                    {originalHand.map((card, idx) => {
                      const isDroppedCard =
                        droppedCard &&
                        card.value === droppedCard.value &&
                        card.suit === droppedCard.suit;
                      return (
                        <div
                          key={`${card.value}-${card.suit}-${idx}`}
                          style={{
                            border: isDroppedCard
                              ? '3px solid #dc3545'
                              : 'none',
                            borderRadius: '8px',
                            padding: isDroppedCard ? '2px' : '0',
                            backgroundColor: isDroppedCard
                              ? 'rgba(220, 53, 69, 0.2)'
                              : 'transparent',
                            boxShadow: isDroppedCard
                              ? '0 0 15px rgba(220, 53, 69, 0.8)'
                              : 'none',
                          }}>
                          <CardComponent card={card} disabled />
                        </div>
                      );
                    })}
                  </div>
                  {droppedCard && (
                    <div
                      style={{
                        marginTop: '10px',
                        fontSize: '12px',
                        color: '#dc3545',
                        fontWeight: 'bold',
                      }}>
                      Dropping: {droppedCard.value} of {droppedCard.suit}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer
        style={{
          backgroundColor: '#1a1a1a',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
        <div className='w-100 text-center'>
          <small style={{ color: '#999' }}>
            This modal will auto-dismiss in a few seconds...
          </small>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default FightModal;
