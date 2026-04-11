import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Order } from "../../types/index";
import { formatCurrency, cn } from "../../api/utils";
import { api } from "../../api/api";
import { motion } from "motion/react";
import { CheckCircle2, Clock, Utensils, ChefHat, Check } from "lucide-react";

const OrderTracking = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = async () => {
    if (!orderId) return;
    try {
      const orders = await api.get("orders");
      const foundOrder = orders.find((o: any) => o.id === orderId);
      if (foundOrder) {
        setOrder(foundOrder);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching order:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  if (loading) return <div className="p-20 text-center">Loading Order Status...</div>;
  if (!order) return <div className="p-20 text-center">Order not found.</div>;

  const steps = [
    { status: "pending", label: "Order Placed", icon: CheckCircle2, desc: "We've received your order." },
    { status: "accepted", label: "Accepted", icon: Check, desc: "The kitchen has accepted your order." },
    { status: "preparing", label: "Preparing", icon: ChefHat, desc: "Our chefs are crafting your meal." },
    { status: "ready", label: "Ready", icon: Utensils, desc: "Your food is ready to be served!" },
    { status: "served", label: "Served", icon: CheckCircle2, desc: "Enjoy your meal!" }
  ];

  const currentStepIndex = steps.findIndex(s => s.status === order.status);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl border border-gray-50 text-center mb-12">
        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="text-[#FC8019] w-10 h-10 animate-pulse" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Tracking Your Order</h1>
        <p className="text-[#686B78]">Order ID: <span className="font-mono font-bold text-[#1C1C1C]">{order.id.slice(-6).toUpperCase()}</span></p>
        
        <div className="mt-12 space-y-8 relative">
          {/* Progress Line */}
          <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-gray-100" />
          
          {steps.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            
            return (
              <div key={step.status} className="flex items-start space-x-6 text-left relative z-10">
                <div className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500",
                  isCompleted ? "bg-[#FC8019] text-white shadow-lg shadow-orange-100" : "bg-white border-2 border-gray-100 text-gray-300"
                )}>
                  <step.icon className={cn("w-6 h-6", isCurrent && "animate-bounce")} />
                </div>
                <div className="pt-1">
                  <h3 className={cn("font-bold text-lg", isCompleted ? "text-[#1C1C1C]" : "text-gray-300")}>
                    {step.label}
                  </h3>
                  <p className={cn("text-sm", isCompleted ? "text-[#686B78]" : "text-gray-200")}>
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-gray-50">
        <h3 className="text-xl font-bold mb-6">Order Details</h3>
        <div className="space-y-4">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between items-center text-sm">
              <div className="flex items-center space-x-3">
                <span className="font-bold text-[#FC8019]">{item.quantity}x</span>
                <span className="text-[#1C1C1C] font-medium">{item.name}</span>
              </div>
              <span className="text-[#686B78]">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-gray-100 pt-4 flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-[#FC8019]">{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-12 text-center">
        <Link to="/menu" className="text-[#FC8019] font-bold hover:underline">
          Order something else?
        </Link>
      </div>
    </div>
  );
};

export default OrderTracking;
