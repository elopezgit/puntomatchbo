import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Filter, Edit2, Trash2, Package, Tag, Loader2, X, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    description: '',
    price: '',
    stock: '',
    stock_min: '3',
    image_url: '',
    is_new: false,
    is_offer: false,
    active: true
  });

  useEffect(() => {
    fetchData();
    
    const subscription = supabase
      .channel('public:pm_products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pm_products' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch categories for the select dropdown
      const { data: catsData, error: catsError } = await supabase
        .from('pm_product_categories')
        .select('*')
        .order('name');
      
      if (catsError) throw catsError;
      setCategories(catsData || []);

      // Fetch products with category details
      const { data: prodsData, error: prodsError } = await supabase
        .from('pm_products')
        .select(`
          *,
          pm_product_categories (name)
        `)
        .order('created_at', { ascending: false });

      if (prodsError) throw prodsError;
      setProducts(prodsData || []);
    } catch (error) {
      console.error('Error fetching shop data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingId(product.id);
      setFormData({
        name: product.name || '',
        category_id: product.category_id || '',
        description: product.description || '',
        price: product.price || '',
        stock: product.stock || '',
        stock_min: product.stock_min || '3',
        image_url: product.image_url || '',
        is_new: product.is_new || false,
        is_offer: product.is_offer || false,
        active: product.active ?? true
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        category_id: categories.length > 0 ? categories[0].id : '',
        description: '',
        price: '',
        stock: '',
        stock_min: '3',
        image_url: '',
        is_new: false,
        is_offer: false,
        active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const payload = {
        name: formData.name,
        category_id: formData.category_id,
        description: formData.description,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock, 10),
        stock_min: parseInt(formData.stock_min, 10),
        image_url: formData.image_url,
        is_new: formData.is_new,
        is_offer: formData.is_offer,
        active: formData.active,
        updated_at: new Date().toISOString()
      };

      if (editingId) {
        const { error } = await supabase
          .from('pm_products')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pm_products')
          .insert(payload);
        if (error) throw error;
      }
      
      handleCloseModal();
      fetchData();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error al guardar el producto. Verifica los datos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      try {
        const { error } = await supabase
          .from('pm_products')
          .delete()
          .eq('id', id);
        if (error) throw error;
        fetchData();
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('No se pudo eliminar el producto porque puede estar relacionado a otras tablas.');
      }
    }
  };

  const filteredProducts = products.filter(p => 
    (p.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (p.pm_product_categories?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 relative h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Shop / Stock</h2>
          <p className="text-gray-400">Gestión de inventario y productos públicos.</p>
        </div>
        
        <button onClick={() => handleOpenModal()} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" /> Nuevo Producto
        </button>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/5 flex gap-4 items-center bg-dark-800/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar producto o categoría..." 
              className="input-field pl-10 py-2 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400 border border-white/10 rounded-xl px-4 py-2 bg-dark-900/50">
            <Package className="w-4 h-4" /> Total: {products.length}
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-[400px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
              <Package className="w-16 h-16 mb-4 opacity-20" />
              <p>No se encontraron productos</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-dark-800 text-gray-400 text-sm uppercase tracking-wider">
                  <th className="p-4 font-medium w-16">Img</th>
                  <th className="p-4 font-medium">Producto</th>
                  <th className="p-4 font-medium">Categoría</th>
                  <th className="p-4 font-medium">Precio</th>
                  <th className="p-4 font-medium">Stock</th>
                  <th className="p-4 font-medium">Estado</th>
                  <th className="p-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredProducts.map((prod, idx) => (
                  <motion.tr 
                    key={prod.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="p-4">
                      {prod.image_url ? (
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10 shadow-lg group-hover:shadow-primary-500/20 transition-all">
                          <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-dark-700 border border-white/10 flex items-center justify-center shadow-lg">
                          <ImageIcon className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-white truncate max-w-[200px]">{prod.name}</p>
                      <div className="flex gap-2 mt-1">
                        {prod.is_new && <span className="text-[10px] bg-accent-500/20 text-accent-400 px-2 py-0.5 rounded-full uppercase font-bold">Nuevo</span>}
                        {prod.is_offer && <span className="text-[10px] bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full uppercase font-bold">Oferta</span>}
                      </div>
                    </td>
                    <td className="p-4 text-gray-300">
                      <span className="flex items-center gap-1.5 bg-dark-700 px-3 py-1 rounded-full text-xs w-max">
                        <Tag className="w-3 h-3" /> {prod.pm_product_categories?.name || 'Sin Categoría'}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-white">
                      ${parseFloat(prod.price).toLocaleString('es-AR')}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${prod.stock <= prod.stock_min ? 'text-red-400' : 'text-green-400'}`}>
                          {prod.stock}
                        </span>
                        <span className="text-xs text-gray-500">(Mín: {prod.stock_min})</span>
                      </div>
                      {prod.stock <= prod.stock_min && (
                        <span className="text-[10px] text-red-400 uppercase font-bold">Stock Bajo</span>
                      )}
                    </td>
                    <td className="p-4">
                      {prod.active ? (
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold border border-green-500/30">Activo</span>
                      ) : (
                        <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-semibold border border-red-500/30">Inactivo</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenModal(prod)} className="p-2 bg-dark-800 text-gray-300 hover:text-accent-400 rounded-lg border border-white/5 hover:border-accent-400/50 transition-colors shadow-sm" title="Editar Producto">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(prod.id)} className="p-2 bg-dark-800 text-gray-300 hover:text-red-400 rounded-lg border border-white/5 hover:border-red-400/50 transition-colors shadow-sm" title="Eliminar Producto">
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
      </div>

      {/* CRUD Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={handleCloseModal}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-panel w-full max-w-2xl rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col max-h-[90vh]"
              >
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-dark-800/80">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Package className="w-6 h-6 text-primary-500" />
                    {editingId ? 'Editar Producto' : 'Nuevo Producto'}
                  </h3>
                  <button onClick={handleCloseModal} className="text-gray-400 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar">
                  <form id="productForm" onSubmit={handleSubmit} className="space-y-5">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Nombre del Producto *</label>
                        <input 
                          type="text" name="name" required value={formData.name} onChange={handleChange}
                          className="input-field" placeholder="Ej: Paleta Pro Carbon"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Categoría *</label>
                        <select 
                          name="category_id" required value={formData.category_id} onChange={handleChange}
                          className="input-field appearance-none"
                        >
                          <option value="" disabled>Seleccione una categoría</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Precio (ARS) *</label>
                        <input 
                          type="number" step="0.01" name="price" required value={formData.price} onChange={handleChange}
                          className="input-field" placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Stock Actual *</label>
                        <input 
                          type="number" name="stock" required value={formData.stock} onChange={handleChange}
                          className="input-field" placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Stock Mínimo *</label>
                        <input 
                          type="number" name="stock_min" required value={formData.stock_min} onChange={handleChange}
                          className="input-field" placeholder="3"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Descripción</label>
                      <textarea 
                        name="description" value={formData.description} onChange={handleChange}
                        className="input-field resize-none h-24" placeholder="Detalles del producto..."
                      ></textarea>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">URL de Imagen</label>
                      <div className="flex gap-3 items-center">
                        <input 
                          type="url" name="image_url" value={formData.image_url} onChange={handleChange}
                          className="input-field" placeholder="https://..."
                        />
                        {formData.image_url && (
                          <img src={formData.image_url} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-white/10" onError={(e) => e.target.style.display = 'none'} />
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-white/10 bg-dark-900/30 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input type="checkbox" name="active" checked={formData.active} onChange={handleChange} className="sr-only peer" />
                          <div className="w-5 h-5 border-2 border-gray-500 rounded peer-checked:bg-green-500 peer-checked:border-green-500 transition-all"></div>
                          <CheckCircle2 className="w-3 h-3 text-dark-900 absolute opacity-0 peer-checked:opacity-100" />
                        </div>
                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Activo (Visible)</span>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input type="checkbox" name="is_new" checked={formData.is_new} onChange={handleChange} className="sr-only peer" />
                          <div className="w-5 h-5 border-2 border-gray-500 rounded peer-checked:bg-accent-500 peer-checked:border-accent-500 transition-all"></div>
                          <CheckCircle2 className="w-3 h-3 text-dark-900 absolute opacity-0 peer-checked:opacity-100" />
                        </div>
                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Etiqueta "Nuevo"</span>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input type="checkbox" name="is_offer" checked={formData.is_offer} onChange={handleChange} className="sr-only peer" />
                          <div className="w-5 h-5 border-2 border-gray-500 rounded peer-checked:bg-primary-500 peer-checked:border-primary-500 transition-all"></div>
                          <CheckCircle2 className="w-3 h-3 text-dark-900 absolute opacity-0 peer-checked:opacity-100" />
                        </div>
                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">En Oferta</span>
                      </label>
                    </div>

                  </form>
                </div>
                
                <div className="p-5 border-t border-white/10 bg-dark-800/80 flex justify-end gap-3">
                  <button type="button" onClick={handleCloseModal} className="btn-secondary">
                    Cancelar
                  </button>
                  <button type="submit" form="productForm" disabled={isSubmitting} className="btn-primary flex items-center gap-2 disabled:opacity-70">
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingId ? 'Guardar Cambios' : 'Crear Producto'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
