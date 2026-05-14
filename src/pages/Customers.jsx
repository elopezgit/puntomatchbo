import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Loader2, Edit2, Trash2, Users, User, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    level: 'Principiante',
    active: true
  });

  useEffect(() => {
    fetchCustomers();
    
    const subscription = supabase
      .channel('public:pm_customers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pm_customers' }, fetchCustomers)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('pm_customers')
        .select(`
          *,
          pm_bookings (id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (customer = null) => {
    if (customer) {
      setEditingId(customer.id);
      setFormData({
        full_name: customer.full_name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        level: customer.level || 'Principiante',
        active: customer.active ?? true
      });
    } else {
      setEditingId(null);
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        level: 'Principiante',
        active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const payload = { ...formData, updated_at: new Date().toISOString() };

      if (editingId) {
        const { error } = await supabase.from('pm_customers').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pm_customers').insert(payload);
        if (error) throw error;
      }
      
      handleCloseModal();
      fetchCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      alert('Error al guardar el cliente. Verifica los datos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este cliente? Se perderá si no tiene reservas vinculadas.')) {
      try {
        const { error } = await supabase.from('pm_customers').delete().eq('id', id);
        if (error) throw error;
        fetchCustomers();
      } catch (error) {
        console.error('Error deleting customer:', error);
        alert('No se pudo eliminar el cliente porque ya tiene reservas históricas asociadas.');
      }
    }
  };

  const filteredCustomers = customers.filter(c => 
    (c.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (c.phone || '').includes(searchTerm) ||
    (c.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Clientes</h2>
          <p className="text-gray-400">Directorio de jugadores y CRM.</p>
        </div>
        
        <button onClick={() => handleOpenModal()} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" /> Nuevo Cliente
        </button>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/5 flex gap-4 items-center bg-dark-800/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, teléfono o email..." 
              className="input-field pl-10 py-2 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400 border border-white/10 rounded-xl px-4 py-2 bg-dark-900/50">
            <Users className="w-4 h-4" /> Total: {customers.length}
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-[400px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
              <User className="w-16 h-16 mb-4 opacity-20" />
              <p>No se encontraron clientes</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-dark-800 text-gray-400 text-sm uppercase tracking-wider">
                  <th className="p-4 font-medium">Cliente</th>
                  <th className="p-4 font-medium">Contacto</th>
                  <th className="p-4 font-medium">Nivel</th>
                  <th className="p-4 font-medium text-center">Reservas Totales</th>
                  <th className="p-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCustomers.map((cust, idx) => (
                  <motion.tr 
                    key={cust.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center border border-white/10 text-primary-500 font-bold uppercase">
                          {cust.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{cust.full_name}</p>
                          <p className="text-xs text-gray-400">
                            Alta: {cust.created_at ? format(parseISO(cust.created_at), 'dd/MM/yyyy') : '-'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-white text-sm">{cust.phone || 'Sin teléfono'}</p>
                      <p className="text-xs text-gray-400">{cust.email || 'Sin email'}</p>
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-dark-700 rounded-full text-xs font-semibold border border-white/10 text-gray-300">
                        {cust.level || 'Principiante'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="font-bold text-accent-400 text-lg">{cust.pm_bookings?.length || 0}</span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenModal(cust)} className="p-2 bg-dark-800 text-gray-300 hover:text-accent-400 rounded-lg border border-white/5 hover:border-accent-400/50 transition-colors shadow-sm" title="Editar Cliente">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(cust.id)} className="p-2 bg-dark-800 text-gray-300 hover:text-red-400 rounded-lg border border-white/5 hover:border-red-400/50 transition-colors shadow-sm" title="Eliminar Cliente">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CRUD Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleCloseModal}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel w-full max-w-lg rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-dark-800/80">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <User className="w-6 h-6 text-primary-500" />
                  {editingId ? 'Editar Cliente' : 'Nuevo Cliente'}
                </h3>
                <button onClick={handleCloseModal} className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6">
                <form id="customerForm" onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Nombre Completo *</label>
                    <input 
                      type="text" name="full_name" required value={formData.full_name} onChange={handleChange}
                      className="input-field" placeholder="Ej: Lionel Messi"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Teléfono</label>
                      <input 
                        type="tel" name="phone" value={formData.phone} onChange={handleChange}
                        className="input-field" placeholder="Ej: 381 123 4567"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Email</label>
                      <input 
                        type="email" name="email" value={formData.email} onChange={handleChange}
                        className="input-field" placeholder="correo@ejemplo.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Nivel de Juego</label>
                    <select 
                      name="level" value={formData.level} onChange={handleChange}
                      className="input-field appearance-none"
                    >
                      <option value="Principiante">Principiante (7ma)</option>
                      <option value="Intermedio">Intermedio (6ta - 5ta)</option>
                      <option value="Avanzado">Avanzado (4ta - 3ra)</option>
                      <option value="Profesional">Profesional (2da - 1ra)</option>
                    </select>
                  </div>
                </form>
              </div>
              
              <div className="p-5 border-t border-white/10 bg-dark-800/80 flex justify-end gap-3">
                <button type="button" onClick={handleCloseModal} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" form="customerForm" disabled={isSubmitting} className="btn-primary flex items-center gap-2 disabled:opacity-70">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? 'Guardar Cambios' : 'Crear Cliente'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
