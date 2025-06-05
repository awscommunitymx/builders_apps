# Transformador de Datos para Sesiones

Este directorio contiene los archivos de datos y un script para transformar el formato de datos de `dataact.json` a un formato compatible con `sessions.json`.

## Archivos

- `dataact.json`: Archivo fuente que contiene los datos originales de sesiones y ponentes.
- `sessions.json`: Archivo de referencia que muestra el formato deseado.
- `sessions-transformed.json`: Archivo generado por el script de transformación con los datos de `dataact.json` convertidos al formato de `sessions.json`.

## Filtrado de datos

Durante la transformación, el script filtra automáticamente:

- Sesiones de servicio
- Sesiones que se realizan en "Virtual Stage"
- Sesiones con "CAPITAL ONE" en el título

## Cómo utilizar el transformador

### Prepara tu archivo fuente

Asegúrate de que tu archivo `dataact.json` esté en la carpeta `src/data/`.

### Ejecuta el script de transformación

```bash
npm run transform-sessions
```

Esto procesará los datos y generará un archivo `sessions-transformed.json` en la misma carpeta.

### Usa los datos transformados

Puedes usar el archivo `sessions-transformed.json` como fuente de datos para tu aplicación, o renombrarlo a `sessions.json` si deseas sobrescribir el archivo existente.

## Estructura de datos

El formato de salida sigue esta estructura:

```json
{
  "sessions": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "speakers": [
        {
          "name": "string",
          "avatarUrl": "string",
          "company": "string"
        }
      ],
      "time": "string",
      "location": "string",
      "Nationality": "string",
      "level": "string",
      "language": "string",
      "catergory": "string"
    }
  ]
}
```

## Campos destacados

- **Nationality**: Este campo contiene la nacionalidad del ponente principal de la sesión. Se extrae de la información del primer ponente donde está disponible (pregunta con ID 100798). El campo usa "N" mayúscula para mantener la compatibilidad con el formato existente.
- **language**: Idioma de la sesión, extraído de las categorías.
- **catergory**: Tipo de sesión (ej. "Breakout Session", "Keynote"), capitalizado y sin información de tiempo.
- **language**: Este campo indica el idioma en que se presenta la sesión.
- **catergory**: Este campo indica el tipo de conferencia (se mantiene el typo del nombre del campo tal como aparece en el archivo original).

## Personalización

Si necesitas modificar el proceso de transformación, puedes editar el archivo `src/transform-data.js` para ajustar la lógica de mapeo o añadir campos adicionales.
