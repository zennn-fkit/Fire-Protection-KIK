import { useState, useEffect } from 'react';
import { Plus, Edit2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SensorForm({ isOpen, initialData, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    sensor_id: '',
    type: 'SMOKE',
    zone_name: '',
    floor: ''
  });

  const isEditing = !!initialData;

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        sensor_id: '',
        type: 'SMOKE',
        zone_name: '',
        floor: ''
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="overflow-hidden"
        >
          <div className="sensor-form-card">
            {/* Header */}
            <div className="sensor-form-header">
              <div className="sensor-form-title">
                <div className="sensor-form-icon">
                  {isEditing ? <Edit2 size={16} /> : <Plus size={16} />}
                </div>
                <h3>{isEditing ? 'Edit Data Sensor' : 'Registrasi Sensor Baru'}</h3>
              </div>
              <button 
                onClick={onCancel}
                className="sensor-form-close"
                aria-label="Tutup form"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Form Body */}
            <form onSubmit={handleSubmit}>
              <div className="sensor-form-grid">
                <div className="sensor-form-field">
                  <label>ID Sensor <span className="text-red-400">*</span></label>
                  <input 
                    name="sensor_id" 
                    value={formData.sensor_id} 
                    onChange={handleChange} 
                    placeholder="Contoh: SMOKE_01" 
                    className="sensor-input font-mono"
                    autoFocus
                    required
                  />
                </div>
                
                <div className="sensor-form-field">
                  <label>Tipe Sensor <span className="text-red-400">*</span></label>
                  <div className="sensor-select-wrapper">
                    <select 
                      name="type" 
                      value={formData.type} 
                      onChange={handleChange} 
                      className="sensor-input sensor-select"
                      required
                    >
                      <option value="SMOKE">Smoke Detector</option>
                      <option value="HEAT">Heat Detector</option>
                    </select>
                    <div className="sensor-select-arrow">
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
                
                <div className="sensor-form-field">
                  <label>Zona / Ruangan</label>
                  <input 
                    name="zone_name" 
                    value={formData.zone_name} 
                    onChange={handleChange} 
                    placeholder="Contoh: Gudang A" 
                    className="sensor-input"
                  />
                </div>
                
                <div className="sensor-form-field">
                  <label>Lantai</label>
                  <input 
                    name="floor" 
                    value={formData.floor} 
                    onChange={handleChange} 
                    placeholder="Contoh: Lantai 1" 
                    className="sensor-input"
                  />
                </div>
              </div>
              
              {/* Actions */}
              <div className="sensor-form-actions">
                <button 
                  type="button" 
                  onClick={onCancel} 
                  className="sensor-btn-cancel"
                >
                  Batal
                </button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit" 
                  className="btn btn-primary sensor-btn-submit"
                >
                  <Check size={15} /> {isEditing ? 'Simpan Perubahan' : 'Simpan Sensor'}
                </motion.button>
              </div>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
