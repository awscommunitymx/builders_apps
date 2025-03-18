import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

// Get table name from command line arguments or use default
const args = process.argv.slice(2);
const tableNameArg = args.find((arg) => arg.startsWith('--table='))?.split('=')[1];
const tableName = tableNameArg || process.env.TABLE_NAME || 'ProfilesTable';

// Initialize DynamoDB client
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Sample users data
const users = [
  {
    PK: 'USER#user1',
    SK: 'PROFILE#user1',
    user_id: 'user1',
    short_id: 'abc123',
    pin: '1234',
    name: 'John Doe',
    email: 'john@example.com',
    created_at: new Date().toISOString(),
  },
  {
    PK: 'USER#user2',
    SK: 'PROFILE#user2',
    user_id: 'user2',
    short_id: 'def456',
    pin: '5678',
    name: 'Jane Smith',
    email: 'jane@example.com',
    created_at: new Date().toISOString(),
  },
  {
    PK: 'USER#user3',
    SK: 'PROFILE#user3',
    user_id: 'user3',
    short_id: 'ghi789',
    pin: '9012',
    name: 'Bob Wilson',
    email: 'bob@example.com',
    created_at: new Date().toISOString(),
  },
];

// Sample profile views data
const profileViews = [
  {
    PK: 'VIEW#user1',
    SK: 'PROFILE#user2',
    timestamp: new Date().toISOString(),
    viewer_id: 'user1',
    viewed_id: 'user2',
  },
  {
    PK: 'VIEW#user2',
    SK: 'PROFILE#user1',
    timestamp: new Date().toISOString(),
    viewer_id: 'user2',
    viewed_id: 'user1',
  },
  {
    PK: 'VIEW#user3',
    SK: 'PROFILE#user1',
    timestamp: new Date().toISOString(),
    viewer_id: 'user3',
    viewed_id: 'user1',
  },
];

async function populateTable() {
  try {
    console.log('Starting to populate DynamoDB table...');

    // Insert users
    for (const user of users) {
      const params = {
        TableName: tableName,
        Item: user,
      };
      await docClient.send(new PutCommand(params));
      console.log(`Added user: ${user.user_id}`);
    }

    // Insert profile views
    for (const view of profileViews) {
      const params = {
        TableName: tableName,
        Item: view,
      };
      await docClient.send(new PutCommand(params));
      console.log(`Added profile view: ${view.viewer_id} -> ${view.viewed_id}`);
    }

    console.log('Successfully populated DynamoDB table!');
  } catch (error) {
    console.error('Error populating DynamoDB table:', error);
    throw error;
  }
}

// Run the script
populateTable();
