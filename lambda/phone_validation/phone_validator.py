import re
import phonenumbers
from phonenumbers import NumberParseException

def clean_and_validate_phone(phone_string):
    """
    Limpia y valida un número de teléfono siguiendo las reglas para números mexicanos y WhatsApp.
    
    Args:
        phone_string (str): El número de teléfono original como string
        
    Returns:
        dict: Diccionario con el resultado del procesamiento:
            - 'phone': Número procesado (string) o None si no es válido
            - 'is_valid': Boolean indicando si el número es válido
            - 'status': Categoría del procesamiento
            - 'original': Número original
            - 'notes': Notas sobre el procesamiento
    """
    
    # Inicializar resultado
    result = {
        'phone': None,
        'is_valid': False,
        'status': 'UNKNOWN',
        'original': phone_string,
        'notes': ''
    }
    
    # Verificar si el input es válido
    if not phone_string or phone_string in ['', 'nan', 'None', None]:
        result['status'] = 'EMPTY'
        result['notes'] = 'Número vacío o nulo'
        return result
    
    # Convertir a string y limpiar
    phone_str = str(phone_string).strip()
    
    # Paso 1: Limpiar - remover todo excepto números y el signo +
    cleaned = re.sub(r'[^\d+]', '', phone_str)
    
    if not cleaned:
        result['status'] = 'EMPTY'
        result['notes'] = 'Número vacío después de limpieza'
        return result
    
    # Paso 2: Aplicar reglas de procesamiento
    processed_phone = None
    
    # Regla 1: Número mexicano de 10 dígitos (sin código de país)
    if len(cleaned) == 10 and cleaned.isdigit():
        processed_phone = f"+52{cleaned}"
        result['status'] = 'MEXICAN_10_DIGITS'
        result['notes'] = 'Número mexicano de 10 dígitos, se agregó +52'
        
    # Regla 2: Número que empieza con código de país pero sin +
    elif cleaned.isdigit() and len(cleaned) > 10:
        # Verificar si empieza con 52 (México) y tiene 12 dígitos
        if cleaned.startswith('52') and len(cleaned) == 12:
            processed_phone = f"+{cleaned}"
            result['status'] = 'MEXICAN_WITH_CODE'
            result['notes'] = 'Número mexicano con código 52, se agregó +'
        # NUEVA REGLA: Detectar números de 12 dígitos que empiecen con 55 (error común)
        elif cleaned.startswith('55') and len(cleaned) == 12:
            # Reemplazar 55 inicial por 52 y agregar +
            corrected_number = f"52{cleaned[2:]}"
            processed_phone = f"+{corrected_number}"
            result['status'] = 'MEXICAN_55_CORRECTED'
            result['notes'] = 'Número mexicano corregido: se cambió 55 inicial por 52 (código de país)'
        # Otros códigos de país
        else:
            processed_phone = f"+{cleaned}"
            result['status'] = 'INTERNATIONAL_NO_PLUS'
            result['notes'] = 'Número internacional sin +, se agregó +'
            
    # Regla 3: Número que ya tiene +
    elif cleaned.startswith('+'):
        # Verificar si tiene el error de +55 en lugar de +52
        if cleaned.startswith('+55') and len(cleaned) == 13:
            # Corregir +55 por +52
            corrected_number = f"+52{cleaned[3:]}"
            processed_phone = corrected_number
            result['status'] = 'MEXICAN_PLUS55_CORRECTED'
            result['notes'] = 'Número mexicano corregido: se cambió +55 por +52 (código de país)'
        else:
            processed_phone = cleaned
            result['status'] = 'ALREADY_FORMATTED'
            result['notes'] = 'Número ya tiene formato internacional'
        
    # Regla 4: Otros casos (formatos no reconocidos)
    else:
        processed_phone = cleaned
        result['status'] = 'UNKNOWN_FORMAT'
        result['notes'] = f'Formato desconocido - longitud: {len(cleaned)}'
    
    # Paso 3: Validar el número procesado usando phonenumbers
    try:
        parsed_number = phonenumbers.parse(processed_phone, None)
        if phonenumbers.is_valid_number(parsed_number):
            result['phone'] = processed_phone
            result['is_valid'] = True
            result['notes'] += ' - Número válido'
        else:
            result['phone'] = processed_phone
            result['is_valid'] = False
            result['notes'] += ' - Número no válido según validación internacional'
    except NumberParseException as e:
        result['phone'] = processed_phone
        result['is_valid'] = False
        result['notes'] += f' - Error de validación: {e}'
    
    return result


def get_clean_phone(phone_string):
    """
    Función simplificada que solo retorna el número limpio y válido o None.
    
    Args:
        phone_string (str): El número de teléfono original
        
    Returns:
        str or None: El número limpio y válido, o None si no es válido
    """
    result = clean_and_validate_phone(phone_string)
    return result['phone'] if result['is_valid'] else None


def is_valid_phone(phone_string):
    """
    Función que verifica si un número es válido después del procesamiento.
    
    Args:
        phone_string (str): El número de teléfono original
        
    Returns:
        bool: True si el número es válido, False en caso contrario
    """
    result = clean_and_validate_phone(phone_string)
    return result['is_valid']


# Ejemplos de uso y pruebas
if __name__ == "__main__":
    # Casos de prueba
    test_cases = [
        "55 1234-5678",           # Mexicano 10 dígitos
        "52 55 1234 5678",        # Mexicano con código
        "+52 55 1234 5678",       # Ya formateado
        "1 555 123 4567",         # Internacional
        "525512345678",           # Mexicano con código sin +
        "5512345678",             # Mexicano 10 dígitos
        "+1 555 123 4567",        # Internacional ya formateado
        "331151165",              # Formato desconocido
        "55#64-3566",             # Con caracteres especiales
        "",                       # Vacío
        None,                     # Nulo
        "abc123def456"            # Con letras
    ]
    
    print("🧪 PRUEBAS DE LA FUNCIÓN DE VALIDACIÓN")
    print("=" * 60)
    
    for i, test_phone in enumerate(test_cases, 1):
        print(f"\n{i}. Probando: '{test_phone}'")
        
        # Función completa
        result = clean_and_validate_phone(test_phone)
        print(f"   Resultado completo: {result}")
        
        # Función simplificada
        clean_phone = get_clean_phone(test_phone)
        print(f"   Solo número limpio: {clean_phone}")
        
        # Función de validación
        is_valid = is_valid_phone(test_phone)
        print(f"   ¿Es válido?: {is_valid}")
        
        print("-" * 40) 