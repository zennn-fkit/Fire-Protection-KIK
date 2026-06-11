import { useState } from 'react';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/layout/Header';
import useSensors from '../hooks/useSensors';
import SensorForm from '../components/sensors/SensorForm';
import SensorTable from '../components/sensors/SensorTable';
import SensorEmptyState from '../components/sensors/SensorEmptyState';

export default function SensorManagement() {
  const { sensors, loading, saveSensor, deleteSensor } = useSensors();
  const [isAdding, setIsAdding] = useState(false);
  const [editingSensor, setEditingSensor] = useState(null);

  const handleAddClick = () => {
    setEditingSensor(null);
    setIsAdding(true);
  };

  const handleEditClick = (sensor) => {
    setEditingSensor(sensor);
    setIsAdding(true);
  };

  const handleCancelForm = () => {
    setIsAdding(false);
    setEditingSensor(null);
  };

  const handleFormSubmit = async (formData) => {
    const success = await saveSensor(formData, editingSensor?.id || null);
    if (success) {
      handleCancelForm();
    }
  };

  return (
    <div className="page-gradient min-h-screen pb-8">
      <Header title="Manajemen Sensor" subtitle="Kelola data master sensor, zona, dan lantai" />
      
      <div className="sensor-page-content">
        {/* Inline Form with Animation */}
        <SensorForm 
          isOpen={isAdding}
          initialData={editingSensor}
          onSubmit={handleFormSubmit}
          onCancel={handleCancelForm}
        />

        {/* Data Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="sensor-panel"
        >
          {/* Panel Header */}
          <div className="sensor-panel-header">
            <div className="sensor-panel-header-info">
              <h2 className="sensor-panel-title">
                Daftar Sensor
                {!loading && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="sensor-count-badge"
                  >
                    {sensors.length}
                  </motion.span>
                )}
              </h2>
              <p className="sensor-panel-subtitle">Kelola data master sensor kebakaran, zona, dan pemetaan lantai.</p>
            </div>
            
            <AnimatePresence>
              {!isAdding && (
                <motion.button 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleAddClick} 
                  className="btn btn-primary sensor-add-btn"
                >
                  <Plus size={16} /> Tambah Sensor
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          
          {/* Content Area (Table or Empty State) */}
          <div className="sensor-panel-body">
            {!loading && sensors.length === 0 ? (
              <SensorEmptyState onAdd={handleAddClick} />
            ) : (
              <SensorTable 
                sensors={sensors} 
                loading={loading} 
                onEdit={handleEditClick} 
                onDelete={deleteSensor} 
              />
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
