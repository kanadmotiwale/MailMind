import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navbar } from './components/Navbar'
import { UploadPage } from './pages/UploadPage'
import { InboxPage } from './pages/InboxPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Navbar />
          <Routes>
            <Route path="/" element={<Navigate to="/upload" replace />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/inbox" element={<InboxPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
