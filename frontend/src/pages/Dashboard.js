import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { orderService } from '../services/orderService';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [dueInstallments, setDueInstallments] = useState(null);

  const { data: dashboardStats, isLoading: statsLoading } = useQuery(
    'dashboardStats',
    orderService.getDashboardStats,
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  const { data: dueData, isLoading: dueLoading } = useQuery(
    'dueInstallments',
    orderService.getDueInstallments,
    {
      refetchInterval: 60000, // Refetch every minute
    }
  );

  useEffect(() => {
    if (dashboardStats) {
      setStats(dashboardStats);
    }
  }, [dashboardStats]);

  useEffect(() => {
    if (dueData) {
      setDueInstallments(dueData);
    }
  }, [dueData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (statsLoading || dueLoading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div>
      <h1 className="mb-4">Dashboard</h1>

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card">
            <div className="card-body text-center">
              <h3 className="text-primary">{stats?.orders?.total || 0}</h3>
              <p className="text-muted">Total Orders</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body text-center">
              <h3 className="text-warning">{stats?.orders?.pending || 0}</h3>
              <p className="text-muted">Pending Orders</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body text-center">
              <h3 className="text-success">{formatCurrency(stats?.payments?.total_revenue || 0)}</h3>
              <p className="text-muted">Total Revenue</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body text-center">
              <h3 className="text-info">{formatCurrency(stats?.installments?.outstanding_balance || 0)}</h3>
              <p className="text-muted">Outstanding Balance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Due Today and Overdue */}
      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title text-warning">
                Due Today ({stats?.installments?.due_today || 0})
              </h5>
              {dueInstallments?.due_today?.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dueInstallments.due_today.map((installment) => (
                        <tr key={installment.id}>
                          <td>{installment.order?.customer?.full_name}</td>
                          <td>{formatCurrency(installment.amount)}</td>
                          <td>{formatDate(installment.due_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted">No installments due today</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title text-danger">
                Overdue ({stats?.installments?.overdue || 0})
              </h5>
              {dueInstallments?.overdue?.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Due Date</th>
                        <th>Days Overdue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dueInstallments.overdue.map((installment) => {
                        const daysOverdue = Math.floor(
                          (new Date() - new Date(installment.due_date)) / (1000 * 60 * 60 * 24)
                        );
                        return (
                          <tr key={installment.id}>
                            <td>{installment.order?.customer?.full_name}</td>
                            <td>{formatCurrency(installment.amount)}</td>
                            <td>{formatDate(installment.due_date)}</td>
                            <td className="text-danger">{daysOverdue} days</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted">No overdue installments</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Quick Actions</h5>
              <div className="d-flex gap-3">
                <a href="/products" className="btn btn-primary">
                  Manage Products
                </a>
                <a href="/customers" className="btn btn-secondary">
                  View Customers
                </a>
                <a href="/orders" className="btn btn-success">
                  Manage Orders
                </a>
                <a href="/reports" className="btn btn-info">
                  View Reports
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
