#!/usr/bin/env python3

import boto3
import uuid
import argparse
from datetime import datetime, UTC
from typing import Optional

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

def associate_user_with_sponsor(
    dynamodb_client,
    table_name: str,
    sponsor_id: str,
    user_id: str,
    message: Optional[str] = None
):
    """
    Associate a user with a sponsor by creating the necessary DynamoDB items.
    """
    # Create the sponsor->user relationship
    sponsor_user_item = {
        'PK': f'SPONSOR#{sponsor_id}',
        'SK': f'USER#{user_id}',
        'type': 'SPONSOR_USER',
        'lastVisit': datetime.now(UTC).isoformat(),
        'createdAt': datetime.now(UTC).isoformat(),
        'updatedAt': datetime.now(UTC).isoformat()
    }
    
    if message:
        sponsor_user_item['message'] = message
    
    dynamodb_client.put_item(
        TableName=table_name,
        Item={k: {'S': v} if isinstance(v, str) else v for k, v in sponsor_user_item.items()}
    )
    
    # Update the user's sponsorIds list
    dynamodb_client.update_item(
        TableName=table_name,
        Key={
            'PK': {'S': f'USER#{user_id}'},
            'SK': {'S': f'USER#{user_id}'}
        },
        UpdateExpression='SET #sponsorIds = list_append(if_not_exists(#sponsorIds, :empty_list), :sponsorId)',
        ExpressionAttributeNames={
            '#sponsorIds': 'sponsorIds'
        },
        ExpressionAttributeValues={
            ':empty_list': {'L': []},
            ':sponsorId': {'L': [{'S': sponsor_id}]}
        }
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
    associate_parser.add_argument('--sponsor-id', required=True, help='Sponsor ID to associate with')
    associate_parser.add_argument('--user-id', required=True, help='User ID to associate with the sponsor')
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
        associate_user_with_sponsor(
            dynamodb,
            args.table_name,
            args.sponsor_id,
            args.user_id,
            args.message
        )
        print(f"Associated user {args.user_id} with sponsor {args.sponsor_id}")
    else:
        parser.print_help() 