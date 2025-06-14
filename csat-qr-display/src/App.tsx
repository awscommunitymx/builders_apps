import { Routes, Route } from 'react-router-dom'
import { QRDisplay } from './components/QRDisplay'
import './App.css'

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<QRDisplay roomName="Default Room" />} />
        <Route path="/room/:roomName" element={<QRDisplay />} />
        <Route path="/session/:sessionId" element={<QRDisplay />} />
      </Routes>
    </div>
  )
}

export default App
