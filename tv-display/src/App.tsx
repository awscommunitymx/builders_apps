import { TVAgendaDisplay } from './components/TVAgendaDisplay'
import { ThemeProvider } from './components/theme-provider'
import { ApolloProvider } from '@apollo/client'
import { client } from './apollo-client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'

function App() {
  const [sponsorIndex, setSponsorIndex] = useState(0);

  return (
    <ApolloProvider client={client}>
      <ThemeProvider defaultTheme="light" storageKey="tv-display-theme">
        <BrowserRouter>
          <Routes>
            {/* Redirect root to default location */}
            <Route path="/" element={<Navigate to="/la-corona" replace />} />
            {/* Route for each location */}
            <Route path="/:location" element={
              <div className="min-h-screen bg-background">
                <TVAgendaDisplay 
                  sponsorIndex={sponsorIndex}
                  onSponsorIndexChange={setSponsorIndex}
                />
              </div>
            } />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </ApolloProvider>
  )
}

export default App 
