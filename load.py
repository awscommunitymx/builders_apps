#!/usr/bin/env python3
"""
Eventbrite API to Step Function Integration Script

This script fetches attendees from Eventbrite API and sends events to AWS Step Functions.
It supports pagination, progress tracking, and dry-run mode.
"""

import json
import requests
import boto3
import time
import argparse
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('eventbrite_processor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class EventbriteProcessor:
    def __init__(self, 
                 eventbrite_token: str,
                 step_function_arn: str,
                 progress_file: str = 'progress.json',
                 dry_run: bool = False):
        """
        Initialize the Eventbrite processor
        
        Args:
            eventbrite_token: Bearer token for Eventbrite API
            step_function_arn: ARN of the AWS Step Function
            progress_file: File to store progress information
            dry_run: If True, don't actually send to Step Functions
        """
        self.eventbrite_token = eventbrite_token
        self.step_function_arn = step_function_arn
        self.progress_file = progress_file
        self.dry_run = dry_run
        
        # Eventbrite API configuration
        self.base_url = "https://www.eventbriteapi.com/v3/events/1263605089839/attendees/"
        self.headers = {
            'Authorization': f'Bearer {self.eventbrite_token}',
            'Content-Type': 'application/json'
        }
        
        # AWS Step Functions client
        if not dry_run:
            self.sf_client = boto3.client('stepfunctions')
        
        # Webhook configuration
        self.webhook_config = {
            "webhook_id": "14293353",
            "endpoint_url": "https://sebastianmarines.free.beeceptor.com",
            "user_id": "1715983222873"
        }
        
        # Load progress
        self.progress = self.load_progress()
    
    def load_progress(self) -> Dict:
        """Load progress from file or create new progress tracking"""
        try:
            if os.path.exists(self.progress_file):
                with open(self.progress_file, 'r') as f:
                    progress = json.load(f)
                logger.info(f"Loaded progress: {progress['processed_attendees']} attendees processed")
                return progress
        except Exception as e:
            logger.warning(f"Could not load progress file: {e}")
        
        # Default progress structure
        return {
            "processed_attendees": 0,
            "last_continuation": None,
            "last_run_date": None,
            "target_attendees": 400
        }
    
    def save_progress(self):
        """Save current progress to file"""
        self.progress["last_run_date"] = datetime.now().isoformat()
        try:
            with open(self.progress_file, 'w') as f:
                json.dump(self.progress, f, indent=2)
            logger.info(f"Progress saved: {self.progress['processed_attendees']} attendees processed")
        except Exception as e:
            logger.error(f"Could not save progress: {e}")
    
    def fetch_attendees(self, continuation: Optional[str] = None) -> Tuple[List[Dict], Optional[str]]:
        """
        Fetch attendees from Eventbrite API
        
        Args:
            continuation: Continuation token for pagination
            
        Returns:
            Tuple of (attendees_list, next_continuation)
        """
        url = self.base_url
        if continuation:
            url += f"?continuation={continuation}"
        
        try:
            logger.info(f"Fetching attendees from: {url}")
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            
            data = response.json()
            attendees = data.get('attendees', [])
            
            # Get next continuation
            pagination = data.get('pagination', {})
            next_continuation = pagination.get('continuation') if pagination.get('has_more_items') else None
            
            logger.info(f"Fetched {len(attendees)} attendees. Has more: {pagination.get('has_more_items', False)}")
            return attendees, next_continuation
            
        except requests.RequestException as e:
            logger.error(f"Error fetching attendees: {e}")
            raise
    
    def create_order_event(self, attendee: Dict) -> Dict:
        """Create order.placed event payload"""
        return {
            "api_url": f"https://www.eventbriteapi.com/v3/orders/{attendee['order_id']}/",
            "config": {
                **self.webhook_config,
                "action": "order.placed"
            }
        }
    
    def create_attendee_event(self, attendee: Dict) -> Dict:
        """Create attendee.updated event payload"""
        return {
            "config": {
                **self.webhook_config,
                "action": "attendee.updated"
            },
            "api_url": f"https://www.eventbriteapi.com/v3/events/1263605089839/attendees/{attendee['id']}/"
        }
    
    def send_to_step_function(self, event_data: Dict, event_type: str, attendee_id: str) -> bool:
        """
        Send event to Step Function
        
        Args:
            event_data: Event payload
            event_type: Type of event (order.placed or attendee.updated)
            attendee_id: Attendee ID for logging
            
        Returns:
            True if successful, False otherwise
        """
        if self.dry_run:
            logger.info(f"[DRY RUN] Would send {event_type} event for attendee {attendee_id}")
            logger.debug(f"[DRY RUN] Payload: {json.dumps(event_data, indent=2)}")
            return True
        
        try:
            response = self.sf_client.start_execution(
                stateMachineArn=self.step_function_arn,
                name=f"{event_type}-{attendee_id}-{int(time.time())}",
                input=json.dumps(event_data)
            )
            logger.info(f"Sent {event_type} event for attendee {attendee_id}. Execution ARN: {response['executionArn']}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending {event_type} event for attendee {attendee_id}: {e}")
            return False
    
    def process_attendee(self, attendee: Dict) -> bool:
        """
        Process a single attendee by sending both order.placed and attendee.updated events
        
        Args:
            attendee: Attendee data from Eventbrite
            
        Returns:
            True if both events were sent successfully
        """
        attendee_id = attendee['id']
        order_id = attendee['order_id']
        
        logger.info(f"Processing attendee {attendee_id} (order: {order_id})")
        
        # Create events
        order_event = self.create_order_event(attendee)
        attendee_event = self.create_attendee_event(attendee)
        
        # Send order.placed event first
        if not self.send_to_step_function(order_event, "order.placed", attendee_id):
            return False
        
        # Wait a bit before sending the second event (in real execution)
        if not self.dry_run:
            time.sleep(1)  # 1 second delay between events
        
        # Send attendee.updated event
        if not self.send_to_step_function(attendee_event, "attendee.updated", attendee_id):
            return False
        
        return True
    
    def run(self, target_attendees: int = 400):
        """
        Main execution method
        
        Args:
            target_attendees: Number of attendees to process in this run
        """
        logger.info(f"Starting Eventbrite processor ({'DRY RUN' if self.dry_run else 'LIVE MODE'})")
        logger.info(f"Target attendees for this run: {target_attendees}")
        logger.info(f"Previously processed: {self.progress['processed_attendees']}")
        
        remaining_to_process = target_attendees
        continuation = self.progress.get('last_continuation')
        processed_in_this_run = 0
        
        try:
            while remaining_to_process > 0:
                # Fetch attendees
                attendees, next_continuation = self.fetch_attendees(continuation)
                
                if not attendees:
                    logger.info("No more attendees to process")
                    break
                
                # Process attendees
                for attendee in attendees:
                    if remaining_to_process <= 0:
                        break
                    
                    if self.process_attendee(attendee):
                        self.progress['processed_attendees'] += 1
                        processed_in_this_run += 1
                        remaining_to_process -= 1
                        
                        # Save progress every 10 attendees
                        if processed_in_this_run % 10 == 0:
                            self.progress['last_continuation'] = next_continuation
                            self.save_progress()
                            logger.info(f"Processed {processed_in_this_run} attendees in this run")
                    else:
                        logger.error(f"Failed to process attendee {attendee['id']}")
                
                # Update continuation for next batch
                continuation = next_continuation
                if not continuation:
                    logger.info("Reached end of attendees list")
                    break
                
                # Small delay between API calls
                if not self.dry_run:
                    time.sleep(2)
        
        except KeyboardInterrupt:
            logger.info("Process interrupted by user")
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
        finally:
            # Save final progress
            self.progress['last_continuation'] = continuation
            self.save_progress()
            
            logger.info(f"Run completed. Processed {processed_in_this_run} attendees in this run.")
            logger.info(f"Total processed: {self.progress['processed_attendees']} attendees")

def main():
    parser = argparse.ArgumentParser(description='Process Eventbrite attendees and send to Step Functions')
    parser.add_argument('--eventbrite-token', required=True, help='Eventbrite API bearer token')
    parser.add_argument('--step-function-arn', required=True, help='AWS Step Function ARN')
    parser.add_argument('--target-attendees', type=int, default=400, help='Number of attendees to process')
    parser.add_argument('--progress-file', default='progress.json', help='Progress tracking file')
    parser.add_argument('--dry-run', action='store_true', help='Run in dry-run mode (no actual Step Function calls)')
    parser.add_argument('--reset-progress', action='store_true', help='Reset progress and start from beginning')
    
    args = parser.parse_args()
    
    # Reset progress if requested
    if args.reset_progress:
        if os.path.exists(args.progress_file):
            os.remove(args.progress_file)
            logger.info("Progress file reset")
    
    # Initialize processor
    processor = EventbriteProcessor(
        eventbrite_token=args.eventbrite_token,
        step_function_arn=args.step_function_arn,
        progress_file=args.progress_file,
        dry_run=args.dry_run
    )
    
    # Run processor
    processor.run(target_attendees=args.target_attendees)

if __name__ == "__main__":
    main()