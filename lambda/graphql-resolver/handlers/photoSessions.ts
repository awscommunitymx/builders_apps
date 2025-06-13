import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, DeleteCommand, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { AppSyncIdentityCognito } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';

const logger = new Logger({ serviceName: 'photo-sessions' });
const tracer = new Tracer({ serviceName: 'photo-sessions' });

const dynamoClient = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.TABLE_NAME!;

// Photo sessions: 11:30 AM to 5:00 PM in 15-minute blocks
// 11:30, 11:45, 12:00, 12:15, 12:30, 12:45, 1:00, 1:15, 1:30, 1:45, 2:00, 2:15, 2:30, 2:45, 3:00, 3:15, 3:30, 3:45, 4:00, 4:15, 4:30, 4:45
const PHOTO_SESSION_SLOTS = [
  '11:30', '11:45', '12:00', '12:15', '12:30', '12:45',
  '13:00', '13:15', '13:30', '13:45', '14:00', '14:15',
  '14:30', '14:45', '15:00', '15:15', '15:30', '15:45',
  '16:00', '16:15', '16:30', '16:45'
];

const MAX_SPOTS_PER_SLOT = 10;

interface PhotoReservation {
  user_id: string;
  name: string;
  email?: string;
  cell_phone?: string;
  timeSlot: string;
  date: string;
  reservedAt: string;
}

interface PhotoSession {
  timeSlot: string;
  date: string;
  availableSpots: number;
  totalSpots: number;
  reservations: PhotoReservation[];
}

export async function getAvailablePhotoSessions(date: string): Promise<PhotoSession[]> {
  logger.info('Getting available photo sessions', { date });

  const sessions: PhotoSession[] = [];

  for (const timeSlot of PHOTO_SESSION_SLOTS) {
    try {
      // Query reservations for this time slot
      const reservations = await getReservationsForSlot(timeSlot, date);
      
      sessions.push({
        timeSlot,
        date,
        availableSpots: MAX_SPOTS_PER_SLOT - reservations.length,
        totalSpots: MAX_SPOTS_PER_SLOT,
        reservations
      });
    } catch (error) {
      logger.error('Error getting reservations for slot', { timeSlot, date, error });
      // Return empty session if there's an error
      sessions.push({
        timeSlot,
        date,
        availableSpots: MAX_SPOTS_PER_SLOT,
        totalSpots: MAX_SPOTS_PER_SLOT,
        reservations: []
      });
    }
  }

  return sessions;
}

export async function getMyPhotoReservation(identity: AppSyncIdentityCognito): Promise<PhotoReservation | null> {
  logger.info('Getting user photo reservation', { userId: identity.sub });

  try {
    const response = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${identity.sub}`,
        SK: 'PHOTO_RESERVATION'
      }
    }));

    if (!response.Item) {
      return null;
    }

    return {
      user_id: response.Item.user_id,
      name: response.Item.name,
      email: response.Item.email,
      cell_phone: response.Item.cell_phone,
      timeSlot: response.Item.timeSlot,
      date: response.Item.date,
      reservedAt: response.Item.reservedAt
    };
  } catch (error) {
    logger.error('Error getting user photo reservation', { userId: identity.sub, error });
    throw new Error('Error al obtener la reserva de sesión de fotos');
  }
}

export async function getPhotoSessionReservations(timeSlot: string, date: string): Promise<PhotoReservation[]> {
  logger.info('Getting photo session reservations', { timeSlot, date });
  return await getReservationsForSlot(timeSlot, date);
}

export async function reservePhotoSession(
  identity: AppSyncIdentityCognito,
  timeSlot: string,
  date: string
): Promise<{ success: boolean; message: string; reservation?: PhotoReservation }> {
  logger.info('Reserving photo session', { userId: identity.sub, timeSlot, date });

  // Validate time slot
  if (!PHOTO_SESSION_SLOTS.includes(timeSlot)) {
    return {
      success: false,
      message: 'Horario inválido'
    };
  }

  try {
    // Check if user already has a reservation
    const existingReservation = await getMyPhotoReservation(identity);
    if (existingReservation) {
      return {
        success: false,
        message: 'Ya tienes una reserva para sesión de fotos'
      };
    }

    // Get user profile for name and contact info
    const userProfile = await getUserProfile(identity.sub);
    if (!userProfile) {
      return {
        success: false,
        message: 'Perfil de usuario no encontrado'
      };
    }

    const reservation: PhotoReservation = {
      user_id: identity.sub,
      name: userProfile.name,
      email: userProfile.email,
      cell_phone: userProfile.cell_phone,
      timeSlot,
      date,
      reservedAt: new Date().toISOString()
    };

    // Use atomic transaction to ensure we don't exceed capacity
    // First, check current reservations count
    const currentReservations = await getReservationsForSlot(timeSlot, date);
    if (currentReservations.length >= MAX_SPOTS_PER_SLOT) {
      return {
        success: false,
        message: 'Este horario está completamente reservado'
      };
    }

    // Create reservation with conditional write to prevent double booking
    await docClient.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: `USER#${identity.sub}`,
              SK: 'PHOTO_RESERVATION',
              ...reservation,
              GSI1PK: `PHOTO_SESSION#${date}#${timeSlot}`,
              GSI1SK: `USER#${identity.sub}`
            },
            ConditionExpression: 'attribute_not_exists(PK)'
          }
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: `PHOTO_SESSION#${date}#${timeSlot}`,
              SK: `USER#${identity.sub}`,
              ...reservation,
              GSI1PK: `USER#${identity.sub}`,
              GSI1SK: 'PHOTO_RESERVATION'
            },
            ConditionExpression: 'attribute_not_exists(PK)'
          }
        }
      ]
    }));

    logger.info('Photo session reserved successfully', { userId: identity.sub, timeSlot, date });

    return {
      success: true,
      message: 'Sesión de fotos reservada exitosamente',
      reservation
    };

  } catch (error: any) {
    if (error.name === 'TransactionCanceledException') {
      return {
        success: false,
        message: 'Este horario ya no está disponible o ya tienes una reserva'
      };
    }

    logger.error('Error reserving photo session', { userId: identity.sub, timeSlot, date, error });
    return {
      success: false,
      message: 'Error al reservar sesión de fotos. Por favor intenta de nuevo.'
    };
  }
}

export async function cancelPhotoReservation(
  identity: AppSyncIdentityCognito
): Promise<{ success: boolean; message: string }> {
  logger.info('Canceling photo reservation', { userId: identity.sub });

  try {
    // Get existing reservation
    const existingReservation = await getMyPhotoReservation(identity);
    if (!existingReservation) {
      return {
        success: false,
        message: 'No se encontró reserva de sesión de fotos'
      };
    }

    // Delete reservation using transaction
    await docClient.send(new TransactWriteCommand({
      TransactItems: [
        {
          Delete: {
            TableName: TABLE_NAME,
            Key: {
              PK: `USER#${identity.sub}`,
              SK: 'PHOTO_RESERVATION'
            }
          }
        },
        {
          Delete: {
            TableName: TABLE_NAME,
            Key: {
              PK: `PHOTO_SESSION#${existingReservation.date}#${existingReservation.timeSlot}`,
              SK: `USER#${identity.sub}`
            }
          }
        }
      ]
    }));

    logger.info('Photo reservation canceled successfully', { userId: identity.sub });

    return {
      success: true,
      message: 'Reserva de sesión de fotos cancelada exitosamente'
    };

  } catch (error) {
    logger.error('Error canceling photo reservation', { userId: identity.sub, error });
    return {
      success: false,
      message: 'Error al cancelar la reserva de sesión de fotos. Por favor intenta de nuevo.'
    };
  }
}

async function getReservationsForSlot(timeSlot: string, date: string): Promise<PhotoReservation[]> {
  try {
    const response = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `PHOTO_SESSION#${date}#${timeSlot}`
      }
    }));

    return (response.Items || []).map(item => ({
      user_id: item.user_id,
      name: item.name,
      email: item.email,
      cell_phone: item.cell_phone,
      timeSlot: item.timeSlot,
      date: item.date,
      reservedAt: item.reservedAt
    }));
  } catch (error) {
    logger.error('Error getting reservations for slot', { timeSlot, date, error });
    return [];
  }
}

async function getUserProfile(userId: string): Promise<{ name: string; email?: string; cell_phone?: string } | null> {
  try {
    const response = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'cognito_sub-index',
      KeyConditionExpression: 'cognito_sub = :sub',
      ExpressionAttributeValues: {
        ':sub': userId
      },
      Limit: 1
    }));

    if (!response.Items || response.Items.length === 0) {
      return null;
    }

    const userItem = response.Items[0];
    return {
      name: userItem.name,
      email: userItem.email,
      cell_phone: userItem.cell_phone
    };
  } catch (error) {
    logger.error('Error getting user profile', { userId, error });
    return null;
  }
}