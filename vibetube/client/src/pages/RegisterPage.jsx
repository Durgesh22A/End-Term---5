import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { getAuthErrorMessage } from '../utils/authErrors';

const RegisterPage = () => {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register({ name: form.name, email: form.email, password: form.password });
      toast.success('Account created! Welcome to RIFFORA.');
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img className="auth-brand-mark" src="/riffora-mark.svg" alt="" />
          <h1>RIFFORA</h1>
          <p>Find Your Frequency.</p>
        </div>

        <h2 style={{ fontSize:'1.3rem', marginBottom:24, textAlign:'center' }}>Create your account</h2>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name" name="name" type="text" className="input"
              placeholder="Your name" value={form.name}
              onChange={handleChange} required minLength={2}
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email" name="email" type="email" className="input"
              placeholder="you@example.com" value={form.email}
              onChange={handleChange} required autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password" name="password" type="password" className="input"
              placeholder="Min. 6 characters" value={form.password}
              onChange={handleChange} required autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword" name="confirmPassword" type="password" className="input"
              placeholder="Repeat password" value={form.confirmPassword}
              onChange={handleChange} required
            />
          </div>

          {error && <p className="error-msg" style={{ marginBottom:12 }}>{error}</p>}

          <button
            type="submit" className="btn btn-primary"
            style={{ width:'100%', padding:'11px', marginTop:4 }}
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-switch">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
