import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

// Get table name from command line arguments or use default
const args = process.argv.slice(2);
const tableNameArg = args.find((arg) => arg.startsWith('--table='))?.split('=')[1];
const tableName = tableNameArg || process.env.TABLE_NAME || 'ProfilesTable';

// Initialize DynamoDB client
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Helper function to generate random numeric string of specific length
const generateRandomNumbers = (length: number): string => {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
};

// Sample users data with updated structure
const users = [
  {
    PK: `USER#${generateRandomNumbers(12)}`,
    SK: 'PROFILE',
    name: 'John Doe',
    email: 'john@example.com',
    cell_phone: '+1234567890',
    company: 'AWS',
    gender: 'Male',
    job_title: 'Solutions Architect',
    ticket_class_id: generateRandomNumbers(10),
  },
  {
    PK: `USER#${generateRandomNumbers(12)}`,
    SK: 'PROFILE',
    name: 'Jane Smith',
    email: 'jane@example.com',
    cell_phone: '+1987654321',
    company: 'Amazon',
    gender: 'Female',
    job_title: 'Software Engineer',
    ticket_class_id: generateRandomNumbers(10),
  },
  {
    PK: `USER#${generateRandomNumbers(12)}`,
    SK: 'PROFILE',
    name: 'Bob Wilson',
    email: 'bob@example.com',
    cell_phone: '+1567891234',
    company: 'AWS Community',
    gender: 'Male',
    job_title: 'Developer Advocate',
    ticket_class_id: generateRandomNumbers(10),
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
      console.log(`Added user: ${user.name}`);
    }

    console.log('Successfully populated DynamoDB table!');
  } catch (error) {
    console.error('Error populating DynamoDB table:', error);
    throw error;
  }
}

// Run the script
populateTable();
