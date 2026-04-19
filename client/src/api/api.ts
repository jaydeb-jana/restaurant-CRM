export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000/api/v1";

export const api = {
  get: async (collection: string) => {
    const res = await fetch(`${API_BASE}/db/${collection}`);
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return res.json();
    }
    return { success: false, error: "Invalid JSON response" };
  },
  post: async (collection: string, data: any) => {
    const res = await fetch(`${API_BASE}/db/${collection}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return res.json();
    }
    return { success: false, error: "Invalid JSON response" };
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
  getBranding: async () => {
    // Return static data since dynamic server endpoints are removed
    const { staticBranding } = await import("../context/BrandingContext");
    return staticBranding;
  },
  updateBranding: async (data: any) => {
    // Return success but do nothing (static config must be edited in code)
    return { success: true, message: "Static mode enabled - edit branding.ts manually" };
  },



  whatsapp: {

    getStatus: async () => {
      const res = await fetch(`${API_BASE}/whatsapp/status`);
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return res.json();
      }
      return { success: false, sessions: [], error: "Invalid JSON response" };
    },
    connect: async (id: string = "primary") => {
      const res = await fetch(`${API_BASE}/whatsapp/connect`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      return res.json();
    },
    register: async (id: string) => {
      const res = await fetch(`${API_BASE}/whatsapp/register`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      return res.json();
    },
    disconnect: async (id: string = "primary", deletePersistently: boolean = false) => {
      const res = await fetch(`${API_BASE}/whatsapp/disconnect`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, delete: deletePersistently })
      });
      return res.json();
    },
    cleanup: async () => {
       const res = await fetch(`${API_BASE}/whatsapp/cleanup`, { method: "POST" });
       return res.json();
    },
    sendTest: async (phone: string, message: string, sessionId: string = "primary", media?: any) => {
      const res = await fetch(`${API_BASE}/whatsapp/send-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message, sessionId, media }),
      });
      return res.json();
    },
    getCustomers: async () => {
      const res = await fetch(`${API_BASE}/whatsapp/customers`);
      return res.json();
    },
    bulkSend: async (phones: string[], message: string | string[], sessionId: string = "primary", media?: any, delay?: number) => {
      const res = await fetch(`${API_BASE}/whatsapp/bulk-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phones, message, sessionId, media, delay }),
      });
      return res.json();
    },
    requestPairingCode: async (sessionId: string, phone: string) => {
      const res = await fetch(`${API_BASE}/whatsapp/pairing-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sessionId, phone }),
      });
      return res.json();
    },
    summarizeAll: async (sessionId: string) => {
      const res = await fetch(`${API_BASE}/whatsapp/summarize-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      return res.json();
    },
    summarizeSingle: async (sessionId: string, customerNumber: string) => {
      const res = await fetch(`${API_BASE}/whatsapp/summarize-single`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, customerNumber }),
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
