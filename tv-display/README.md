# Builders TV Display

A React application for displaying the agenda and sponsor media on TVs during the Builders event.

## Features

- Real-time agenda updates using GraphQL subscriptions
- Shows current and upcoming sessions
- Displays sponsor media when no session is active
- Automatic media rotation with 20-second timer for images
- Responsive design optimized for TV displays

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory with the following variables:
   ```
   VITE_GRAPHQL_API_URL=your_graphql_api_url
   VITE_GRAPHQL_API_KEY=your_api_key
   VITE_LOCATION=room_name
   ```

   - `VITE_GRAPHQL_API_URL`: The URL of your AppSync GraphQL API
   - `VITE_GRAPHQL_API_KEY`: The API key for authentication
   - `VITE_LOCATION`: The room/location this TV display is for (e.g., "Main Hall", "Room A")

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Deployment

The application is designed to be deployed to a static web server. You can use the built files from the `dist` directory after running `npm run build`.

For AWS deployment, you can use:
- Amazon S3 + CloudFront
- AWS Amplify
- Amazon Lightsail

## Configuration

### Sponsor Media

To configure sponsor media, edit the `SPONSOR_MEDIA` array in `src/components/SponsorMedia.tsx`. Each media item should have:

```typescript
{
  id: string;
  type: 'image' | 'video';
  url: string;
  duration: number; // seconds
}
```

### Environment Variables

- `VITE_GRAPHQL_API_URL`: Your AppSync GraphQL API endpoint
- `VITE_GRAPHQL_API_KEY`: API key for authentication
- `VITE_LOCATION`: The room/location identifier

## Development

The application uses:
- React 18
- TypeScript
- Apollo Client for GraphQL
- Cloudscape Design System for UI components
- Vite for build tooling

## License

ISC 