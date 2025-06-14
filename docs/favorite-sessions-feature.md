# Funcionalidad de Sesiones Favoritas

## Resumen

Se ha implementado una funcionalidad completa de sesiones favoritas para usuarios autenticados en el sistema GraphQL. Esta implementación permite a los usuarios marcar sesiones como favoritas y consultar qué usuarios han marcado una sesión específica como favorita.

## Esquema de Base de Datos

### Patrón de Acceso para Favoritos

Los favoritos de usuarios autenticados se almacenan en DynamoDB usando el siguiente patrón:

- **PK (Partition Key)**: `USER#{cognito_sub}`
- **SK (Sort Key)**: `FAV#{sessionId}`

### Índices Utilizados

1. **sk-index**: GSI agregado para consultas eficientes por SK
   - Permite encontrar todos los usuarios que marcaron una sesión específica como favorita
   - PK: `SK`, Projection: ALL

2. **cognito_sub-index**: GSI existente para consultas por usuario
   - Usado para obtener perfiles de usuario completos

## API GraphQL

### Queries

#### `getMyFavoriteSessions: [String!]!`
- **Autenticación**: Requerida (grupo "Attendees")
- **Descripción**: Obtiene la lista de IDs de sesiones favoritas del usuario autenticado
- **Retorna**: Array de session IDs

#### `getSessionFavoriteUsers(sessionId: ID!): [User!]!`
- **Autenticación**: Requerida (grupo "Attendees")
- **Descripción**: Obtiene la lista de usuarios que marcaron una sesión específica como favorita
- **Parámetros**: 
  - `sessionId`: ID de la sesión a consultar
- **Retorna**: Array de objetos User

### Mutations

#### `addFavoriteSession(sessionId: ID!): Boolean!`
- **Autenticación**: Requerida (grupo "Attendees")
- **Descripción**: Agrega una sesión a los favoritos del usuario autenticado
- **Parámetros**:
  - `sessionId`: ID de la sesión a agregar como favorita
- **Retorna**: true si la operación fue exitosa
- **Nota**: Si la sesión ya está en favoritos, retorna true sin error

#### `removeFavoriteSession(sessionId: ID!): Boolean!`
- **Autenticación**: Requerida (grupo "Attendees")
- **Descripción**: Remueve una sesión de los favoritos del usuario autenticado
- **Parámetros**:
  - `sessionId`: ID de la sesión a remover de favoritos
- **Retorna**: true si la operación fue exitosa

## Eficiencia y Rendimiento

### Optimizaciones Implementadas

1. **GSI sk-index**: Permite queries eficientes O(log n) en lugar de scans O(n) para encontrar usuarios por sesión favorita

2. **Queries en lote**: Para `getSessionFavoriteUsers`, se obtienen primero los user IDs y luego se consultan los perfiles en paralelo

3. **Proyecciones optimizadas**: Se utilizan ProjectionExpression para obtener solo los campos necesarios en queries intermedias

### Consideraciones de Costos

- **Reads**: Queries eficientes usando GSIs
- **Writes**: Una operación por favorito (add/remove)
- **Storage**: Minimal overhead - solo sessionId y metadata por favorito

## Estructura de Archivos

### Handlers Implementados

1. `lambda/graphql-resolver/handlers/addFavoriteSession.ts`
2. `lambda/graphql-resolver/handlers/removeFavoriteSession.ts`
3. `lambda/graphql-resolver/handlers/getMyFavoriteSessions.ts`
4. `lambda/graphql-resolver/handlers/getSessionFavoriteUsers.ts`

### Configuración de Infraestructura

- `lib/stacks/database.ts`: Agregado GSI sk-index
- `lib/stacks/api.ts`: Agregados resolvers para las nuevas operaciones
- `schema.graphql`: Agregadas queries y mutations

## Ejemplos de Uso

### Agregar sesión a favoritos
```graphql
mutation {
  addFavoriteSession(sessionId: "925462") 
}
```

### Obtener mis sesiones favoritas
```graphql
query {
  getMyFavoriteSessions
}
```

### Ver usuarios que marcaron una sesión como favorita
```graphql
query {
  getSessionFavoriteUsers(sessionId: "925462") {
    user_id
    name
    company
    email
  }
}
```

### Remover sesión de favoritos
```graphql
mutation {
  removeFavoriteSession(sessionId: "925462")
}
```

## Monitoreo y Observabilidad

Todas las operaciones incluyen:
- **Logs estructurados** con AWS Lambda Powertools
- **Métricas personalizadas** para monitoreo de performance
- **Trazas distribuidas** con X-Ray
- **Manejo de errores** con logging detallado

## Próximos Pasos

1. **Testing**: Implementar tests unitarios e de integración
2. **Rate Limiting**: Considerar límites de favoritos por usuario
3. **Notificaciones**: Potencial integración con sistema de notificaciones
4. **Analytics**: Métricas de sesiones más populares basadas en favoritos
