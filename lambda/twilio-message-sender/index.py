import json
import os
import io
import random
import string
import requests
from datetime import datetime
from twilio.rest import Client
import boto3
from botocore.exceptions import ClientError
from PIL import Image, ImageDraw, ImageFont
import qrcode
import qrcode.constants

secret_name = os.environ['TWILIO_SECRET_NAME']

region_name = os.environ.get('AWS_REGION', 'us-east-1')
# Retrieve secrets from AWS Secrets Manager
secrets_client = boto3.client('secretsmanager', region_name=region_name)
s3_client = boto3.client('s3', region_name='us-east-1')  # type: ignore
dynamodb = boto3.resource('dynamodb', region_name=region_name)
welcome_message_table = dynamodb.Table(os.environ.get('WELCOME_MESSAGE_TABLE_NAME', 'welcome_message'))
try:
    get_secret_value_response = secrets_client.get_secret_value(SecretId=secret_name)
    if 'SecretString' in get_secret_value_response:
        secrets = json.loads(get_secret_value_response['SecretString'])
    else:
        raise ValueError("SecretString not found in the response")
except ClientError as e:
    print(f"Error retrieving secret {secret_name}: {str(e)}")
    raise e

account_sid = secrets['account_sid']
auth_token = secrets['auth_token']


def generar_numero_aleatorio(longitud=10):
    """Genera un número aleatorio de la longitud especificada."""
    return ''.join(random.choices(string.digits, k=longitud))


def generar_qr_y_subir_s3(texto_qr, nombre_usuario, email_usuario, texto):
    """
    Genera un código QR localmente usando la librería qrcode, lo coloca sobre una imagen de fondo,
    añade el nombre, email y texto del usuario debajo, lo guarda con un nombre aleatorio,
    lo sube a S3 y genera una URL prefirmada.
    
    Args:
        texto_qr: Texto para generar el código QR
        nombre_usuario: Nombre del usuario para mostrar debajo del QR
        email_usuario: Email del usuario para mostrar debajo del QR
        texto: Texto para mostrar debajo del email
    
    Returns:
        tuple: (nombre_archivo, url_prefirmada)
    """
    # Generar nombre de archivo aleatorio con 10 dígitos
    nombre_aleatorio = generar_numero_aleatorio(10)
    nombre_archivo = f"{nombre_aleatorio}.png"
    
    # Configurar el bucket
    bucket_name = os.environ.get('S3_BUCKET_NAME', 'qrcodes-cdmx25-us-east-1')
    
    try:
        # Generate QR code locally using qrcode library
        qr = qrcode.QRCode(
            version=1,  # Version 1 (21x21 modules)
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        
        # Add data - Version 1 can hold up to 25 alphanumeric characters
        qr.add_data(texto_qr)
        qr.make(fit=False)  # Important: keeps it at Version 1
        
        # Create QR code image using PIL image factory
        qr_image = qr.make_image(fill_color="black", back_color="white")
        
        # Ensure it's a PIL Image - qrcode library returns PIL Images by default
        # when Pillow is installed
        
        # Load the background image
        try:
            # Try to load back.png from the same directory as the Lambda function
            background_path = os.path.join(os.path.dirname(__file__), 'back.jpg')
            background = Image.open(background_path)
            print(f"Background image loaded from: {background_path}")
        except Exception as e:
            print(f"Could not load back.jpg: {str(e)}")
            # Fallback to programmatic background if back.png is not found
            background_width = 800
            background_height = 600
            background = Image.new('RGBA', (background_width, background_height), (0, 32, 64, 255))  # Color azul oscuro
            print("Using programmatic background as fallback")
        
        # Calcular el tamaño del QR (aproximadamente 1/3 del ancho de la imagen de fondo)
        qr_size = background.width // 3
        qr_image = qr_image.resize((qr_size, qr_size))  # type: ignore
        
        # Crear un fondo negro del mismo tamaño que el QR
        black_background = Image.new('RGBA', (qr_size, qr_size), (0, 0, 0, 255))
        
        # Calcular la posición para centrar el QR en la parte derecha
        x_position = background.width - qr_size - (background.width // 8)  # 1/8 del ancho desde el borde derecho
        y_position = (background.height - qr_size) // 2  # Centrado verticalmente
        
        # Crear una nueva imagen con fondo transparente
        final_image = background.copy()
        
        # Pegar el fondo negro primero
        final_image.paste(black_background, (x_position, y_position))
        
        # Pegar el QR sobre el fondo negro
        final_image.paste(qr_image, (x_position, y_position), qr_image)  # type: ignore
        
        # Añadir texto debajo del QR
        draw = ImageDraw.Draw(final_image)
        
        # Cargar fuente Arial con tamaño 30
        try:
            # Try to load arial.ttf from the same directory as the Lambda function
            font_path = os.path.join(os.path.dirname(__file__), 'arial.ttf')
            font = ImageFont.truetype(font_path, size=30)
            print(f"Arial font loaded from: {font_path}")
        except Exception as e:
            print(f"Could not load arial.ttf: {str(e)}")
            # Fallback to default font
            try:
                font = ImageFont.load_default(size=30)
            except TypeError:
                font = ImageFont.load_default()
            print("Using default font as fallback")
        
        # Calcular posición del texto
        text_y = y_position + qr_size + 20  # 20 píxeles debajo del QR
        
        # Obtener el tamaño del texto para centrarlo
        nombre_bbox = draw.textbbox((0, 0), nombre_usuario, font=font)
        email_bbox = draw.textbbox((0, 0), email_usuario, font=font)
        texto_bbox = draw.textbbox((0, 0), texto, font=font)
        
        nombre_width = nombre_bbox[2] - nombre_bbox[0]
        email_width = email_bbox[2] - email_bbox[0]
        texto_width = texto_bbox[2] - texto_bbox[0]
        
        # Calcular las posiciones x para centrar el texto
        nombre_x = x_position + (qr_size - nombre_width) // 2
        email_x = x_position + (qr_size - email_width) // 2
        texto_x = x_position + (qr_size - texto_width) // 2
        
        # Dibujar nombre centrado
        draw.text((nombre_x, text_y), nombre_usuario, fill="white", font=font)
        
        # Dibujar email centrado
        draw.text((email_x, text_y + 40), email_usuario, fill="white", font=font)
        
        # Dibujar texto centrado
        draw.text((texto_x, text_y + 80), texto, fill="white", font=font)
        
        print(f"Código QR generado como '{nombre_archivo}'")
        
    except Exception as e:
        print(f"Error al generar el código QR: {str(e)}")
        return None, None
    
    # Configurar cliente S3
    try:
        # Usar las credenciales de IAM del Lambda
        
        # Guardar la imagen en un buffer de bytes
        img_byte_array = io.BytesIO()
        final_image.save(img_byte_array, format='PNG')
        img_byte_array.seek(0)  # Regresar al inicio del buffer
        
        # Subir a S3
        s3_client.put_object(
            Bucket=bucket_name,
            Key=nombre_archivo,
            Body=img_byte_array.getvalue(),
            ContentType='image/png',
            Metadata={
                'Content-Type': 'image/png'
            }
        )
        
        print(f"Imagen subida exitosamente a S3: {bucket_name}/{nombre_archivo}")
        
        # Generar URL prefirmada
        url_expiration = 12 * 3600  # 12 horas en segundos
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': bucket_name,
                'Key': nombre_archivo,
                'ResponseContentType': 'image/png',
                'ResponseContentDisposition': f'inline; filename="{nombre_archivo}"'
            },
            ExpiresIn=url_expiration
        )
        
        print(f"URL prefirmada generada (válida por 12 horas)")
        
        return nombre_archivo, presigned_url
    
    except Exception as e:
        print(f"Error al subir a S3: {str(e)}")
        return None, None


def lambda_handler(event, context):
    """
    Lambda function to:
    1. Write to DynamoDB welcome_message table
    2. Generate QR code image locally with user info
    3. Upload to S3
    4. Send WhatsApp message via Twilio with the QR code
    5. Clean up DynamoDB record if any step fails
    
    Expected event structure:
    {
        "nombre_usuario": "Sebastián Marines",
        "email_usuario": "sebastian0marines@gmail.com",
        "telefono": "+529992683078",
        "texto_qr": "1236232744320242871263001"
    }
    """
    
    # Track if we've written to DynamoDB for cleanup purposes
    dynamo_written = False
    telefono_clean = None
    
    try:
        # Extract parameters from event
        nombre_usuario = event.get('nombre_usuario')
        email_usuario = event.get('email_usuario')
        telefono = event.get('telefono')
        texto_qr = event.get('texto_qr')

        # Validate required parameters
        if not nombre_usuario:
            raise ValueError('nombre_usuario is required')
        
        if not email_usuario:
            raise ValueError('email_usuario is required')
        
        if not telefono:
            raise ValueError('telefono is required')
        
        if not texto_qr:
            raise ValueError('texto_qr is required')
        
        # Clean phone number for DynamoDB storage (remove whatsapp: prefix if present)
        telefono_clean = telefono.lstrip('whatsapp:')
        
        # Step 1: Atomically write to DynamoDB to prevent duplicates (conditional put)
        try:
            welcome_message_table.put_item(
                Item={
                    'phone_number': telefono_clean,
                    'created_at': datetime.utcnow().isoformat()
                },
                ConditionExpression='attribute_not_exists(phone_number)'
            )
            dynamo_written = True
            print(f"Successfully wrote phone number to DynamoDB: {telefono_clean}")
        except welcome_message_table.meta.client.exceptions.ConditionalCheckFailedException:
            # Phone number already exists - skip processing and return success
            print(f"Phone number already processed, skipping: {telefono_clean}")
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'Phone number already processed, skipped',
                    'phone_number': telefono_clean,
                    'skipped': True
                })
            }
        except Exception as e:
            print(f"Error writing to DynamoDB: {str(e)}")
            raise RuntimeError(f'Failed to write to database: {str(e)}')
        
        # Format phone number for WhatsApp
        if not telefono.startswith('whatsapp:'):
            telefono = 'whatsapp:' + telefono.lstrip('whatsapp:')
        
        # Step 2: Generate QR code image and upload to S3
        print(f"Generating QR code for {nombre_usuario}")
        nombre_archivo, qr_code_url = generar_qr_y_subir_s3(
            texto_qr, 
            nombre_usuario, 
            email_usuario, 
            texto_qr
        )
        
        if not qr_code_url:
            # Cleanup DynamoDB record before failing
            if dynamo_written and telefono_clean:
                try:
                    welcome_message_table.delete_item(Key={'phone_number': telefono_clean})
                    print(f"Cleaned up DynamoDB record for phone: {telefono_clean}")
                except Exception as cleanup_error:
                    print(f"Error cleaning up DynamoDB record: {str(cleanup_error)}")
            
            raise RuntimeError('Failed to generate or upload QR code')
        
        
        # Step 3: Initialize Twilio client and send message
        client = Client(account_sid, auth_token)
        
        # Prepare content variables for the template
        content_variables = {
            "1": nombre_usuario,
            "2": "AWS Community Day México 2025", 
            "3": "14 de junio",
            "4": "Expo Reforma, Ciudad de México",
            "5": "day.awscommunity.mx",
            "6": qr_code_url.replace("https://qrcodes-cdmx25-us-east-1.s3.amazonaws.com/", "")
        }
        
        # Send the message
        message = client.messages.create(
            from_=os.environ.get('TWILIO_MESSAGING_SERVICE_SID'),
            content_sid=os.environ.get('TWILIO_CONTENT_SID'),
            content_variables=json.dumps(content_variables),
            to=telefono
        )
        
        print(f"Message sent successfully. SID: {message.sid}")
        
        # Return success response
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'QR code generated and message sent successfully',
                'message_sid': message.sid,
                'qr_filename': nombre_archivo,
                'qr_url': qr_code_url.replace("https://qrcodes-cdmx25-us-east-1.s3.amazonaws.com/", ""),
                'recipient': telefono,
                'status': message.status
            })
        }
        
    except Exception as e:
        print(f"Error in lambda execution: {str(e)}")
        
        # Cleanup DynamoDB record if we wrote to it
        if dynamo_written and telefono_clean:
            try:
                welcome_message_table.delete_item(Key={'phone_number': telefono_clean})
                print(f"Cleaned up DynamoDB record for phone: {telefono_clean}")
            except Exception as cleanup_error:
                print(f"Error cleaning up DynamoDB record: {str(cleanup_error)}")
        
        # Re-raise the exception to let Lambda runtime handle it
        raise


def send_event_notification_with_qr(nombre_usuario, email_usuario, telefono, texto_qr):
    """
    Helper function to send event notification with generated QR code
    
    Args:
        nombre_usuario: Name of the attendee
        email_usuario: Email of the attendee
        telefono: Phone number to send to (with whatsapp: prefix)
        texto_qr: Text to encode in the QR code
    
    Returns:
        dict: Response from lambda_handler
    """
    event_data = {
        'nombre_usuario': nombre_usuario,
        'email_usuario': email_usuario,
        'telefono': telefono,
        'texto_qr': texto_qr
    }
    
    return lambda_handler(event_data, None)
