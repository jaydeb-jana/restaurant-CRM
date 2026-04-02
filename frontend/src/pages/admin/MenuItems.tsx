import React, { useState, useEffect } from "react";
import { MenuItem, Category } from "../../types/index";
import { formatCurrency } from "../../api/utils";
import { api } from "../../api/api";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Image as ImageIcon,
  Check,
  X,
  Filter,
  Star,
  MoreVertical
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const AdminMenuItems = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    image: "",
    isAvailable: true,
    isPopular: false
  });

  const fetchData = async () => {
    try {
      const [items, cats] = await Promise.all([
        api.get("menuItems"),
        api.get("categories")
      ]);
      setMenuItems(items);
      setCategories(cats.map((c: any, i: number) => typeof c === 'string' ? { id: c.toLowerCase().replace(/\s+/g, '-'), name: c, order: i } : c));
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      price: parseFloat(formData.price as string)
    };

    try {
      if (editingItem) {
        await api.put("menuItems", editingItem.id, data);
      } else {
        await api.post("menuItems", data);
      }
      await fetchData();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving menu item:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        await api.delete("menuItems", id);
        await fetchData();
      } catch (error) {
        console.error("Error deleting menu item:", error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      categoryId: "",
      image: "",
      isAvailable: true,
      isPopular: false
    });
    setEditingItem(null);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      categoryId: item.categoryId,
      image: item.image,
      isAvailable: item.isAvailable,
      isPopular: item.isPopular
    });
    setIsModalOpen(true);
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                         item.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FC8019]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-gray-500 mt-1">Add, edit or remove items from your digital menu</p>
        </div>
        
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center space-x-2 px-6 py-3 bg-[#FC8019] text-white rounded-2xl font-bold hover:bg-[#FF5200] transition-all shadow-lg shadow-[#FC8019]/20"
        >
          <Plus className="w-5 h-5" />
          <span>Add New Item</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Search menu items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FC8019]/20 focus:border-[#FC8019] transition-all"
          />
        </div>
        
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <button 
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all",
              selectedCategory === "all" ? "bg-gray-900 text-white" : "bg-white text-gray-500 border border-gray-100 hover:bg-gray-50"
            )}
          >
            All Categories
          </button>
          {categories.map(cat => (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all",
                selectedCategory === cat.id ? "bg-gray-900 text-white" : "bg-white text-gray-500 border border-gray-100 hover:bg-gray-50"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-xl transition-all"
            >
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={item.image || "https://picsum.photos/seed/food/800/600"} 
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 flex space-x-2">
                  {item.isPopular && (
                    <div className="bg-yellow-400 text-white p-2 rounded-xl shadow-lg">
                      <Star className="w-4 h-4 fill-current" />
                    </div>
                  )}
                  <div className={cn(
                    "px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-lg",
                    item.isAvailable ? "bg-green-500 text-white" : "bg-red-500 text-white"
                  )}>
                    {item.isAvailable ? "Available" : "Sold Out"}
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                  <span className="text-[#FC8019] font-black">{formatCurrency(item.price)}</span>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2 mb-6 h-10">{item.description}</p>
                
                <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {categories.find(c => c.id === item.categoryId)?.name || "Uncategorized"}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => openEditModal(item)}
                      className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 md:p-12">
                <div className="flex justify-between items-center mb-10">
                  <h2 className="text-3xl font-bold text-gray-900">
                    {editingItem ? "Edit Menu Item" : "Add New Item"}
                  </h2>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-gray-900 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Item Name</label>
                      <input 
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FC8019]/20 transition-all font-medium"
                        placeholder="e.g. Butter Chicken"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Price</label>
                      <input 
                        required
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FC8019]/20 transition-all font-medium"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Description</label>
                    <textarea 
                      required
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FC8019]/20 transition-all font-medium resize-none"
                      placeholder="Describe the dish..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Category</label>
                      <select 
                        required
                        value={formData.categoryId}
                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FC8019]/20 transition-all font-medium appearance-none"
                      >
                        <option value="">Select Category</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Image URL</label>
                      <input 
                        type="text"
                        value={formData.image}
                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FC8019]/20 transition-all font-medium"
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-8 pt-4">
                    <label className="flex items-center space-x-3 cursor-pointer group">
                      <div 
                        onClick={() => setFormData({ ...formData, isAvailable: !formData.isAvailable })}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative",
                          formData.isAvailable ? "bg-green-500" : "bg-gray-200"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                          formData.isAvailable ? "left-7" : "left-1"
                        )} />
                      </div>
                      <span className="text-sm font-bold text-gray-700">Available</span>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer group">
                      <div 
                        onClick={() => setFormData({ ...formData, isPopular: !formData.isPopular })}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative",
                          formData.isPopular ? "bg-yellow-400" : "bg-gray-200"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                          formData.isPopular ? "left-7" : "left-1"
                        )} />
                      </div>
                      <span className="text-sm font-bold text-gray-700">Popular Item</span>
                    </label>
                  </div>

                  <div className="pt-8">
                    <button 
                      type="submit"
                      className="w-full bg-[#FC8019] text-white py-5 rounded-2xl font-bold hover:bg-[#FF5200] transition-all shadow-xl shadow-[#FC8019]/20"
                    >
                      {editingItem ? "Update Item" : "Create Item"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminMenuItems;

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
