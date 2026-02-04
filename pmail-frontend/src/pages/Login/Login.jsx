import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Server, Eye, EyeOff, Loader2, Sun, Moon, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { authApi } from '../../services/api';
import toast from 'react-hot-toast';

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    imapServer: '',
    imapPort: '993',
    smtpServer: '',
    smtpPort: '587',
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoConfigStatus, setAutoConfigStatus] = useState(null); // null, 'loading', 'found', 'fallback', 'error'
  const [autoConfigSource, setAutoConfigSource] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Fetch autoconfig when email field loses focus
  const handleEmailBlur = async () => {
    const email = formData.email;
    if (!email || !email.includes('@')) return;
    
    // Don't auto-discover if user has manually set servers
    if (formData.imapServer || formData.smtpServer) return;
    
    setAutoConfigStatus('loading');
    
    try {
      const result = await authApi.autoconfig(email);
      
      if (result.found && result.config) {
        setFormData((prev) => ({
          ...prev,
          imapServer: result.config.imap.host || prev.imapServer,
          imapPort: String(result.config.imap.port || 993),
          smtpServer: result.config.smtp.host || prev.smtpServer,
          smtpPort: String(result.config.smtp.port || 587),
        }));
        setAutoConfigStatus('found');
        setAutoConfigSource(result.source);
      } else {
        // Fallback to mail.domain.com
        const domain = email.split('@')[1];
        setFormData((prev) => ({
          ...prev,
          imapServer: `mail.${domain}`,
          smtpServer: `mail.${domain}`,
        }));
        setAutoConfigStatus('fallback');
        setAutoConfigSource('domain');
      }
    } catch (err) {
      console.error('Autoconfig failed:', err);
      // Fallback to mail.domain.com
      const domain = email.split('@')[1];
      setFormData((prev) => ({
        ...prev,
        imapServer: `mail.${domain}`,
        smtpServer: `mail.${domain}`,
      }));
      setAutoConfigStatus('fallback');
      setAutoConfigSource('domain');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Please enter your email and password');
      return;
    }

    // Server settings are optional - backend will auto-discover if not provided
    const result = await login({
      email: formData.email,
      password: formData.password,
      ...(formData.imapServer && { imapServer: formData.imapServer }),
      ...(formData.imapPort && { imapPort: parseInt(formData.imapPort) }),
      ...(formData.smtpServer && { smtpServer: formData.smtpServer }),
      ...(formData.smtpPort && { smtpPort: parseInt(formData.smtpPort) }),
    });

    if (result.success) {
      toast.success('Login successful!');
      navigate('/');
    } else {
      toast.error(result.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? (
          <Sun className="w-5 h-5 text-yellow-500" />
        ) : (
          <Moon className="w-5 h-5 text-gray-600" />
        )}
      </button>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">PMail</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Sign in with your email account</p>
        </div>

        {/* Login Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleEmailBlur}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                  required
                />
                {/* Autoconfig status indicator */}
                {autoConfigStatus && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {autoConfigStatus === 'loading' && (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    )}
                    {autoConfigStatus === 'found' && (
                      <CheckCircle className="w-5 h-5 text-green-500" title={`Server settings auto-discovered via ${autoConfigSource}`} />
                    )}
                    {autoConfigStatus === 'fallback' && (
                      <AlertCircle className="w-5 h-5 text-yellow-500" title="Using default server settings" />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-12 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Advanced Settings Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              <Server className="w-4 h-4" />
              {showAdvanced ? 'Hide' : 'Show'} server settings
            </button>

            {/* Advanced Server Settings */}
            {showAdvanced && (
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      IMAP Server
                    </label>
                    <input
                      type="text"
                      name="imapServer"
                      value={formData.imapServer}
                      onChange={handleChange}
                      placeholder="imap.example.com"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Port
                    </label>
                    <input
                      type="number"
                      name="imapPort"
                      value={formData.imapPort}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      SMTP Server
                    </label>
                    <input
                      type="text"
                      name="smtpServer"
                      value={formData.smtpServer}
                      onChange={handleChange}
                      placeholder="smtp.example.com"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Port
                    </label>
                    <input
                      type="number"
                      name="smtpPort"
                      value={formData.smtpPort}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>Your credentials are used only to connect to your mail server.</p>
            <p className="mt-1">We don't store your password.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
