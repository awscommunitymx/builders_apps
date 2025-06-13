# Photo Session Scheduling - DynamoDB Schema

This document describes the DynamoDB schema used for the photo session scheduling feature.

## Overview

The photo session scheduling system uses a single DynamoDB table with multiple access patterns through primary key (PK/SK) and Global Secondary Index (GSI1PK/GSI1SK) design.

## Time Slots

- **Available Time Slots**: 22 slots from 11:30 AM to 4:45 PM
- **Duration**: 15 minutes per slot
- **Capacity**: 10 people maximum per slot
- **Format**: 24-hour format (e.g., "11:30", "13:00", "16:45")

## Table Structure

### Primary Table Access Patterns

#### 1. User Photo Reservation Record
```
PK: USER#{user_id}
SK: PHOTO_RESERVATION
```

**Attributes:**
- `user_id` (String): Cognito user ID
- `name` (String): User's full name
- `email` (String, Optional): User's email address
- `cell_phone` (String, Optional): User's phone number for WhatsApp reminders
- `timeSlot` (String): Time slot (e.g., "11:30", "14:15")
- `date` (String): Date in YYYY-MM-DD format
- `reservedAt` (String): ISO timestamp of when reservation was made
- `GSI1PK` (String): `PHOTO_SESSION#{date}#{timeSlot}`
- `GSI1SK` (String): `USER#{user_id}`

**Use Case:** Query user's current reservation

#### 2. Photo Session Slot Record
```
PK: PHOTO_SESSION#{date}#{timeSlot}
SK: USER#{user_id}
```

**Attributes:**
- `user_id` (String): Cognito user ID
- `name` (String): User's full name
- `email` (String, Optional): User's email address
- `cell_phone` (String, Optional): User's phone number for WhatsApp reminders
- `timeSlot` (String): Time slot (e.g., "11:30", "14:15")
- `date` (String): Date in YYYY-MM-DD format
- `reservedAt` (String): ISO timestamp of when reservation was made
- `GSI1PK` (String): `USER#{user_id}`
- `GSI1SK` (String): `PHOTO_RESERVATION`

**Use Case:** Query all reservations for a specific time slot

## Access Patterns

### 1. Get User's Current Reservation
```typescript
// Query: Does user have a reservation?
PK = "USER#{user_id}" AND SK = "PHOTO_RESERVATION"
```

### 2. Get All Reservations for a Time Slot
```typescript
// Query: Who is booked for 2:30 PM on 2024-01-15?
PK = "PHOTO_SESSION#2024-01-15#14:30"
```

### 3. Get Available Time Slots for a Date
```typescript
// For each time slot (11:30 through 16:45):
//   Query PK = "PHOTO_SESSION#{date}#{timeSlot}"
//   Count results to determine availability (10 - count = available spots)
```

## Atomic Operations

### Reserve Photo Session
Uses DynamoDB `TransactWriteCommand` with two operations:
1. **Put** user reservation record (with condition: attribute_not_exists)
2. **Put** session slot record (with condition: attribute_not_exists)

This ensures:
- User cannot double-book
- Slot capacity cannot be exceeded
- Operations are atomic (all succeed or all fail)

### Cancel Photo Session
Uses DynamoDB `TransactWriteCommand` with two operations:
1. **Delete** user reservation record
2. **Delete** session slot record

## Example Data

### User Reservation Record
```json
{
  "PK": "USER#123e4567-e89b-12d3-a456-426614174000",
  "SK": "PHOTO_RESERVATION",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "cell_phone": "+1234567890",
  "timeSlot": "14:30",
  "date": "2024-01-15",
  "reservedAt": "2024-01-10T10:30:00.000Z",
  "GSI1PK": "PHOTO_SESSION#2024-01-15#14:30",
  "GSI1SK": "USER#123e4567-e89b-12d3-a456-426614174000"
}
```

### Session Slot Record
```json
{
  "PK": "PHOTO_SESSION#2024-01-15#14:30",
  "SK": "USER#123e4567-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "cell_phone": "+1234567890",
  "timeSlot": "14:30",
  "date": "2024-01-15",
  "reservedAt": "2024-01-10T10:30:00.000Z",
  "GSI1PK": "USER#123e4567-e89b-12d3-a456-426614174000",
  "GSI1SK": "PHOTO_RESERVATION"
}
```

## Business Rules

1. **One Reservation Per User**: Each user can only have one active photo session reservation
2. **Capacity Limit**: Maximum 10 people per 15-minute time slot
3. **Time Slot Validation**: Only predefined time slots between 11:30 AM and 4:45 PM are allowed
4. **Atomic Operations**: All reservation and cancellation operations use DynamoDB transactions
5. **Contact Information**: Phone numbers are stored for WhatsApp reminder functionality

## WhatsApp Integration

The system stores user phone numbers (`cell_phone`) to enable WhatsApp reminders:
- Volunteers/sponsors can query `getPhotoSessionReservations(timeSlot, date)` to get contact info
- Phone numbers can be used with WhatsApp Business API for automated reminders
- Contact information is only accessible to authorized user groups (Sponsors, CheckIn volunteers)

## Sample GraphQL Queries

### Query: Get Available Photo Sessions for a Date
```graphql
query GetAvailablePhotoSessions($date: String!) {
  getAvailablePhotoSessions(date: $date) {
    timeSlot
    date
    availableSpots
    totalSpots
    reservations {
      user_id
      name
      email
      cell_phone
      timeSlot
      date
      reservedAt
    }
  }
}
```

**Variables:**
```json
{
  "date": "2024-01-15"
}
```

**Expected Response:**
```json
{
  "data": {
    "getAvailablePhotoSessions": [
      {
        "timeSlot": "11:30",
        "date": "2024-01-15",
        "availableSpots": 8,
        "totalSpots": 10,
        "reservations": [
          {
            "user_id": "123e4567-e89b-12d3-a456-426614174000",
            "name": "John Doe",
            "email": "john.doe@example.com",
            "cell_phone": "+1234567890",
            "timeSlot": "11:30",
            "date": "2024-01-15",
            "reservedAt": "2024-01-10T10:30:00.000Z"
          },
          {
            "user_id": "987fcdeb-51d3-12e8-b456-426614174999",
            "name": "Jane Smith",
            "email": "jane.smith@example.com",
            "cell_phone": "+1987654321",
            "timeSlot": "11:30",
            "date": "2024-01-15",
            "reservedAt": "2024-01-10T11:15:00.000Z"
          }
        ]
      },
      {
        "timeSlot": "11:45",
        "date": "2024-01-15",
        "availableSpots": 10,
        "totalSpots": 10,
        "reservations": []
      }
    ]
  }
}
```

### Query: Get My Photo Reservation
```graphql
query GetMyPhotoReservation {
  getMyPhotoReservation {
    user_id
    name
    email
    cell_phone
    timeSlot
    date
    reservedAt
  }
}
```

**Expected Response (if user has reservation):**
```json
{
  "data": {
    "getMyPhotoReservation": {
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "cell_phone": "+1234567890",
      "timeSlot": "14:30",
      "date": "2024-01-15",
      "reservedAt": "2024-01-10T10:30:00.000Z"
    }
  }
}
```

**Expected Response (if no reservation):**
```json
{
  "data": {
    "getMyPhotoReservation": null
  }
}
```

### Query: Get Reservations for Specific Time Slot (Admin/Volunteers Only)
```graphql
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
```

**Variables:**
```json
{
  "timeSlot": "14:30",
  "date": "2024-01-15"
}
```

**Expected Response:**
```json
{
  "data": {
    "getPhotoSessionReservations": [
      {
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "cell_phone": "+1234567890",
        "timeSlot": "14:30",
        "date": "2024-01-15",
        "reservedAt": "2024-01-10T10:30:00.000Z"
      },
      {
        "user_id": "987fcdeb-51d3-12e8-b456-426614174999",
        "name": "Jane Smith",
        "email": "jane.smith@example.com",
        "cell_phone": "+1987654321",
        "timeSlot": "14:30",
        "date": "2024-01-15",
        "reservedAt": "2024-01-10T11:15:00.000Z"
      }
    ]
  }
}
```

### Mutation: Reserve Photo Session
```graphql
mutation ReservePhotoSession($input: ReservePhotoSessionInput!) {
  reservePhotoSession(input: $input) {
    success
    message
    reservation {
      user_id
      name
      email
      cell_phone
      timeSlot
      date
      reservedAt
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "timeSlot": "14:30",
    "date": "2024-01-15"
  }
}
```

**Expected Response (Success):**
```json
{
  "data": {
    "reservePhotoSession": {
      "success": true,
      "message": "Photo session reserved successfully",
      "reservation": {
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "cell_phone": "+1234567890",
        "timeSlot": "14:30",
        "date": "2024-01-15",
        "reservedAt": "2024-01-10T10:30:00.000Z"
      }
    }
  }
}
```

**Expected Response (Failure - Already Reserved):**
```json
{
  "data": {
    "reservePhotoSession": {
      "success": false,
      "message": "You already have a photo session reservation",
      "reservation": null
    }
  }
}
```

**Expected Response (Failure - Slot Full):**
```json
{
  "data": {
    "reservePhotoSession": {
      "success": false,
      "message": "This time slot is fully booked",
      "reservation": null
    }
  }
}
```

### Mutation: Cancel Photo Reservation
```graphql
mutation CancelPhotoReservation {
  cancelPhotoReservation {
    success
    message
  }
}
```

**Expected Response (Success):**
```json
{
  "data": {
    "cancelPhotoReservation": {
      "success": true,
      "message": "Photo session reservation canceled successfully"
    }
  }
}
```

**Expected Response (Failure - No Reservation):**
```json
{
  "data": {
    "cancelPhotoReservation": {
      "success": false,
      "message": "No photo session reservation found"
    }
  }
}
```

## Authentication Requirements

All photo session operations require Cognito authentication:

- **Attendees**: Can use all queries and mutations for their own reservations
- **Sponsors/Volunteers**: Can additionally use `getPhotoSessionReservations` to view all reservations for a time slot (for sending WhatsApp reminders)

## Error Handling

The API includes comprehensive error handling:

1. **Invalid Time Slot**: Returns error for time slots outside 11:30 AM - 4:45 PM range
2. **Double Booking Prevention**: Atomic transactions prevent race conditions
3. **Capacity Enforcement**: Prevents more than 10 reservations per slot
4. **Authentication Errors**: Proper Cognito group validation
5. **Missing User Profile**: Handles cases where user profile data is incomplete