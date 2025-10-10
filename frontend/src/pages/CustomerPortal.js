import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { orderService } from '../services/orderService';

const CustomerPortal = () => {
  const { customerId } = useParams();

  const { data: portalData, isLoading, error } = useQuery(
    ['customerPortal', customerId],
    () => orderService.getCustomerPortalData(customerId),
    {
      enabled: !!customerId,
    }
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return <div className="loading">Loading customer data...</div>;
  }

  if (error) {
    return <div className="error">Error loading customer data</div>;
  }

  const { orders, installments, payments } = portalData || {};

  return (
    <div>
      <h1 className="mb-4">Payment Portal</h1>
      
      {/* Orders Summary */}
      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">Your Orders</h5>
          {orders?.length > 0 ? (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Product</th>
                    <th>Total Amount</th>
                    <th>Status</th>
                    <th>Order Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>#{order.id}</td>
                      <td>{order.product?.name}</td>
                      <td>{formatCurrency(order.total_amount)}</td>
                      <td>
                        <span className={`badge ${
                          order.status === 'completed' ? 'bg-success' :
                          order.status === 'active' ? 'bg-primary' :
                          order.status === 'approved' ? 'bg-info' :
                          'bg-warning'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td>{formatDate(order.order_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted">No orders found</p>
          )}
        </div>
      </div>

      {/* Installments */}
      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">Payment Schedule</h5>
          {installments?.length > 0 ? (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Installment #</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {installments.map((installment) => (
                    <tr key={installment.id}>
                      <td>#{installment.order}</td>
                      <td>{installment.installment_number}</td>
                      <td>{formatCurrency(installment.amount)}</td>
                      <td>{formatDate(installment.due_date)}</td>
                      <td>
                        <span className={`badge ${
                          installment.status === 'paid' ? 'bg-success' :
                          installment.status === 'overdue' ? 'bg-danger' :
                          'bg-warning'
                        }`}>
                          {installment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted">No installments found</p>
          )}
        </div>
      </div>

      {/* Payment History */}
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Payment History</h5>
          {payments?.length > 0 ? (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Payment Date</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{formatDate(payment.payment_date)}</td>
                      <td>{formatCurrency(payment.amount)}</td>
                      <td>{payment.payment_method}</td>
                      <td>{payment.reference_number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted">No payments found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerPortal;
