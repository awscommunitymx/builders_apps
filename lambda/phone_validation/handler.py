import json
import logging
from typing import Dict, Any
from phone_validator import clean_and_validate_phone, get_clean_phone

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda handler for phone number validation.
    
    This handler is designed to work with Step Functions and accepts
    a phone number for validation using the phone_validator module.
    
    Args:
        event: Lambda event containing the phone number to validate
        context: Lambda context object
        
    Returns:
        Dict containing validation results and status information
    """
    
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Extract phone number from event
        # Support multiple input formats for flexibility
        phone_number = None
        
        if isinstance(event, dict):
            # Try different common field names
            phone_number = (
                event.get('phone') or 
                event.get('phoneNumber') or 
                event.get('phone_number') or
                event.get('telephone') or
                event.get('mobile')
            )
            
            # If phone is nested in a data object (common in Step Functions)
            if not phone_number and 'data' in event:
                data = event['data']
                if isinstance(data, dict):
                    phone_number = (
                        data.get('phone') or 
                        data.get('phoneNumber') or 
                        data.get('phone_number') or
                        data.get('telephone') or
                        data.get('mobile')
                    )
        
        # If event is just a string, treat it as the phone number
        if not phone_number and isinstance(event, str):
            phone_number = event

        if not phone_number and isinstance(event, int):
            phone_number = str(event)
            
        if not phone_number:
            logger.warning("No phone number found in event")
            return {
                'statusCode': 400,
                'success': False,
                'error': 'MISSING_PHONE_NUMBER',
                'message': 'No phone number provided in the request',
                'validation_result': None,
                'original_event': event
            }
        
        logger.info(f"Processing phone number: {phone_number}")
        
        # Validate the phone number using our validator
        validation_result = clean_and_validate_phone(phone_number)
        
        # Get clean phone for easy access
        clean_phone = get_clean_phone(phone_number)
        
        # Determine success status
        success = validation_result['is_valid']
        status_code = 200 if success else 422  # 422 for validation errors
        
        # Build response
        response = {
            'statusCode': status_code,
            'success': success,
            'validation_result': validation_result,
            'clean_phone': clean_phone,
            'original_phone': phone_number
        }
        
        # Add appropriate message based on validation status
        if success:
            response['message'] = 'Phone number successfully validated and formatted'
        else:
            response['message'] = f"Phone number validation failed: {validation_result.get('notes', 'Unknown error')}"
            response['error'] = validation_result.get('status', 'VALIDATION_FAILED')
        
        # Log the result
        if success:
            logger.info(f"Phone validation successful: {phone_number} -> {clean_phone}")
        else:
            logger.warning(f"Phone validation failed: {phone_number} - {validation_result.get('notes')}")
        
        return response
        
    except Exception as e:
        logger.error(f"Unexpected error processing phone validation: {str(e)}", exc_info=True)
        
        return {
            'statusCode': 500,
            'success': False,
            'error': 'INTERNAL_ERROR',
            'message': f'Internal error during phone validation: {str(e)}',
            'validation_result': None,
            'original_event': event
        }

def validate_phone_batch(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Alternative handler for batch phone validation.
    
    Processes multiple phone numbers in a single request.
    Useful for bulk validation scenarios.
    
    Args:
        event: Lambda event containing array of phone numbers
        context: Lambda context object
        
    Returns:
        Dict containing batch validation results
    """
    
    try:
        logger.info(f"Received batch validation event: {json.dumps(event)}")
        
        # Extract phone numbers array
        phone_numbers = event.get('phones', [])
        
        if not phone_numbers or not isinstance(phone_numbers, list):
            return {
                'statusCode': 400,
                'success': False,
                'error': 'INVALID_INPUT',
                'message': 'Expected array of phone numbers in "phones" field',
                'results': []
            }
        
        results = []
        valid_count = 0
        
        for i, phone in enumerate(phone_numbers):
            try:
                validation_result = clean_and_validate_phone(phone)
                clean_phone = get_clean_phone(phone)
                
                result = {
                    'index': i,
                    'original_phone': phone,
                    'validation_result': validation_result,
                    'clean_phone': clean_phone,
                    'is_valid': validation_result['is_valid']
                }
                
                results.append(result)
                
                if validation_result['is_valid']:
                    valid_count += 1
                    
            except Exception as e:
                logger.error(f"Error validating phone at index {i}: {phone} - {str(e)}")
                results.append({
                    'index': i,
                    'original_phone': phone,
                    'validation_result': None,
                    'clean_phone': None,
                    'is_valid': False,
                    'error': str(e)
                })
        
        total_count = len(phone_numbers)
        
        return {
            'statusCode': 200,
            'success': True,
            'message': f'Batch validation completed: {valid_count}/{total_count} valid numbers',
            'results': results,
            'summary': {
                'total_processed': total_count,
                'valid_count': valid_count,
                'invalid_count': total_count - valid_count,
                'success_rate': round((valid_count / total_count) * 100, 2) if total_count > 0 else 0
            }
        }
        
    except Exception as e:
        logger.error(f"Unexpected error in batch validation: {str(e)}", exc_info=True)
        
        return {
            'statusCode': 500,
            'success': False,
            'error': 'INTERNAL_ERROR',
            'message': f'Internal error during batch validation: {str(e)}',
            'results': []
        }

# For testing locally
if __name__ == "__main__":
    # Test cases for the lambda handler
    test_events = [
        # Standard format
        {"phone": "55 1234-5678"},
        
        # Different field names
        {"phoneNumber": "+52 55 1234 5678"},
        {"phone_number": "525512345678"},
        
        # Nested in data object (Step Functions style)
        {"data": {"phone": "5512345678"}},
        
        # String input
        "55 1234-5678",
        
        # Invalid cases
        {"phone": ""},
        {"phone": None},
        {"other_field": "value"},
        
        # Batch test
        {
            "phones": [
                "55 1234-5678",
                "+52 55 1234 5678",
                "invalid",
                "1 555 123 4567"
            ]
        }
    ]
    
    print("🧪 TESTING LAMBDA HANDLER")
    print("=" * 60)
    
    for i, test_event in enumerate(test_events[:-1], 1):  # Skip batch test for individual handler
        print(f"\n{i}. Testing event: {test_event}")
        
        try:
            result = lambda_handler(test_event, None)
            print(f"   Result: {json.dumps(result, indent=2)}")
        except Exception as e:
            print(f"   Error: {e}")
        
        print("-" * 40)
    
    # Test batch handler
    print(f"\n{len(test_events)}. Testing batch validation:")
    try:
        batch_result = validate_phone_batch(test_events[-1], None)
        print(f"   Batch Result: {json.dumps(batch_result, indent=2)}")
    except Exception as e:
        print(f"   Batch Error: {e}")