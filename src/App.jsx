import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useEffect, useState } from 'react';
import { LayoutGroup } from 'framer-motion';

import { SensorProvider, useSensor } from './context/SensorContext';
import { useSocket } from './hooks/useSocket';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import Monitoring from './pages/Monitoring';
import History from './pages/History';
import Control from './pages/Control';
import SensorManagement from './pages/SensorManagement';

// Inner app: connects socket + mock ticker
function InnerApp() {
  useSocket();
  const { state, mockTick } = useSensor();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Mock ticker: selalu jalan tiap 3 detik untuk semua sensor.
  // Jika sensor real terkoneksi dan mengirim data, field tersebut otomatis
  // memakai data real (hybrid mode — lihat SensorContext MOCK_TICK).
  useEffect(() => {
    const interval = setInterval(mockTick, 2000);
    return () => clearInterval(interval);
  }, [mockTick]);

  // Tampilkan loading hanya selama mock belum selesai inisialisasi awal (~6 detik)
  // atau jika memang belum ada data sama sekali
  const isWaitingForData = !state.mockInitialized && !state.node1 && !state.node2 && !state.node3 && !state.node4 && !state.detectors && state.water_level === null;

  const loadingElement = (
    <div className="page-gradient" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header title="Menunggu Koneksi..." />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
        <div style={{
          width: 50, height: 50, border: '4px solid #1e293b', borderTopColor: '#3b82f6',
          borderRadius: '50%', animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#94a3b8', fontSize: 16, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
          Menunggu koneksi data sensor...
        </p>
      </div>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
      <main className={`main-content ${!isSidebarOpen ? 'collapsed' : ''}`}>
        <LayoutGroup>
          <Routes>
            <Route path="/" element={isWaitingForData ? loadingElement : <Dashboard />} />
            <Route path="/monitoring" element={isWaitingForData ? loadingElement : <Monitoring />} />
            <Route path="/history" element={<History />} />
            <Route path="/control" element={isWaitingForData ? loadingElement : <Control />} />
            <Route path="/sensors" element={<SensorManagement />} />
          </Routes>
        </LayoutGroup>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SensorProvider>
        <InnerApp />
        <Toaster
          position="top-right"
          visibleToasts={5}
          expand={false}
          duration={4000}
          offset="80px"
          toastOptions={{
            style: {
              background: '#0d1f38',
              color: '#e2e8f0',
              border: '1px solid #1a3558',
              borderRadius: '10px',
              fontSize: '13px',
            },
          }}
        />
      </SensorProvider>
    </BrowserRouter>
  );
}


