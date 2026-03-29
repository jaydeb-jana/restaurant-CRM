const API_BASE = "/api/db";

export const api = {
  get: async (collection: string) => {
    const res = await fetch(`${API_BASE}/${collection}`);
    return res.json();
  },
  post: async (collection: string, data: any) => {
    const res = await fetch(`${API_BASE}/${collection}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  put: async (collection: string, id: string, data: any) => {
    const res = await fetch(`${API_BASE}/${collection}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  delete: async (collection: string, id: string) => {
    const res = await fetch(`${API_BASE}/${collection}/${id}`, {
      method: "DELETE",
    });
    return res.json();
  },
  getSettings: async () => {
    const res = await fetch("/api/settings");
    return res.json();
  },
  updateSettings: async (data: any) => {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  whatsapp: {
    getStatus: async () => {
      const res = await fetch("/api/whatsapp/status");
      return res.json();
    },
    connect: async () => {
      const res = await fetch("/api/whatsapp/connect", { method: "POST" });
      return res.json();
    },
    disconnect: async () => {
      const res = await fetch("/api/whatsapp/disconnect", { method: "POST" });
      return res.json();
    },
    sendTest: async (phone: string, message: string) => {
      const res = await fetch("/api/whatsapp/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message }),
      });
      return res.json();
    },
    getCustomers: async () => {
      const res = await fetch("/api/whatsapp/customers");
      return res.json();
    },
    bulkSend: async (phones: string[], message: string) => {
      const res = await fetch("/api/whatsapp/bulk-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phones, message }),
      });
      return res.json();
    }
  },
  auth: {
    verifyOTP: async (phone: string, otp: string) => {
      const res = await fetch("/api/auth/whatsapp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      return res.json();
    }
  }
};
