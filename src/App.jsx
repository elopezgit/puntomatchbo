import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Courts from './pages/Courts';
import Reservations from './pages/Reservations';
import Finances from './pages/Finances';
import Shop from './pages/Shop';
import Customers from './pages/Customers';
import Analytics from './pages/Analytics';

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="courts" element={<Courts />} />
          <Route path="reservations" element={<Reservations />} />
          <Route path="finances" element={<Finances />} />
          <Route path="shop" element={<Shop />} />
          <Route path="customers" element={<Customers />} />
          <Route path="analytics" element={<Analytics />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
