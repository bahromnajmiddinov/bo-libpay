import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Eye, EyeOff, User, Mail, Building, MapPin, Phone, FileText, Lock, CheckCircle, XCircle } from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: []
  });
  const { register } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};

    // Personal information validation
    if (!formData.user.first_name?.trim()) {
      newErrors.first_name = 'First name is required';
    }
    if (!formData.user.last_name?.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    if (!formData.user.username?.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.user.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    if (!formData.user.email?.trim()) {
      newErrors.personal_email = 'Personal email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.user.email)) {
      newErrors.personal_email = 'Please enter a valid email address';
    }
    if (!formData.user.password) {
      newErrors.password = 'Password is required';
    } else if (formData.user.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (passwordStrength.score < 2) {
      newErrors.password = 'Please choose a stronger password';
    }

    // Business information validation
    if (!formData.business_name?.trim()) {
      newErrors.business_name = 'Business name is required';
    }
    if (!formData.business_address?.trim()) {
      newErrors.business_address = 'Business address is required';
    }
    if (!formData.phone_number?.trim()) {
      newErrors.phone_number = 'Phone number is required';
    }
    if (!formData.email?.trim()) {
      newErrors.business_email = 'Business email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.business_email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkPasswordStrength = (password) => {
    const feedback = [];
    let score = 0;

    if (password.length >= 8) {
      score++;
    } else {
      feedback.push('At least 8 characters');
    }

    if (/[A-Z]/.test(password)) {
      score++;
    } else {
      feedback.push('One uppercase letter');
    }

    if (/[a-z]/.test(password)) {
      score++;
    } else {
      feedback.push('One lowercase letter');
    }

    if (/[0-9]/.test(password)) {
      score++;
    } else {
      feedback.push('One number');
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score++;
    } else {
      feedback.push('One special character');
    }

    setPasswordStrength({ score, feedback });
  };

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

      // Check password strength in real-time
      if (userField === 'password') {
        checkPasswordStrength(value);
      }
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);

    try {
      const result = await register(formData);
      
      if (result.success) {
        toast.success('🎉 Registration successful! Welcome to our platform.');
        navigate('/dashboard');
      } else {
        toast.error(result.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      toast.error('An unexpected error occurred during registration');
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength.score === 0) return 'bg-gray-200';
    if (passwordStrength.score <= 2) return 'bg-red-500';
    if (passwordStrength.score <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength.score === 0) return 'Enter a password';
    if (passwordStrength.score <= 2) return 'Weak';
    if (passwordStrength.score <= 3) return 'Good';
    return 'Strong';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <Building className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Start Your Business Journey
          </h1>
          <p className="text-lg text-gray-600 max-w-md mx-auto">
            Join thousands of sellers who are growing their business with our platform
          </p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Create Seller Account
            </CardTitle>
            <CardDescription className="text-gray-600">
              Fill in your details to start managing your business efficiently
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="user.first_name" className="text-sm font-medium text-gray-700 flex items-center">
                      First Name
                    </label>
                    <div className="relative">
                      <Input
                        id="user.first_name"
                        name="user.first_name"
                        value={formData.user.first_name}
                        onChange={handleChange}
                        placeholder="Enter your first name"
                        className={`pl-10 ${errors.first_name ? 'border-red-500' : ''}`}
                        required
                      />
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                    {errors.first_name && (
                      <p className="text-sm text-red-600 flex items-center">
                        <XCircle className="h-4 w-4 mr-1" />
                        {errors.first_name}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="user.last_name" className="text-sm font-medium text-gray-700">
                      Last Name
                    </label>
                    <Input
                      id="user.last_name"
                      name="user.last_name"
                      value={formData.user.last_name}
                      onChange={handleChange}
                      placeholder="Enter your last name"
                      className={errors.last_name ? 'border-red-500' : ''}
                      required
                    />
                    {errors.last_name && (
                      <p className="text-sm text-red-600 flex items-center">
                        <XCircle className="h-4 w-4 mr-1" />
                        {errors.last_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="user.username" className="text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <Input
                    id="user.username"
                    name="user.username"
                    value={formData.user.username}
                    onChange={handleChange}
                    placeholder="Choose a unique username"
                    className={errors.username ? 'border-red-500' : ''}
                    required
                  />
                  {errors.username && (
                    <p className="text-sm text-red-600 flex items-center">
                      <XCircle className="h-4 w-4 mr-1" />
                      {errors.username}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="user.email" className="text-sm font-medium text-gray-700 flex items-center">
                    Personal Email
                  </label>
                  <div className="relative">
                    <Input
                      type="email"
                      id="user.email"
                      name="user.email"
                      value={formData.user.email}
                      onChange={handleChange}
                      placeholder="your.email@example.com"
                      className={`pl-10 ${errors.personal_email ? 'border-red-500' : ''}`}
                      required
                    />
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  {errors.personal_email && (
                    <p className="text-sm text-red-600 flex items-center">
                      <XCircle className="h-4 w-4 mr-1" />
                      {errors.personal_email}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="user.password" className="text-sm font-medium text-gray-700 flex items-center">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      id="user.password"
                      name="user.password"
                      value={formData.user.password}
                      onChange={handleChange}
                      placeholder="Create a strong password"
                      className={`pr-10 ${errors.password ? 'border-red-500' : ''}`}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {formData.user.password && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Password strength:</span>
                        <span className={`text-sm font-medium ${
                          passwordStrength.score <= 2 ? 'text-red-600' :
                          passwordStrength.score <= 3 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {getPasswordStrengthText()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                          style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                        ></div>
                      </div>
                      {passwordStrength.feedback.length > 0 && (
                        <div className="text-sm text-gray-600">
                          <p className="font-medium mb-1">Requirements:</p>
                          <ul className="space-y-1">
                            {passwordStrength.feedback.map((item, index) => (
                              <li key={index} className="flex items-center">
                                <XCircle className="h-3 w-3 text-red-500 mr-2" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {errors.password && (
                    <p className="text-sm text-red-600 flex items-center">
                      <XCircle className="h-4 w-4 mr-1" />
                      {errors.password}
                    </p>
                  )}
                </div>
              </div>

              {/* Business Information Section */}
              <div className="space-y-4 pt-6 border-t">
                <div className="flex items-center space-x-2">
                  <Building className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Business Information</h3>
                </div>

                <div className="space-y-2">
                  <label htmlFor="business_name" className="text-sm font-medium text-gray-700 flex items-center">
                    Business Name
                  </label>
                  <div className="relative">
                    <Input
                      id="business_name"
                      name="business_name"
                      value={formData.business_name}
                      onChange={handleChange}
                      placeholder="Enter your business name"
                      className={`pl-10 ${errors.business_name ? 'border-red-500' : ''}`}
                      required
                    />
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  {errors.business_name && (
                    <p className="text-sm text-red-600 flex items-center">
                      <XCircle className="h-4 w-4 mr-1" />
                      {errors.business_name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="business_address" className="text-sm font-medium text-gray-700 flex items-center">
                    Business Address
                  </label>
                  <div className="relative">
                    <textarea
                      className={`flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                        errors.business_address ? 'border-red-500' : ''
                      }`}
                      id="business_address"
                      name="business_address"
                      value={formData.business_address}
                      onChange={handleChange}
                      placeholder="Enter your complete business address"
                      required
                    />
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  </div>
                  {errors.business_address && (
                    <p className="text-sm text-red-600 flex items-center">
                      <XCircle className="h-4 w-4 mr-1" />
                      {errors.business_address}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="phone_number" className="text-sm font-medium text-gray-700 flex items-center">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Input
                        type="tel"
                        id="phone_number"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleChange}
                        placeholder="+1 (555) 123-4567"
                        className={`pl-10 ${errors.phone_number ? 'border-red-500' : ''}`}
                        required
                      />
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                    {errors.phone_number && (
                      <p className="text-sm text-red-600 flex items-center">
                        <XCircle className="h-4 w-4 mr-1" />
                        {errors.phone_number}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Business Email
                    </label>
                    <Input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="business@example.com"
                      className={errors.business_email ? 'border-red-500' : ''}
                      required
                    />
                    {errors.business_email && (
                      <p className="text-sm text-red-600 flex items-center">
                        <XCircle className="h-4 w-4 mr-1" />
                        {errors.business_email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="tax_id" className="text-sm font-medium text-gray-700 flex items-center">
                    Tax ID (Optional)
                  </label>
                  <div className="relative">
                    <Input
                      id="tax_id"
                      name="tax_id"
                      value={formData.tax_id}
                      onChange={handleChange}
                      placeholder="Enter your tax identification number"
                      className="pl-10"
                    />
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full py-3 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-[1.02]"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating Your Account...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5" />
                    <span>Create Seller Account</span>
                  </div>
                )}
              </Button>
            </form>

            {/* Login Link */}
            <div className="text-center mt-6 pt-6 border-t">
              <p className="text-sm text-gray-600">
                Already have an account?
              </p>
              <Link 
                to="/login" 
                className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors mt-1"
              >
                Sign in to your account
                <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Security Notice */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-2">
                <Lock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  Your information is secure and encrypted. We never share your personal or business details with third parties.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;