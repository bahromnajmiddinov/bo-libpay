import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';

const Register = () => {
  const [formData, setFormData] = useState({
    user: {
      username: '',
      email: '',
      password: '',
      first_name: '',
      last_name: '',
    },
    business_name: '',
    business_address: '',
    phone_number: '',
    email: '',
    tax_id: '',
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('user.')) {
      const userField = name.split('.')[1];
      setFormData({
        ...formData,
        user: {
          ...formData.user,
          [userField]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await register(formData);
      
      if (result.success) {
        toast.success('Registration successful!');
        navigate('/dashboard');
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Join Our Platform</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your seller account and start managing your business
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Register as Seller</CardTitle>
            <CardDescription>
              Fill in your details to create your account
            </CardDescription>
          </CardHeader>
          <CardContent>
              
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="user.first_name" className="text-sm font-medium">
                    First Name
                  </label>
                  <Input
                    id="user.first_name"
                    name="user.first_name"
                    value={formData.user.first_name}
                    onChange={handleChange}
                    placeholder="Enter your first name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="user.last_name" className="text-sm font-medium">
                    Last Name
                  </label>
                  <Input
                    id="user.last_name"
                    name="user.last_name"
                    value={formData.user.last_name}
                    onChange={handleChange}
                    placeholder="Enter your last name"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="user.username" className="text-sm font-medium">
                  Username
                </label>
                <Input
                  id="user.username"
                  name="user.username"
                  value={formData.user.username}
                  onChange={handleChange}
                  placeholder="Choose a unique username"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="user.email" className="text-sm font-medium">
                  Personal Email
                </label>
                <Input
                  type="email"
                  id="user.email"
                  name="user.email"
                  value={formData.user.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="user.password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  type="password"
                  id="user.password"
                  name="user.password"
                  value={formData.user.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
                  required
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Business Information</h3>
              </div>

              <div className="space-y-2">
                <label htmlFor="business_name" className="text-sm font-medium">
                  Business Name
                </label>
                <Input
                  id="business_name"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleChange}
                  placeholder="Enter your business name"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="business_address" className="text-sm font-medium">
                  Business Address
                </label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  id="business_address"
                  name="business_address"
                  value={formData.business_address}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Enter your complete business address"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="phone_number" className="text-sm font-medium">
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    placeholder="+1 (555) 123-4567"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Business Email
                  </label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="business@example.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="tax_id" className="text-sm font-medium">
                  Tax ID (Optional)
                </label>
                <Input
                  id="tax_id"
                  name="tax_id"
                  value={formData.tax_id}
                  onChange={handleChange}
                  placeholder="Enter your tax identification number"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Registering...' : 'Create Account'}
              </Button>
            </form>

            <div className="text-center mt-4">
              <p className="text-sm text-muted-foreground">
                Already have an account?
              </p>
              <Link to="/login" className="text-sm text-primary hover:underline">
                Login here
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
