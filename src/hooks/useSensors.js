import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export default function useSensors() {
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSensors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/sensors-master');
      const data = await res.json();
      setSensors(data);
    } catch (err) {
      toast.error('Gagal memuat data sensor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSensors();
  }, [fetchSensors]);

  const saveSensor = async (formData, editingId) => {
    if (!formData.sensor_id || !formData.type) {
      toast.error('ID Sensor dan Tipe wajib diisi!');
      return false;
    }

    try {
      const isEdit = editingId !== null;
      const url = isEdit
        ? `http://localhost:5000/api/sensors-master/${editingId}`
        : 'http://localhost:5000/api/sensors-master';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || 'Gagal menyimpan');

      toast.success(result.message);
      fetchSensors();
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  };

  const deleteSensor = async (id) => {
    if (!window.confirm('Yakin ingin menghapus sensor ini?')) return false;
    try {
      const res = await fetch(`http://localhost:5000/api/sensors-master/${id}`, {
        method: 'DELETE'
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success(result.message);
      fetchSensors();
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  };

  return {
    sensors,
    loading,
    saveSensor,
    deleteSensor,
    refreshSensors: fetchSensors
  };
}
