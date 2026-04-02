const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000/api/v1";

export const api = {
  get: async (collection: string) => {
    const res = await fetch(`${API_BASE}/db/${collection}`);
    return res.json();
  },
  post: async (collection: string, data: any) => {
    const res = await fetch(`${API_BASE}/db/${collection}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  put: async (collection: string, id: string, data: any) => {
    const res = await fetch(`${API_BASE}/db/${collection}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  delete: async (collection: string, id: string) => {
    const res = await fetch(`${API_BASE}/db/${collection}/${id}`, {
      method: "DELETE",
    });
    return res.json();
  },
  getSettings: async () => {
    const res = await fetch(`${API_BASE}/settings`);
    return res.json();
  },
  updateSettings: async (data: any) => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  whatsapp: {
    getStatus: async () => {
      const res = await fetch(`${API_BASE}/whatsapp/status`);
      return res.json();
    },
    connect: async () => {
      const res = await fetch(`${API_BASE}/whatsapp/connect`, { method: "POST" });
      return res.json();
    },
    disconnect: async () => {
      const res = await fetch(`${API_BASE}/whatsapp/disconnect`, { method: "POST" });
      return res.json();
    },
    sendTest: async (phone: string, message: string) => {
      const res = await fetch(`${API_BASE}/whatsapp/send-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message }),
      });
      return res.json();
    },
    getCustomers: async () => {
      const res = await fetch(`${API_BASE}/whatsapp/customers`);
      return res.json();
    },
    bulkSend: async (phones: string[], message: string) => {
      const res = await fetch(`${API_BASE}/whatsapp/bulk-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phones, message }),
      });
      return res.json();
    }
  },
  auth: {
    verifyOTP: async (phone: string, otp: string) => {
      const res = await fetch(`${API_BASE}/auth/whatsapp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      return res.json();
    },
    sendOTP: async (phone: string) => {
      const res = await fetch(`${API_BASE}/auth/whatsapp/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      return res.json();
    }
  }
};
