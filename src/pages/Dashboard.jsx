import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Activity, DollarSign, Calendar, TrendingUp, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';

// Mock chart data for now since we don't have historical data in the current views yet
const chartData = [
  { time: '10:00', ingresos: 4000 },
  { time: '12:00', ingresos: 3000 },
  { time: '14:00', ingresos: 2000 },
  { time: '16:00', ingresos: 2780 },
  { time: '18:00', ingresos: 6890 },
  { time: '20:00', ingresos: 8390 },
  { time: '22:00', ingresos: 9490 },
];

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    turnosHoy: 0,
    ingresosHoy: 0,
    canchasActivas: 0,
    totalCanchas: 0,
    nuevosClientes: 12 // Hardcoded as placeholder for now
  });
  const [proximosTurnos, setProximosTurnos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch bookings for today
      const { data: bookingsData } = await supabase
        .from('v_pm_bo_bookings_detail')
        .select('*')
        .eq('booking_date', new Date().toISOString().split('T')[0]);

      // Fetch courts status
      const { data: courtsData } = await supabase
        .from('v_pm_bo_court_status_today')
        .select('*');

      let turnosHoy = 0;
      let ingresosHoy = 0;
      let próximos = [];

      if (bookingsData) {
        turnosHoy = bookingsData.length;
        ingresosHoy = bookingsData.reduce((acc, curr) => acc + Number(curr.paid_amount || 0), 0);
        próximos = bookingsData
          .filter(b => b.status === 'confirmado' || b.status === 'pendiente')
          .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
          .slice(0, 4);
      }

      let canchasActivas = 0;
      let totalCanchas = 0;

      if (courtsData) {
        totalCanchas = courtsData.length;
        canchasActivas = courtsData.filter(c => c.court_status === 'en_juego').length;
      }

      setMetrics({
        turnosHoy,
        ingresosHoy,
        canchasActivas,
        totalCanchas,
        nuevosClientes: 12
      });
      setProximosTurnos(próximos);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label: 'Turnos Hoy', value: metrics.turnosHoy.toString(), icon: Calendar, color: 'text-primary-500', bg: 'bg-primary-500/10' },
    { label: 'Ingresos del Día', value: `$${metrics.ingresosHoy.toLocaleString('es-AR')}`, icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Canchas Activas', value: `${metrics.canchasActivas}/${metrics.totalCanchas}`, icon: Activity, color: 'text-accent-500', bg: 'bg-accent-500/10' },
    { label: 'Nuevos Clientes', value: `+${metrics.nuevosClientes}`, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Visión General</h2>
          <p className="text-gray-400">Control operativo en tiempo real.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card p-6 flex items-center justify-between group cursor-pointer"
            >
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">{stat.label}</p>
                <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.bg} group-hover:scale-110 transition-transform duration-300`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 glass-panel rounded-2xl p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-500" />
              Ingresos de Hoy
            </h3>
            <span className="text-sm text-green-400 bg-green-400/10 px-3 py-1 rounded-full">+14% vs ayer</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#bdfb32" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#bdfb32" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="time" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333', borderRadius: '12px' }}
                  itemStyle={{ color: '#bdfb32' }}
                />
                <Area type="monotone" dataKey="ingresos" stroke="#bdfb32" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Next Turns */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="glass-panel rounded-2xl p-6 flex flex-col"
        >
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent-500" />
            Próximos Turnos
          </h3>
          
          <div className="flex-1 space-y-4 overflow-y-auto pr-2">
            {proximosTurnos.length === 0 ? (
              <p className="text-gray-400 text-sm text-center mt-8">No hay próximos turnos registrados</p>
            ) : proximosTurnos.map((turno) => (
              <div key={turno.id} className="bg-dark-800/80 p-4 rounded-xl border border-white/5 hover:border-primary-500/30 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-white">{turno.customer_name} ({turno.court_name})</h4>
                    <p className="text-xs text-gray-400">Tel: {turno.customer_phone}</p>
                  </div>
                  <span className="text-xs font-bold text-dark-900 bg-primary-500 px-2 py-1 rounded-md">
                    {turno.start_time?.substring(0, 5)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-gray-400">Pagado: ${parseFloat(turno.paid_amount).toLocaleString('es-AR')}</span>
                  {turno.pending_amount > 0 && (
                    <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full">
                      Pendiente ${parseFloat(turno.pending_amount).toLocaleString('es-AR')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <button className="w-full mt-4 py-3 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors">
            Ver todas las reservas
          </button>
        </motion.div>
      </div>
    </div>
  );
}
