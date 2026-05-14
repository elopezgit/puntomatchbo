import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Search, Filter, TrendingUp, TrendingDown, CreditCard, Banknote, Landmark, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';

export default function Finances() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [metrics, setMetrics] = useState({
    total: 0,
    efectivo: 0,
    transferencia: 0,
    mercadopago: 0
  });

  useEffect(() => {
    fetchFinances();
    
    const subscription = supabase
      .channel('public:pm_payments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pm_payments' }, fetchFinances)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchFinances = async () => {
    try {
      // Query payments and join with bookings and customers
      const { data, error } = await supabase
        .from('pm_payments')
        .select(`
          *,
          pm_bookings (
            booking_code,
            pm_customers (full_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const paymentsData = data || [];
      setPayments(paymentsData);

      // Calculate Metrics
      let total = 0, efectivo = 0, transferencia = 0, mercadopago = 0;
      paymentsData.forEach(p => {
        const amt = Number(p.amount);
        total += amt;
        if (p.payment_method === 'efectivo') efectivo += amt;
        else if (p.payment_method === 'transferencia') transferencia += amt;
        else if (p.payment_method === 'mercadopago') mercadopago += amt;
      });

      setMetrics({ total, efectivo, transferencia, mercadopago });

    } catch (error) {
      console.error('Error fetching finances:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(p => 
    (p.pm_bookings?.pm_customers?.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (p.pm_bookings?.booking_code?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (p.payment_method || '').includes(searchTerm.toLowerCase())
  );

  const getMethodIcon = (method) => {
    switch (method) {
      case 'efectivo': return <Banknote className="w-4 h-4 text-green-400" />;
      case 'transferencia': return <Landmark className="w-4 h-4 text-blue-400" />;
      case 'mercadopago': return <CreditCard className="w-4 h-4 text-accent-400" />;
      default: return <DollarSign className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Finanzas</h2>
          <p className="text-gray-400">Control de ingresos y transacciones.</p>
        </div>
        <button className="btn-secondary flex items-center gap-2">
          Exportar Excel
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 flex flex-col justify-center">
          <p className="text-sm font-medium text-gray-400 mb-1">Ingresos Totales</p>
          <h3 className="text-3xl font-bold text-white flex items-center gap-2">
            ${metrics.total.toLocaleString('es-AR')}
          </h3>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400 mb-1">Efectivo</p>
            <h3 className="text-xl font-bold text-green-400">${metrics.efectivo.toLocaleString('es-AR')}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-green-400/10 flex items-center justify-center">
            <Banknote className="w-5 h-5 text-green-400" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400 mb-1">Transferencias</p>
            <h3 className="text-xl font-bold text-blue-400">${metrics.transferencia.toLocaleString('es-AR')}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-400/10 flex items-center justify-center">
            <Landmark className="w-5 h-5 text-blue-400" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400 mb-1">MercadoPago</p>
            <h3 className="text-xl font-bold text-accent-400">${metrics.mercadopago.toLocaleString('es-AR')}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-accent-500" />
          </div>
        </motion.div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/5 flex gap-4 items-center bg-dark-800/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por cliente, reserva o método..." 
              className="input-field pl-10 py-2 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-2 border border-white/10 rounded-xl hover:bg-white/5 transition-colors text-gray-300">
            <Filter className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-[400px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
              <DollarSign className="w-16 h-16 mb-4 opacity-20" />
              <p>No se encontraron transacciones</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-dark-800 text-gray-400 text-sm uppercase tracking-wider">
                  <th className="p-4 font-medium">Fecha y Hora</th>
                  <th className="p-4 font-medium">Concepto / Cliente</th>
                  <th className="p-4 font-medium">Método</th>
                  <th className="p-4 font-medium">Monto</th>
                  <th className="p-4 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPayments.map((payment, idx) => (
                  <motion.tr 
                    key={payment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4">
                      <p className="font-medium text-white">{format(parseISO(payment.created_at), 'dd/MM/yyyy')}</p>
                      <p className="text-xs text-gray-400">{format(parseISO(payment.created_at), 'HH:mm')} hs</p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-white">Reserva {payment.pm_bookings?.booking_code}</p>
                      <p className="text-xs text-gray-400">{payment.pm_bookings?.pm_customers?.full_name}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getMethodIcon(payment.payment_method)}
                        <span className="text-gray-300 capitalize">{payment.payment_method}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-white flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-primary-500" />
                        ${Number(payment.amount).toLocaleString('es-AR')}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold border border-green-500/30">
                        {payment.payment_status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
