import api from './api';

export const customerService = {
  getCustomers: async (params = {}) => {
    const response = await api.get('/customers/', { params });
    return response.data;
  },

  getCustomer: async (id) => {
    const response = await api.get(`/customers/${id}/`);
    return response.data;
  },

  createCustomer: async (customerData) => {
    const response = await api.post('/customers/', customerData);
    return response.data;
  },

  updateCustomer: async (id, customerData) => {
    const response = await api.put(`/customers/${id}/`, customerData);
    return response.data;
  },

  deleteCustomer: async (id) => {
    const response = await api.delete(`/customers/${id}/`);
    return response.data;
  },

  getCustomerOrders: async (customerId) => {
    const response = await api.get(`/customers/${customerId}/orders/`);
    return response.data;
  },

  getCustomerStats: async () => {
    const response = await api.get('/customers/stats/');
    return response.data;
  },
};
