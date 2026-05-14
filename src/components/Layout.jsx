import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-dark-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col relative">
        {/* Background elements for depth */}
        <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] bg-primary-500/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-accent-500/5 blur-[120px] rounded-full pointer-events-none"></div>
        
        <Topbar />
        
        <main className="flex-1 overflow-y-auto p-8 relative z-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
