import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Filter, MoreVertical, Loader2, X, Calendar as CalendarIcon, CheckCircle2, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, parseISO, parse } from 'date-fns';
import { es } from 'date-fns/locale';

const getStatusBadge = (status) => {
  switch(status) {
    case 'en_juego': return <span className="px-3 py-1 bg-primary-500/20 text-primary-400 rounded-full text-xs font-semibold border border-primary-500/30 whitespace-nowrap">En Juego</span>;
    case 'confirmado': return <span className="px-3 py-1 bg-accent-500/20 text-accent-400 rounded-full text-xs font-semibold border border-accent-500/30 whitespace-nowrap">Confirmado</span>;
    case 'finalizado': return <span className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs font-semibold border border-gray-500/30 whitespace-nowrap">Finalizado</span>;
    case 'pendiente': return <span className="px-3 py-1 bg-yellow-400/20 text-yellow-400 rounded-full text-xs font-semibold border border-yellow-400/30 whitespace-nowrap">Pendiente</span>;
    case 'cancelado': return <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-semibold border border-red-500/30 whitespace-nowrap">Cancelado</span>;
    default: return <span className="px-3 py-1 bg-dark-700 text-gray-400 rounded-full text-xs font-semibold border border-white/10 whitespace-nowrap">{status}</span>;
  }
};

export default function Reservations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form Data
  const [customers, setCustomers] = useState([]);
  const [courts, setCourts] = useState([]);
  const [allTimeSlots, setAllTimeSlots] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    customer_id: '',
    new_customer_name: '',
    new_customer_phone: '',
    court_id: '',
    booking_date: format(new Date(), 'yyyy-MM-dd'),
    selected_slots: [],
    status: 'confirmado',
    payment_method: 'efectivo',
    paid_amount: '',
    deposit_amount: '10000',
    notes: ''
  });

  useEffect(() => {
    fetchReservations();
    fetchFormData();
    
    const subscription = supabase
      .channel('public:pm_bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pm_bookings' }, fetchReservations)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchReservations = async () => {
    const { data, error } = await supabase
      .from('v_pm_bo_bookings_detail')
      .select('*')
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching reservations:', error);
    } else {
      setReservations(data || []);
    }
    setLoading(false);
  };

  const fetchFormData = async () => {
    const [custRes, courtRes, slotsRes] = await Promise.all([
      supabase.from('pm_customers').select('*').order('full_name'),
      supabase.from('pm_courts').select('*').eq('active', true).order('name'),
      supabase.from('pm_time_slots').select('*').eq('active', true).order('slot_start')
    ]);

    if (custRes.data) setCustomers(custRes.data);
    if (courtRes.data) setCourts(courtRes.data);
    if (slotsRes.data) setAllTimeSlots(slotsRes.data);
  };

  // Check availability when court or date changes
  useEffect(() => {
    if (formData.court_id && formData.booking_date && allTimeSlots.length > 0) {
      checkAvailability(formData.court_id, formData.booking_date);
    } else {
      setAvailableSlots([]);
    }
  }, [formData.court_id, formData.booking_date, editingId, allTimeSlots]);

  const checkAvailability = async (courtId, dateStr) => {
    // Get all slots for this court
    const courtSlots = allTimeSlots.filter(s => s.court_id === courtId);

    // Get bookings for this court and date
    const { data: bookings } = await supabase
      .from('pm_bookings')
      .select(`
        id, 
        status,
        pm_booking_slots ( time_slot_id )
      `)
      .eq('court_id', courtId)
      .eq('booking_date', dateStr)
      .neq('status', 'cancelado');

    // Gather booked slot IDs (exclude the one we are currently editing!)
    let bookedSlotIds = new Set();
    if (bookings) {
      bookings.forEach(b => {
        if (b.id !== editingId) {
          b.pm_booking_slots.forEach(bs => bookedSlotIds.add(bs.time_slot_id));
        }
      });
    }

    const available = courtSlots.map(slot => ({
      ...slot,
      isBooked: bookedSlotIds.has(slot.id)
    }));

    setAvailableSlots(available);
  };

  const handleOpenModal = async (reservation = null) => {
    if (reservation) {
      setEditingId(reservation.id);
      
      // We need to fetch the full booking data to populate the slots
      const { data: fullBooking } = await supabase
        .from('pm_bookings')
        .select(`*, pm_booking_slots(time_slot_id)`)
        .eq('id', reservation.id)
        .single();

      if (fullBooking) {
        setFormData({
          customer_id: fullBooking.customer_id || '',
          new_customer_name: '',
          new_customer_phone: '',
          court_id: fullBooking.court_id,
          booking_date: fullBooking.booking_date,
          selected_slots: fullBooking.pm_booking_slots.map(bs => bs.time_slot_id),
          status: fullBooking.status,
          payment_method: fullBooking.payment_method,
          paid_amount: fullBooking.paid_amount.toString(),
          deposit_amount: fullBooking.deposit_amount.toString(),
          notes: fullBooking.notes || ''
        });
      }
    } else {
      setEditingId(null);
      setFormData({
        customer_id: 'new',
        new_customer_name: '',
        new_customer_phone: '',
        court_id: courts.length > 0 ? courts[0].id : '',
        booking_date: format(new Date(), 'yyyy-MM-dd'),
        selected_slots: [],
        status: 'confirmado',
        payment_method: 'efectivo',
        paid_amount: '0',
        deposit_amount: '10000',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleSlot = (slotId) => {
    setFormData(prev => {
      const isSelected = prev.selected_slots.includes(slotId);
      return {
        ...prev,
        selected_slots: isSelected 
          ? prev.selected_slots.filter(id => id !== slotId)
          : [...prev.selected_slots, slotId]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.selected_slots.length === 0) {
      alert('Debes seleccionar al menos un horario.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      let finalCustomerId = formData.customer_id;

      // 1. Create customer if new
      if (formData.customer_id === 'new') {
        if (!formData.new_customer_name || !formData.new_customer_phone) {
          throw new Error("Nombre y teléfono requeridos para nuevo cliente.");
        }
        const { data: newCust, error: custErr } = await supabase
          .from('pm_customers')
          .insert({
            full_name: formData.new_customer_name,
            phone: formData.new_customer_phone
          })
          .select()
          .single();
          
        if (custErr) throw custErr;
        finalCustomerId = newCust.id;
        
        // Refresh customers list
        fetchFormData();
      }

      // 2. Calculate Total Amount based on selected slots
      let totalAmount = 0;
      const slotsToInsert = [];
      formData.selected_slots.forEach(slotId => {
        const slotObj = availableSlots.find(s => s.id === slotId);
        if (slotObj) {
          totalAmount += Number(slotObj.price);
          slotsToInsert.push({
            time_slot_id: slotObj.id,
            slot_start: slotObj.slot_start,
            slot_end: slotObj.slot_end,
            price: slotObj.price
          });
        }
      });

      const bookingPayload = {
        customer_id: finalCustomerId,
        court_id: formData.court_id,
        booking_date: formData.booking_date,
        total_amount: totalAmount,
        deposit_amount: Number(formData.deposit_amount),
        paid_amount: Number(formData.paid_amount),
        payment_method: formData.payment_method,
        status: formData.status,
        notes: formData.notes,
        updated_at: new Date().toISOString()
      };

      let currentBookingId = editingId;

      if (editingId) {
        // Update booking
        const { error: updateErr } = await supabase
          .from('pm_bookings')
          .update(bookingPayload)
          .eq('id', editingId);
        if (updateErr) throw updateErr;

        // Delete old slots
        await supabase.from('pm_booking_slots').delete().eq('booking_id', editingId);
        
      } else {
        // Insert booking
        bookingPayload.booking_code = 'PM-' + Date.now().toString().slice(-6);
        const { data: newBooking, error: insErr } = await supabase
          .from('pm_bookings')
          .insert(bookingPayload)
          .select()
          .single();
        if (insErr) throw insErr;
        currentBookingId = newBooking.id;
      }

      // Insert new slots
      const slotsPayload = slotsToInsert.map(s => ({
        booking_id: currentBookingId,
        ...s
      }));
      
      const { error: slotErr } = await supabase.from('pm_booking_slots').insert(slotsPayload);
      if (slotErr) throw slotErr;

      // Handle Payments
      if (Number(formData.paid_amount) > 0) {
        if (editingId) {
          await supabase.from('pm_payments').delete().eq('booking_id', editingId);
        }
        await supabase.from('pm_payments').insert({
          booking_id: currentBookingId,
          amount: Number(formData.paid_amount),
          payment_method: formData.payment_method,
          payment_status: 'completado'
        });
      } else if (editingId) {
        await supabase.from('pm_payments').delete().eq('booking_id', editingId);
      }

      handleCloseModal();
      fetchReservations();
    } catch (error) {
      console.error('Error saving reservation:', error);
      alert(error.message || 'Error al guardar la reserva.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta reserva de forma permanente y liberar el turno?')) {
      try {
        const { error } = await supabase
          .from('pm_bookings')
          .delete()
          .eq('id', id);
        if (error) throw error;
        fetchReservations();
      } catch (error) {
        console.error('Error deleting reservation:', error);
        alert('No se pudo eliminar la reserva.');
      }
    }
  };

  const filteredReservations = reservations.filter(res => 
    (res.customer_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (res.booking_code?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (res.customer_phone || '').includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Reservas</h2>
          <p className="text-gray-400">Gestión de turnos y disponibilidades.</p>
        </div>
        
        <button onClick={() => handleOpenModal()} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" /> Nueva Reserva
        </button>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/5 flex gap-4 items-center bg-dark-800/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por cliente, código o teléfono..." 
              className="input-field pl-10 py-2 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-2 border border-white/10 rounded-xl hover:bg-white/5 transition-colors text-gray-300">
            <Filter className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
              <p>No se encontraron reservas</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-dark-800 text-gray-400 text-sm uppercase tracking-wider">
                  <th className="p-4 font-medium">Reserva / Cliente</th>
                  <th className="p-4 font-medium">Cancha & Horario</th>
                  <th className="p-4 font-medium">Pagos</th>
                  <th className="p-4 font-medium">Estado</th>
                  <th className="p-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredReservations.map((res, idx) => (
                  <motion.tr 
                    key={res.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="p-4">
                      <p className="font-semibold text-white">{res.customer_name}</p>
                      <p className="text-xs text-gray-400">{res.booking_code} • {res.customer_phone}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-white">{res.court_name}</p>
                      <p className="text-xs text-gray-400">
                        {res.booking_date && format(parseISO(res.booking_date), "dd/MM/yyyy")} • {res.start_time?.substring(0,5)} - {res.end_time?.substring(0,5)}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="text-white">${parseFloat(res.total_amount).toLocaleString('es-AR')}</p>
                      <p className={`text-xs ${res.pending_amount > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                        Pagado: ${parseFloat(res.paid_amount).toLocaleString('es-AR')}
                      </p>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(res.status)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenModal(res)} className="p-2 bg-dark-800 text-gray-300 hover:text-accent-400 rounded-lg border border-white/5 hover:border-accent-400/50 transition-colors shadow-sm" title="Editar Reserva">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(res.id)} className="p-2 bg-dark-800 text-gray-300 hover:text-red-400 rounded-lg border border-white/5 hover:border-red-400/50 transition-colors shadow-sm" title="Eliminar Reserva (Liberar Turno)">
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
        
        <div className="p-4 border-t border-white/5 bg-dark-800/30 flex justify-between items-center text-sm text-gray-400">
          <span>Mostrando {filteredReservations.length} reservas</span>
        </div>
      </div>

      {/* CRUD Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={handleCloseModal}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel w-full max-w-3xl rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col my-8"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-dark-800/80 sticky top-0 z-10">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <CalendarIcon className="w-6 h-6 text-primary-500" />
                  {editingId ? 'Editar Reserva' : 'Nueva Reserva'}
                </h3>
                <button onClick={handleCloseModal} className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <form id="reservationForm" onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* SECCIÓN CLIENTE */}
                  <div className="p-5 border border-white/5 rounded-2xl bg-dark-900/30">
                    <h4 className="text-sm font-semibold text-primary-400 uppercase tracking-wider mb-4">Datos del Cliente</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-gray-300">Seleccionar Cliente *</label>
                        <select 
                          name="customer_id" required value={formData.customer_id} onChange={handleChange}
                          className="input-field appearance-none"
                        >
                          <option value="new">+ Crear Nuevo Cliente</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.full_name} ({c.phone})</option>
                          ))}
                        </select>
                      </div>

                      {formData.customer_id === 'new' && (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Nombre Completo *</label>
                            <input 
                              type="text" name="new_customer_name" required={formData.customer_id === 'new'} 
                              value={formData.new_customer_name} onChange={handleChange}
                              className="input-field" placeholder="Ej: Lionel Messi"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Teléfono *</label>
                            <input 
                              type="tel" name="new_customer_phone" required={formData.customer_id === 'new'} 
                              value={formData.new_customer_phone} onChange={handleChange}
                              className="input-field" placeholder="Ej: 381 123 4567"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* SECCIÓN CANCHA Y HORARIO */}
                  <div className="p-5 border border-white/5 rounded-2xl bg-dark-900/30">
                    <h4 className="text-sm font-semibold text-accent-400 uppercase tracking-wider mb-4">Cancha y Horario</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Cancha *</label>
                        <select 
                          name="court_id" required value={formData.court_id} onChange={handleChange}
                          className="input-field appearance-none"
                        >
                          {courts.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Fecha *</label>
                        <input 
                          type="date" name="booking_date" required value={formData.booking_date} onChange={handleChange}
                          className="input-field" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Seleccionar Horarios *</label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-2">
                        {availableSlots.length === 0 ? (
                          <div className="col-span-full text-sm text-gray-400 py-2">No hay horarios configurados para esta cancha.</div>
                        ) : availableSlots.map(slot => {
                          const isSelected = formData.selected_slots.includes(slot.id);
                          const isBooked = slot.isBooked;
                          
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              disabled={isBooked}
                              onClick={() => toggleSlot(slot.id)}
                              className={`
                                flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all border
                                ${isBooked ? 'bg-dark-800/50 border-white/5 text-gray-600 cursor-not-allowed opacity-50' : 
                                  isSelected ? 'bg-primary-500 border-primary-500 text-dark-900 shadow-[0_0_10px_rgba(189,251,50,0.3)]' : 
                                  'bg-dark-700 border-white/10 text-gray-300 hover:border-primary-500/50 hover:text-white'
                                }
                              `}
                            >
                              <span className="font-bold text-sm">{slot.slot_start.substring(0, 5)}</span>
                              <span className="text-[10px] opacity-80 mt-0.5">a {slot.slot_end.substring(0, 5)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN PAGOS */}
                  <div className="p-5 border border-white/5 rounded-2xl bg-dark-900/30">
                    <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-4">Pagos y Estado</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Monto Abonado (ARS) *</label>
                        <input 
                          type="number" step="100" name="paid_amount" required value={formData.paid_amount} onChange={handleChange}
                          className="input-field" placeholder="0"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Método de Pago</label>
                        <select 
                          name="payment_method" required value={formData.payment_method} onChange={handleChange}
                          className="input-field appearance-none"
                        >
                          <option value="efectivo">Efectivo</option>
                          <option value="transferencia">Transferencia</option>
                          <option value="mercadopago">MercadoPago</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Estado de Reserva</label>
                        <select 
                          name="status" required value={formData.status} onChange={handleChange}
                          className="input-field appearance-none"
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="confirmado">Confirmado</option>
                          <option value="en_juego">En Juego</option>
                          <option value="finalizado">Finalizado</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mt-5">
                      <label className="text-sm font-medium text-gray-300">Notas Adicionales</label>
                      <input 
                        type="text" name="notes" value={formData.notes} onChange={handleChange}
                        className="input-field" placeholder="Ej: Traen pelotas propias..."
                      />
                    </div>
                  </div>

                </form>
              </div>
              
              <div className="p-5 border-t border-white/10 bg-dark-800/80 flex justify-end gap-3 sticky bottom-0">
                <button type="button" onClick={handleCloseModal} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" form="reservationForm" disabled={isSubmitting || formData.selected_slots.length === 0} className="btn-primary flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? 'Guardar Cambios' : 'Confirmar Reserva'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
