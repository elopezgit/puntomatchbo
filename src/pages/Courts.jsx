import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2, AlertCircle, Timer, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { differenceInMinutes, parse, format } from 'date-fns';

const getStatusColor = (status) => {
  switch (status) {
    case 'en_juego': return 'bg-primary-500 text-dark-900 shadow-[0_0_15px_rgba(189,251,50,0.5)]';
    case 'por_finalizar': return 'bg-yellow-400 text-dark-900 shadow-[0_0_15px_rgba(250,204,21,0.5)]';
    case 'finalizada': return 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]';
    case 'libre': return 'bg-dark-700 text-gray-400 border border-white/10';
    case 'reservada': return 'bg-accent-500 text-dark-900 shadow-[0_0_15px_rgba(0,240,255,0.5)]';
    default: return 'bg-dark-700';
  }
};

const getStatusBorder = (status) => {
  switch (status) {
    case 'en_juego': return 'border-primary-500/50';
    case 'por_finalizar': return 'border-yellow-400/50';
    case 'finalizada': return 'border-red-500/50';
    case 'libre': return 'border-white/10';
    case 'reservada': return 'border-accent-500/50';
    default: return 'border-white/10';
  }
};

export default function Courts() {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourts();
    
    // Subscribe to changes in bookings to refetch courts
    const subscription = supabase
      .channel('public:pm_bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pm_bookings' }, fetchCourts)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchCourts = async () => {
    const { data, error } = await supabase
      .from('v_pm_bo_court_status_today')
      .select('*')
      .order('court_name');

    if (error) {
      console.error('Error fetching courts:', error);
      setLoading(false);
      return;
    }

    const now = new Date();
    
    // Process data to calculate progress and refined status
    const processed = data.map(c => {
      let refinedStatus = c.court_status;
      let progress = 0;
      let remainingText = '';

      if (c.slot_start && c.slot_end) {
        const start = parse(c.slot_start, 'HH:mm:ss', new Date());
        const end = parse(c.slot_end, 'HH:mm:ss', new Date());
        const totalMins = differenceInMinutes(end, start);
        const elapsedMins = differenceInMinutes(now, start);
        const remainMins = differenceInMinutes(end, now);

        if (refinedStatus === 'en_juego') {
          progress = Math.max(0, Math.min(100, (elapsedMins / totalMins) * 100));
          if (remainMins <= 10 && remainMins > 0) {
            refinedStatus = 'por_finalizar';
          }
          remainingText = `${Math.max(0, remainMins)} min`;
        } else if (refinedStatus === 'finalizada') {
          progress = 100;
          remainingText = `Vencido ${Math.abs(remainMins)}m`;
        } else if (refinedStatus === 'reservada') {
          remainingText = `Inicia en ${Math.abs(elapsedMins)}m`;
        }
      }

      return {
        ...c,
        refinedStatus,
        progress,
        remainingText,
        displayStart: c.slot_start ? c.slot_start.substring(0, 5) : '',
        displayEnd: c.slot_end ? c.slot_end.substring(0, 5) : ''
      };
    });

    setCourts(processed);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Canchas en Vivo</h2>
          <p className="text-gray-400">Monitor de estado en tiempo real.</p>
        </div>
        
        <div className="flex gap-4">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-primary-500 shadow-[0_0_8px_#bdfb32]"></span> <span className="text-sm text-gray-300">En juego</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_8px_#facc15]"></span> <span className="text-sm text-gray-300">Por finalizar</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]"></span> <span className="text-sm text-gray-300">Tiempo vencido</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-accent-500 shadow-[0_0_8px_#00f0ff]"></span> <span className="text-sm text-gray-300">Reservada</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-dark-700 border border-white/20"></span> <span className="text-sm text-gray-300">Libre</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courts.map((court, idx) => (
          <motion.div
            key={court.court_id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className={`glass-panel rounded-2xl p-6 border-2 ${getStatusBorder(court.refinedStatus)} relative overflow-hidden`}
          >
            {court.refinedStatus !== 'libre' && (
              <div className={`absolute -top-20 -right-20 w-40 h-40 blur-[80px] rounded-full opacity-50 pointer-events-none
                ${court.refinedStatus === 'en_juego' ? 'bg-primary-500' : 
                  court.refinedStatus === 'por_finalizar' ? 'bg-yellow-400' : 
                  court.refinedStatus === 'reservada' ? 'bg-accent-500' : 'bg-red-500'}`}
              />
            )}

            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-bold text-white">{court.court_name}</h3>
              <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${getStatusColor(court.refinedStatus)}`}>
                {court.refinedStatus === 'en_juego' && <CheckCircle2 className="w-3 h-3" />}
                {court.refinedStatus === 'por_finalizar' && <Timer className="w-3 h-3" />}
                {court.refinedStatus === 'finalizada' && <AlertCircle className="w-3 h-3" />}
                {court.refinedStatus.replace('_', ' ')}
              </div>
            </div>

            {court.refinedStatus !== 'libre' ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400">Jugador Actual</p>
                  <p className="text-lg font-semibold text-white">{court.customer_name}</p>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-1 text-gray-300">
                    <Clock className="w-4 h-4" /> {court.displayStart} - {court.displayEnd}
                  </div>
                  <div className={`font-bold ${court.refinedStatus === 'finalizada' ? 'text-red-400' : 'text-primary-400'}`}>
                    {court.remainingText}
                  </div>
                </div>

                {court.refinedStatus !== 'reservada' && (
                  <div className="w-full bg-dark-900 rounded-full h-2 mt-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-1000 ${
                        court.refinedStatus === 'en_juego' ? 'bg-primary-500 shadow-[0_0_10px_#bdfb32]' : 
                        court.refinedStatus === 'por_finalizar' ? 'bg-yellow-400 shadow-[0_0_10px_#facc15]' : 
                        'bg-red-500 shadow-[0_0_10px_#ef4444]'
                      }`}
                      style={{ width: `${court.progress}%` }}
                    ></div>
                  </div>
                )}

                <div className="pt-4 mt-4 border-t border-white/5 flex gap-2">
                  <button className="flex-1 bg-dark-700 hover:bg-dark-600 text-white text-sm py-2 rounded-xl transition-colors">Ver Reserva</button>
                  {court.refinedStatus === 'finalizada' && (
                    <button className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold text-sm py-2 rounded-xl transition-colors">Liberar Cancha</button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4 flex flex-col h-[180px] justify-center items-center text-center">
                <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-8 h-8 text-gray-500" />
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Cancha disponible</p>
                </div>
                <button className="btn-primary mt-2 text-sm w-full absolute bottom-6 left-1/2 -translate-x-1/2 max-w-[80%]">
                  Nueva Reserva
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
