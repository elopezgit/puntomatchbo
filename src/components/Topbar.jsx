import { Bell, Search, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Topbar() {
  const { user } = useAuth();
  const currentDate = format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es });

  return (
    <header className="h-20 glass-panel border-b border-white/5 sticky top-0 z-30 px-8 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-semibold capitalize">{currentDate}</h1>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative hidden md:block">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar reservas, clientes..." 
            className="input-field pl-10 py-2 w-64 bg-dark-900/50"
          />
        </div>

        <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
          <Bell className="w-6 h-6" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-dark-900"></span>
        </button>

        <div className="flex items-center gap-3 pl-6 border-l border-white/10">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-white">{user?.fullName || 'Admin'}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role || 'Recepcionista'}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-600 to-accent-500 flex items-center justify-center shadow-lg">
            <UserCircle className="w-6 h-6 text-dark-900" />
          </div>
        </div>
      </div>
    </header>
  );
}
