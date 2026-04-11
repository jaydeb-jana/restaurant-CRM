import React, { useState, useEffect } from "react";
import { MenuItem, Category } from "../../types/index";
import { useCart } from "../../context/CartContext";
import { formatCurrency, cn } from "../../api/utils";
import { api } from "../../api/api";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Minus, Search, ShoppingBag } from "lucide-react";

const Menu = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const { addItem, updateQuantity, items: cartItems } = useCart();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cats, menuItems] = await Promise.all([
          api.get("categories"),
          api.get("menuItems")
        ]);
        setCategories(cats.map((c: any, i: number) => typeof c === 'string' ? { id: (c || "").toLowerCase().replace(/\s+/g, '-'), name: c, order: i } : c));
        setItems(menuItems);
      } catch (error) {
        console.error("Error fetching menu:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesCategory = activeCategory === "all" || item.categoryId === activeCategory;
    const matchesSearch = (item?.name || "").toLowerCase().includes((searchQuery || "").toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) return <div className="p-20 text-center">Loading Menu...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Our Menu</h1>
          <p className="text-[#686B78] text-sm md:text-base">Handcrafted flavors, delivered to your table.</p>
        </div>
        <div className="relative max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search for dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex overflow-x-auto pb-4 mb-12 no-scrollbar gap-4 sticky top-20 z-40 bg-[#F8F8F8]/80 backdrop-blur-sm pt-4">
        <button
          onClick={() => setActiveCategory("all")}
          className={cn(
            "px-5 sm:px-8 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap",
            activeCategory === "all" ? "bg-[#FC8019] text-white shadow-lg shadow-orange-200" : "bg-white text-[#686B78] border border-gray-100 hover:bg-gray-50"
          )}
        >
          All Items
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "px-8 py-3 rounded-full text-sm font-bold transition-all whitespace-nowrap",
              activeCategory === cat.id ? "bg-[#FC8019] text-white shadow-lg shadow-orange-200" : "bg-white text-[#686B78] border border-gray-100 hover:bg-gray-50"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item) => {
            const cartItem = cartItems.find(i => i.id === item.id);
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-[2rem] overflow-hidden border border-gray-50 shadow-sm hover:shadow-xl transition-all group"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={item.image || "/assets/images/placeholder_dish.jpg"}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  {item.isPopular && (
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-[#FC8019] uppercase tracking-wider">
                      Popular
                    </div>
                  )}
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold">{item.name}</h3>
                    <span className="text-lg font-bold text-[#FC8019]">{formatCurrency(item.price)}</span>
                  </div>
                  <p className="text-sm text-[#686B78] line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                  <div className="pt-4 flex items-center justify-between">
                    {cartItem ? (
                      <div className="flex items-center space-x-4 bg-gray-50 rounded-xl p-1">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm hover:text-[#FC8019]"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-bold w-4 text-center">{cartItem.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm hover:text-[#FC8019]"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addItem(item)}
                        className="w-full bg-[#FC8019] text-white py-3 rounded-xl font-bold hover:bg-[#FF5200] transition-all flex items-center justify-center space-x-2"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Add to Cart</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="text-gray-400 w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold mb-2">No items found</h3>
          <p className="text-[#686B78]">Try searching for something else or change the category.</p>
        </div>
      )}
    </div>
  );
};

export default Menu;
