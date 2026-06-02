import { useState, useMemo } from 'react';
import { Edit2, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SensorTable({ sensors, loading, onEdit, onDelete }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredSensors = useMemo(() => {
    return sensors.filter(sensor => {
      const term = searchTerm.toLowerCase();
      return (
        sensor.sensor_id.toLowerCase().includes(term) ||
        (sensor.zone_name && sensor.zone_name.toLowerCase().includes(term)) ||
        (sensor.floor && sensor.floor.toLowerCase().includes(term))
      );
    });
  }, [sensors, searchTerm]);

  const totalPages = Math.ceil(filteredSensors.length / itemsPerPage);
  
  const currentData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSensors.slice(start, start + itemsPerPage);
  }, [filteredSensors, currentPage, itemsPerPage]);

  // Reset to page 1 when searching
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin glow-cyan"></div>
          <p className="text-slate-400 text-sm font-medium">Memuat data sensor...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Search Bar */}
      <div className="px-6 py-4 border-b border-navy-400/30 bg-navy-800/20 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full max-w-md group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500 group-focus-within:text-primary transition-colors">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Cari ID Sensor, Zona, atau Lantai..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2.5 bg-navy-900/50 border border-navy-400 rounded-lg text-sm text-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-slate-500 hover:border-navy-300"
          />
        </div>
        
        <div className="text-sm text-slate-400 font-medium">
          Menampilkan <span className="text-primary font-bold">{currentData.length}</span> dari <span className="text-white font-bold">{filteredSensors.length}</span> sensor
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-navy-800/40 text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-navy-400">
              <th className="py-4 pl-6 font-semibold">ID SENSOR</th>
              <th className="py-4 font-semibold">TIPE</th>
              <th className="py-4 font-semibold">ZONA / RUANGAN</th>
              <th className="py-4 font-semibold">LANTAI</th>
              <th className="py-4 pr-6 text-right font-semibold">AKSI</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {currentData.length === 0 ? (
                <motion.tr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <td colSpan="5" className="py-12 text-center text-slate-500 text-sm">
                    {searchTerm ? 'Tidak ada sensor yang cocok dengan pencarian.' : 'Data sensor kosong.'}
                  </td>
                </motion.tr>
              ) : (
                currentData.map((sensor, index) => (
                  <motion.tr 
                    key={sensor.id || sensor.sensor_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-navy-400/20 group hover:bg-navy-700/20 transition-all duration-200"
                  >
                    <td className="py-4 pl-6">
                      <span className="font-bold text-slate-200 font-mono text-sm tracking-wide bg-navy-900/50 px-2 py-1 rounded border border-navy-400/50 group-hover:border-primary/30 transition-colors">
                        {sensor.sensor_id}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border transition-colors ${sensor.type === 'SMOKE' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 group-hover:border-blue-500/40' : 'bg-red-500/10 text-red-400 border-red-500/20 group-hover:border-red-500/40'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${sensor.type === 'SMOKE' ? 'bg-blue-400' : 'bg-red-400'}`}></span>
                        {sensor.type === 'SMOKE' ? 'SMOKE DETECTOR' : 'HEAT DETECTOR'}
                      </span>
                    </td>
                    <td className="py-4 text-slate-300 font-medium">{sensor.zone_name || <span className="text-slate-600">-</span>}</td>
                    <td className="py-4 text-slate-300">{sensor.floor || <span className="text-slate-600">-</span>}</td>
                    <td className="py-4 pr-6 text-right">
                      <div className="flex justify-end gap-2">
                        <motion.button 
                          whileHover={{ scale: 1.1, backgroundColor: 'rgba(59, 130, 246, 0.15)' }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onEdit(sensor)} 
                          className="p-2 text-blue-400 transition-colors bg-navy-800 border border-navy-400 rounded-lg shadow-sm" 
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onDelete(sensor.id)} 
                          className="p-2 text-red-400 transition-colors bg-navy-800 border border-navy-400 rounded-lg shadow-sm" 
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-navy-400/30 flex items-center justify-between bg-navy-800/10">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-white disabled:opacity-50 disabled:hover:text-slate-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-navy-700/50"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                  currentPage === i + 1 
                    ? 'bg-primary text-navy-900 shadow-[0_0_10px_rgba(34,211,238,0.4)]' 
                    : 'text-slate-400 hover:bg-navy-700 hover:text-white'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-white disabled:opacity-50 disabled:hover:text-slate-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-navy-700/50"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
