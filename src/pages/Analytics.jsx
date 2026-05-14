import { BarChart3, TrendingUp, TrendingDown, PieChart, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Analíticas Globales</h2>
          <p className="text-gray-400">Reportes avanzados y predicciones (Próximamente).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-10 rounded-2xl flex flex-col items-center justify-center text-center col-span-full min-h-[400px]">
          <div className="w-20 h-20 bg-primary-500/10 rounded-full flex items-center justify-center mb-6 relative">
            <BarChart3 className="w-10 h-10 text-primary-500" />
            <div className="absolute top-0 right-0 w-4 h-4 bg-accent-500 rounded-full animate-ping"></div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Motor de Analíticas en Construcción</h3>
          <p className="text-gray-400 max-w-lg mb-8">
            Estamos integrando inteligencia artificial para proyectar tus ingresos, determinar las horas pico exactas y perfilar a tus mejores clientes. Todo estará disponible en la próxima actualización.
          </p>
          
          <div className="flex gap-4">
            <div className="glass-card px-4 py-3 flex items-center gap-2 opacity-50">
              <PieChart className="w-5 h-5 text-accent-400" />
              <span className="text-sm font-medium">Uso por Cancha</span>
            </div>
            <div className="glass-card px-4 py-3 flex items-center gap-2 opacity-50">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium">Proyección Mensual</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
