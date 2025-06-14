# CSAT QR Code Display

A React application for displaying QR codes for Customer Satisfaction (CSAT) surveys on a green chroma screen background.

## Features

- Room-based routing for different survey locations
- QR code generation with customizable survey URLs
- Green chroma key background for video production
- Responsive design for various screen sizes
- Clean, professional display layout

## Usage

### Development

```bash
npm install
npm run dev
```

The application will be available at `http://localhost:5173/`

### Routes

- `/` - Default room display
- `/room/:roomName` - Display QR code for specific room

### Examples

- `http://localhost:5173/` - Shows "Default Room"
- `http://localhost:5173/room/Conference%20Hall%20A` - Shows "Conference Hall A"
- `http://localhost:5173/room/Workshop%20Room%201` - Shows "Workshop Room 1"

### QR Code Data

The QR codes currently generate URLs in the format:
```
https://survey.example.com/csat?room={roomName}
```

You can modify the URL generation in `src/components/QRDisplay.tsx` to match your actual survey system.

## Chroma Screen

The application uses a bright green background (`#00FF00`) that's perfect for chroma key video production, allowing you to easily replace the background in post-production or live streaming setups.

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment to any static hosting service.

## Customization

### Survey URL
Edit the `qrData` variable in `src/components/QRDisplay.tsx` to point to your actual survey system.

### Styling
Modify `src/App.css` to change colors, fonts, or layout according to your needs.

### QR Code Appearance
Adjust QR code properties in the `QRCode` component within `QRDisplay.tsx`.

---

## Original Vite Template Information

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh