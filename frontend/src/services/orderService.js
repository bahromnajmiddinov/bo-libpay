import api from './api';

export const orderService = {
  getOrders: async (params = {}) => {
    const response = await api.get('/orders/', { params });
    return response.data;
  },

  getOrder: async (id) => {
    const response = await api.get(`/orders/${id}/`);
    return response.data;
  },

  createOrder: async (orderData) => {
    const response = await api.post('/orders/', orderData);
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
    const response = await api.get('/orders/installments/', { params });
    return response.data;
  },

  createPayment: async (paymentData) => {
    const response = await api.post('/orders/payments/', paymentData);
    return response.data;
  },

  getPayments: async (params = {}) => {
    const response = await api.get('/orders/payments/', { params });
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await api.get('/orders/dashboard/stats/');
    return response.data;
  },

  getDueInstallments: async () => {
    const response = await api.get('/orders/due-installments/');
    return response.data;
  },

  getCustomerPortalData: async (customerId) => {
    const response = await api.get(`/orders/customers/${customerId}/portal/`);
    return response.data;
  },

  // Reports
  getReportsSummary: async () => {
    const response = await api.get('/orders/reports/summary/');
    return response.data;
  },

  getDetailedReports: async (params = {}) => {
    const response = await api.get('/orders/reports/detailed/', { params });
    return response.data;
  },
};
