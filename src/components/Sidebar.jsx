import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  Store, 
  CreditCard, 
  BarChart3,
  LogOut,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/courts', icon: Activity, label: 'Canchas (En vivo)' },
  { path: '/reservations', icon: CalendarDays, label: 'Reservas' },
  { path: '/finances', icon: CreditCard, label: 'Finanzas' },
  { path: '/shop', icon: Store, label: 'Shop / Stock' },
  { path: '/customers', icon: Users, label: 'Clientes' },
  { path: '/analytics', icon: BarChart3, label: 'Analíticas' },
];

export default function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <aside className="w-64 h-screen glass-panel fixed left-0 top-0 flex flex-col z-40 border-r border-white/5">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center border border-primary-500/30">
          <Activity className="w-6 h-6 text-primary-500" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Punto<span className="neon-text">Match</span></h2>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link key={item.path} to={item.path} className="block relative">
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-white/5 rounded-xl border border-white/10"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive ? 'text-primary-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'drop-shadow-[0_0_8px_rgba(189,251,50,0.5)]' : ''}`} />
                <span className="font-medium text-sm">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5 mt-auto">
        <button 
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
