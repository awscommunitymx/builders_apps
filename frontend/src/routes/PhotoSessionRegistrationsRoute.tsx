import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

const GET_PHOTO_SESSION_RESERVATIONS = gql`
  query GetPhotoSessionReservations($timeSlot: String!, $date: String!) {
    getPhotoSessionReservations(timeSlot: $timeSlot, date: $date) {
      user_id
      name
      email
      cell_phone
      timeSlot
      date
      reservedAt
    }
  }
`;

interface PhotoReservation {
  user_id: string;
  name: string;
  email?: string;
  cell_phone?: string;
  timeSlot: string;
  date: string;
  reservedAt: string;
}

const PhotoSessionRegistrationsRoute: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');

  const { data, loading, error } = useQuery(GET_PHOTO_SESSION_RESERVATIONS, {
    variables: { timeSlot: selectedTimeSlot, date: selectedDate },
    skip: !selectedTimeSlot || !selectedDate,
  });

  const timeSlots = [
    '09:00',
    '09:30',
    '10:00',
    '10:30',
    '11:00',
    '11:30',
    '12:00',
    '12:30',
    '13:00',
    '13:30',
    '14:00',
    '14:30',
    '15:00',
    '15:30',
    '16:00',
    '16:30',
    '17:00',
    '17:30',
  ];

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        color: '#d32f2f', 
        background: '#ffebee', 
        borderRadius: '4px',
        textAlign: 'center'
      }}>
        Error: {error.message}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: '#333', marginBottom: '20px' }}>Photo Session Registrations</h1>
      
      <div style={{
        display: 'flex',
        gap: '20px',
        marginBottom: '30px',
        padding: '20px',
        background: '#f5f5f5',
        borderRadius: '8px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label htmlFor="date" style={{ fontWeight: 'bold', color: '#555' }}>Date:</label>
          <input
            type="date"
            id="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label htmlFor="timeSlot" style={{ fontWeight: 'bold', color: '#555' }}>Time Slot:</label>
          <select
            id="timeSlot"
            value={selectedTimeSlot}
            onChange={(e) => setSelectedTimeSlot(e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          >
            <option value="">Select time slot</option>
            {timeSlots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '20px', fontSize: '18px' }}>
          Loading...
        </div>
      )}

      {data && data.getPhotoSessionReservations && (
        <div>
          <h2 style={{ color: '#333', marginBottom: '20px' }}>
            Registrations for {selectedDate} at {selectedTimeSlot}
            <span style={{ color: '#666', fontWeight: 'normal' }}>
              {' '}({data.getPhotoSessionReservations.length})
            </span>
          </h2>
          
          {data.getPhotoSessionReservations.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '20px', fontSize: '18px', color: '#666' }}>
              No registrations found for this time slot.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                background: 'white',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
              }}>
                <thead>
                  <tr>
                    <th style={{
                      padding: '12px 15px',
                      textAlign: 'left',
                      borderBottom: '1px solid #ddd',
                      background: '#f8f9fa',
                      fontWeight: 'bold',
                      color: '#333'
                    }}>
                      Name
                    </th>
                    <th style={{
                      padding: '12px 15px',
                      textAlign: 'left',
                      borderBottom: '1px solid #ddd',
                      background: '#f8f9fa',
                      fontWeight: 'bold',
                      color: '#333'
                    }}>
                      Email
                    </th>
                    <th style={{
                      padding: '12px 15px',
                      textAlign: 'left',
                      borderBottom: '1px solid #ddd',
                      background: '#f8f9fa',
                      fontWeight: 'bold',
                      color: '#333'
                    }}>
                      Phone
                    </th>
                    <th style={{
                      padding: '12px 15px',
                      textAlign: 'left',
                      borderBottom: '1px solid #ddd',
                      background: '#f8f9fa',
                      fontWeight: 'bold',
                      color: '#333'
                    }}>
                      Reserved At
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.getPhotoSessionReservations.map((reservation: PhotoReservation) => (
                    <tr 
                      key={reservation.user_id}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f5f5f5';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                      }}
                    >
                      <td style={{
                        padding: '12px 15px',
                        textAlign: 'left',
                        borderBottom: '1px solid #ddd'
                      }}>
                        {reservation.name}
                      </td>
                      <td style={{
                        padding: '12px 15px',
                        textAlign: 'left',
                        borderBottom: '1px solid #ddd'
                      }}>
                        {reservation.email || 'N/A'}
                      </td>
                      <td style={{
                        padding: '12px 15px',
                        textAlign: 'left',
                        borderBottom: '1px solid #ddd'
                      }}>
                        {reservation.cell_phone || 'N/A'}
                      </td>
                      <td style={{
                        padding: '12px 15px',
                        textAlign: 'left',
                        borderBottom: '1px solid #ddd'
                      }}>
                        {new Date(reservation.reservedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PhotoSessionRegistrationsRoute;