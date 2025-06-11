#!/usr/bin/env python3

import boto3
import uuid
import argparse
from datetime import datetime, UTC
from typing import Optional, Tuple

def create_sponsor(
    dynamodb_client,
    table_name: str,
    sponsor_name: str
) -> str:
    """
    Create a new sponsor metadata item in DynamoDB.
    Returns the generated sponsor ID.
    """
    sponsor_id = str(uuid.uuid4())
    short_id = str(uuid.uuid4())[:8]  # Generate a short ID for easier reference
    
    # Create the sponsor metadata item
    metadata_item = {
        'PK': f'SPONSOR#{sponsor_id}',
        'SK': 'METADATA',
        'type': 'SPONSOR',
        'name': sponsor_name,
        'createdAt': datetime.now(UTC).isoformat(),
        'updatedAt': datetime.now(UTC).isoformat()
    }
    
    dynamodb_client.put_item(
        TableName=table_name,
        Item={k: {'S': v} if isinstance(v, str) else v for k, v in metadata_item.items()}
    )
    
    return sponsor_id, short_id

def get_user_by_short_id(
    dynamodb_client,
    table_name: str,
    short_id: str
) -> Tuple[str, str]:
    """
    Look up a user by their short_id in DynamoDB.
    Returns a tuple of (user_id, cognito_sub).
    """
    query_params = {
        'TableName': table_name,
        'IndexName': 'short_id-index',
        'KeyConditionExpression': 'short_id = :short_id',
        'ExpressionAttributeValues': {
            ':short_id': {'S': short_id}
        },
        'Limit': 1
    }
    
    response = dynamodb_client.query(**query_params)
    
    if not response.get('Items'):
        raise ValueError(f"No user found with short_id: {short_id}")
    
    user_item = response['Items'][0]
    user_id = user_item['PK']['S'].split('#')[1]
    cognito_sub = user_item.get('cognito_sub', {}).get('S')
    
    if not cognito_sub:
        raise ValueError(f"User {user_id} has no cognito_sub attribute")
    
    return user_id, cognito_sub

def associate_user_with_sponsor(
    dynamodb_client,
    cognito_client,
    table_name: str,
    user_pool_id: str,
    sponsor_id: str,
    short_id: str,
    message: Optional[str] = None
):
    """
    Associate a user with a sponsor by creating the necessary DynamoDB items
    and adding them to the Sponsors group in Cognito.
    """
    # First, look up the user by short_id
    user_id, cognito_sub = get_user_by_short_id(dynamodb_client, table_name, short_id)
    print(f"Found user with ID: {user_id} and cognito_sub: {cognito_sub}")

    # Add user to Sponsors group in Cognito
    try:
        cognito_client.admin_add_user_to_group(
            UserPoolId=user_pool_id,
            Username=cognito_sub,
            GroupName='Sponsors'
        )
        print(f"Added user {cognito_sub} to Sponsors group")
    except cognito_client.exceptions.UserNotFoundException:
        print(f"Warning: User {cognito_sub} not found in Cognito")
    except cognito_client.exceptions.GroupNotFoundException:
        print(f"Warning: Sponsors group not found in Cognito user pool")
    except Exception as e:
        print(f"Warning: Failed to add user to Sponsors group: {str(e)}")

    # Create the user->sponsor relationship
    user_sponsor_item = {
        'PK': {'S': f'USER#{user_id}'},
        'SK': {'S': f'SPONSOR#{sponsor_id}'},
        'type': {'S': 'USER_SPONSOR'},
        'createdAt': {'S': datetime.now(UTC).isoformat()},
        'updatedAt': {'S': datetime.now(UTC).isoformat()}
    }
    
    if message:
        user_sponsor_item['message'] = {'S': message}
    
    dynamodb_client.put_item(
        TableName=table_name,
        Item=user_sponsor_item
    )

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Sponsor management commands')
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # Create sponsor command
    create_parser = subparsers.add_parser('create', help='Create a new sponsor')
    create_parser.add_argument('--table-name', required=True, help='DynamoDB table name')
    create_parser.add_argument('--sponsor-name', required=True, help='Sponsor name')
    
    # Associate user command
    associate_parser = subparsers.add_parser('associate', help='Associate a user with a sponsor')
    associate_parser.add_argument('--table-name', required=True, help='DynamoDB table name')
    associate_parser.add_argument('--user-pool-id', required=True, help='Cognito User Pool ID')
    associate_parser.add_argument('--sponsor-id', required=True, help='Sponsor ID to associate with')
    associate_parser.add_argument('--short-id', required=True, help='User short_id to look up')
    associate_parser.add_argument('--message', help='Optional message for the association')
    
    args = parser.parse_args()
    
    if args.command == 'create':
        dynamodb = boto3.client('dynamodb')
        sponsor_id, short_id = create_sponsor(
            dynamodb,
            args.table_name,
            args.sponsor_name
        )
        print(f"Created sponsor with ID: {sponsor_id}")
        print(f"Short ID: {short_id}")
    elif args.command == 'associate':
        dynamodb = boto3.client('dynamodb')
        cognito = boto3.client('cognito-idp')
        associate_user_with_sponsor(
            dynamodb,
            cognito,
            args.table_name,
            args.user_pool_id,
            args.sponsor_id,
            args.short_id,
            args.message
        )
        print(f"Associated user with sponsor {args.sponsor_id}")
    else:
        parser.print_help() 