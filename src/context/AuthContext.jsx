import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for persistent session
    const storedUser = localStorage.getItem('pm_admin_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Error parsing stored user", e);
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const { data, error } = await supabase.rpc('pm_admin_login', {
        p_username: username,
        p_password: password
      });

      if (error) {
        console.error("Login error:", error);
        return { success: false, message: error.message };
      }

      if (data && data.length > 0 && data[0].success) {
        const userData = {
          id: data[0].admin_id,
          username: data[0].username,
          fullName: data[0].full_name,
          role: data[0].role
        };
        setUser(userData);
        localStorage.setItem('pm_admin_user', JSON.stringify(userData));
        return { success: true };
      } else {
        return { success: false, message: data?.[0]?.message || 'Credenciales inválidas' };
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      return { success: false, message: 'Error de red al conectar' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pm_admin_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
