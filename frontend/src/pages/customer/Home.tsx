import React from "react";
import { Link } from "react-router-dom";
import { UtensilsCrossed, ArrowRight, Star, Clock, MapPin, Phone } from "lucide-react";
import { motion } from "motion/react";
import { api } from "../../api/api";

const Home = () => {
  const [popularItems, setPopularItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchPopular = async () => {
      try {
        const items = await api.get("menuItems");
        setPopularItems(items.filter((i: any) => i.isPopular).slice(0, 3));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPopular();
  }, []);

  return (
    <div className="space-y-24 pb-24">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 pt-12 md:pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center space-x-2 bg-orange-50 text-[#FC8019] px-4 py-2 rounded-full text-sm font-bold">
              <span className="w-2 h-2 bg-[#FC8019] rounded-full animate-pulse" />
              <span>Premium Dining Experience</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight leading-[0.9] text-[#1C1C1C]">
              Spice <span className="text-[#FC8019]">Kraft</span>
            </h1>
            <p className="text-2xl font-medium text-[#1C1C1C] italic">
              "Where tradition meets digital intelligence."
            </p>
            <p className="text-xl text-[#686B78] max-w-lg leading-relaxed">
              Experience a seamless blend of gourmet flavors and effortless digital ordering. Scan, Select, and Savor.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link 
                to="/menu" 
                className="bg-[#FC8019] text-white px-10 py-6 rounded-2xl text-lg font-bold hover:bg-[#FF5200] transition-all shadow-2xl shadow-orange-200 hover:-translate-y-1 flex items-center justify-center space-x-2"
              >
                <span>Explore Menu</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                to="/reservation" 
                className="bg-white text-[#1C1C1C] border-2 border-gray-100 px-10 py-6 rounded-2xl text-lg font-bold hover:bg-gray-50 transition-all hover:border-gray-200 flex items-center justify-center"
              >
                Reserve Table
              </Link>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <div className="aspect-[4/5] bg-orange-100 rounded-[4rem] overflow-hidden shadow-2xl rotate-2">
              <img 
                src="https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80" 
                alt="Signature Dish" 
                className="w-full h-full object-cover -rotate-2 scale-110"
                referrerPolicy="no-referrer"
              />
            </div>
            
            {/* Floating Info Cards */}
            <div className="absolute -bottom-10 -left-10 bg-white p-6 rounded-3xl shadow-2xl border border-gray-50 max-w-[240px] animate-bounce-slow">
              <div className="flex items-center space-x-4 mb-2">
                <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Star className="text-white w-5 h-5 fill-current" />
                </div>
                <div>
                  <p className="font-bold text-sm">4.9/5.0</p>
                  <p className="text-[10px] text-[#686B78] uppercase font-bold tracking-wider">Customer Rating</p>
                </div>
              </div>
            </div>

            <div className="absolute top-20 -right-10 bg-white p-6 rounded-3xl shadow-2xl border border-gray-50 animate-float">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <Clock className="text-white w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Fast Service</p>
                  <p className="text-[10px] text-[#686B78] uppercase font-bold tracking-wider">Avg. 15-20 Mins</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick Stats / Features */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { icon: UtensilsCrossed, title: "Artisanal Recipes", desc: "Handcrafted by top-tier chefs with premium local ingredients." },
              { icon: Clock, title: "Instant Ordering", desc: "Scan the QR at your table and order instantly without waiting." },
              { icon: Star, title: "Premium Ambience", desc: "A perfect blend of modern aesthetics and warm hospitality." }
            ].map((feature, i) => (
              <div key={i} className="text-center space-y-4 p-8 rounded-3xl hover:bg-gray-50 transition-colors">
                <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto">
                  <feature.icon className="text-[#FC8019] w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold">{feature.title}</h3>
                <p className="text-[#686B78] leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Dishes Preview */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-4xl font-bold mb-4">Chef's Specials</h2>
            <p className="text-[#686B78]">Our most loved signature dishes.</p>
          </div>
          <Link to="/menu" className="text-[#FC8019] font-bold flex items-center space-x-2 hover:underline">
            <span>View All</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {loading ? (
            <div className="col-span-3 text-center py-10">Loading specials...</div>
          ) : popularItems.map((dish, i) => (
            <div key={i} className="group cursor-pointer">
              <div className="aspect-[4/3] rounded-[2.5rem] overflow-hidden mb-6 shadow-lg">
                <img 
                  src={dish.image || "https://picsum.photos/seed/food/800/600"} 
                  alt={dish.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">{dish.name}</h3>
                <span className="text-[#FC8019] font-bold">₹{dish.price}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Location & Contact */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="bg-[#1C1C1C] rounded-[4rem] p-12 md:p-20 text-white grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold leading-tight">Visit Us for an <br /> Unforgettable Meal.</h2>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <MapPin className="text-[#FC8019] w-6 h-6 shrink-0" />
                <p className="text-gray-400">123 Spice Lane, Gourmet District, <br /> Foodie City, PIN 400001</p>
              </div>
              <div className="flex items-center space-x-4">
                <Phone className="text-[#FC8019] w-6 h-6 shrink-0" />
                <p className="text-gray-400">+91 98765 43210</p>
              </div>
            </div>
            <button className="bg-[#FC8019] text-white px-8 py-4 rounded-2xl font-bold hover:bg-[#FF5200] transition-all">
              Get Directions
            </button>
          </div>
          <div className="h-[400px] bg-gray-800 rounded-[3rem] overflow-hidden">
            {/* Placeholder for Map */}
            <div className="w-full h-full flex items-center justify-center text-gray-500 italic">
              Interactive Map Loading...
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
