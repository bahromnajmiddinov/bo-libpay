import api from "./api";

export const orderService = {
  getOrders: async (params = {}) => {
    const response = await api.get("/orders/", { params });
    return response.data;
  },

  getOrder: async (id) => {
    const response = await api.get(`/orders/${id}/`);
    return response.data;
  },

  createOrder: async (orderData) => {
    const response = await api.post("/orders/", orderData);
    return response.data;
  },

  updateOrder: async (id, orderData) => {
    const response = await api.put(`/orders/${id}/`, orderData);
    return response.data;
  },

  deleteOrder: async (id) => {
    const response = await api.delete(`/orders/${id}/`);
    return response.data;
  },

  approveOrder: async (id) => {
    const response = await api.post(`/orders/${id}/approve/`);
    return response.data;
  },

  getInstallments: async (params = {}) => {
    const response = await api.get("/orders/installments/", { params });
    return response.data;
  },

  createPayment: async (paymentData) => {
    const response = await api.post("/orders/payments/", paymentData);
    return response.data;
  },

  getPayments: async (params = {}) => {
    const response = await api.get("/orders/payments/", { params });
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await api.get("/orders/dashboard/stats/");
    return response.data;
  },

  getDueInstallments: async () => {
    const response = await api.get("/orders/due-installments/");
    return response.data;
  },

  getCustomerPortalData: async (customerId) => {
    const response = await api.get(`/orders/customers/${customerId}/portal/`);
    return response.data;
  },

  // Reports - backendga moslashtirilgan versiya
  getReportsSummary: async (params = {}) => {
    // Backend parametrlariga moslashtirish
    const queryParams = {};

    if (params.start_date) queryParams.start_date = params.start_date;
    if (params.end_date) queryParams.end_date = params.end_date;
    if (params.range) queryParams.range = params.range;

    const response = await api.get("/orders/reports/summary/", {
      params: queryParams,
    });
    return response.data;
  },

  getDetailedReports: async (params = {}) => {
    // Backend parametrlariga moslashtirish
    const queryParams = {};

    if (params.start_date) queryParams.start_date = params.start_date;
    if (params.end_date) queryParams.end_date = params.end_date;
    if (params.range) queryParams.range = params.range;
    if (params.customer_id) queryParams.customer_id = params.customer_id;
    if (params.product_id) queryParams.product_id = params.product_id;
    if (params.status) queryParams.status = params.status;
    if (params.type) queryParams.type = params.type;

    console.log("Sending detailed reports params:", queryParams); // Debug uchun

    const response = await api.get("/orders/reports/detailed/", {
      params: queryParams,
    });
    return response.data;
  },
};
