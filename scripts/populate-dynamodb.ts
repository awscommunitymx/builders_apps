import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { faker } from '@faker-js/faker';

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

// Function to generate users array with faker
const generateUsers = (count: number = 3) => {
  return Array.from({ length: count }, () => {
    const userId = generateRandomNumbers(12);
    const gender = faker.person.sexType();

    return {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
      user_id: userId,
      name: faker.person.fullName({ sex: gender }),
      email: faker.internet.email(),
      cell_phone: faker.phone.number({ style: 'international' }),
      company: faker.company.name(),
      gender: gender === 'male' ? 'Male' : 'Female',
      job_title: faker.person.jobTitle(),
      ticket_class_id: generateRandomNumbers(10),
    };
  });
};

// Generate users data using the function
const users = generateUsers();

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
