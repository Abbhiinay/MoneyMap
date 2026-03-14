"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignUp = async () => {
    if (!supabase) {
      setError("Supabase is not configured. Please set up your environment variables.");
      return;
    }
    setError("");
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    } else if (data.user) {
      await supabase.from("profiles").insert([
        {
          id: data.user.id,
          currency: "USD",
        },
      ]);
      setError("Check your email to confirm signup.");
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!supabase) {
      setError("Supabase is not configured. Please set up your environment variables.");
      return;
    }
    setError("");
    setLoading(true);
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  const handleGoogleLogin = async () => {
    if (!supabase) {
      setError("Supabase is not configured. Please set up your environment variables.");
      return;
    }
    setError("");
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3000/dashboard",
      },
    });
  };

  return (
    <div className="auth-container">
      {/* Left Side - Login Form */}
      <div className="auth-left">
        <div className="auth-logo">
          <div className="logo-badge">MM</div>
          <span className="logo-text">Money<span className="logo-accent">Map</span></span>
        </div>

        <div className="auth-content">
          <h1 className="auth-title">Welcome back!</h1>
          <p className="auth-subtitle">Sign in to continue</p>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="auth-form">
            <input
              type="email"
              placeholder="Email address"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />

            <input
              type="password"
              placeholder="Password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />

            <button
              onClick={isSignUp ? handleSignUp : handleLogin}
              className="auth-button-primary"
              disabled={loading}
            >
              {loading ? "Loading..." : (isSignUp ? "Sign Up" : "Sign In")}
            </button>
          </div>

          <div className="divider">or</div>

          <button
            onClick={handleGoogleLogin}
            className="auth-button-google"
            disabled={loading}
          >
            <svg className="google-icon" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="auth-toggle"
          >
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </button>

          <div className="auth-footer-link">
            <a href="#terms">Terms of Use</a>
            <span className="separator">•</span>
            <a href="#privacy">Privacy Policy</a>
          </div>
        </div>
      </div>

      {/* Right Side - Feature Showcase */}
      <div className="auth-right">
        <div className="feature-showcase">
          <span className="feature-label">OUR VISION</span>
          <h2 className="feature-title">MoneyMap is the first platform leveraging Self-Managing Expenses</h2>
          <p className="feature-subtitle">Track, split, and manage money effortlessly with real-time analytics and group expense splitting.</p>
        </div>
      </div>

      <style>{`
        .auth-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 100vh;
          background: #000;
        }

        .auth-left {
          background: #000;
          color: #fff;
          padding: 40px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .auth-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 60px;
        }

        .logo-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.6);
          font-size: 12px;
          font-weight: 600;
          color: #10b981;
        }

        .logo-text {
          font-size: 18px;
          font-weight: 600;
          letter-spacing: -0.5px;
        }

        .logo-accent {
          color: #10b981;
        }

        .auth-content {
          max-width: 360px;
        }

        .auth-title {
          font-size: 32px;
          font-weight: 600;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }

        .auth-subtitle {
          font-size: 14px;
          color: #999;
          margin-bottom: 32px;
        }

        .error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
          padding: 12px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }

        .form-input {
          width: 100%;
          padding: 12px 16px;
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
          transition: all 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: #10b981;
          background: #222;
        }

        .form-input::placeholder {
          color: #666;
        }

        .form-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .auth-button-primary {
          width: 100%;
          padding: 12px 16px;
          background: #10b981;
          color: #000;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .auth-button-primary:hover:not(:disabled) {
          background: #059669;
        }

        .auth-button-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .divider {
          text-align: center;
          color: #666;
          font-size: 13px;
          margin: 24px 0;
        }

        .auth-button-google {
          width: 100%;
          padding: 12px 16px;
          background: transparent;
          border: 1px solid #333;
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
          margin-bottom: 16px;
        }

        .auth-button-google:hover:not(:disabled) {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.05);
        }

        .auth-button-google:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .google-icon {
          width: 18px;
          height: 18px;
        }

        .auth-toggle {
          width: 100%;
          padding: 12px;
          background: transparent;
          border: none;
          color: #10b981;
          font-size: 13px;
          cursor: pointer;
          text-decoration: underline;
          transition: color 0.2s;
        }

        .auth-toggle:hover {
          color: #059669;
        }

        .auth-footer-link {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 32px;
          padding-top: 32px;
          border-top: 1px solid #333;
          font-size: 12px;
        }

        .auth-footer-link a {
          color: #999;
          text-decoration: none;
          transition: color 0.2s;
        }

        .auth-footer-link a:hover {
          color: #10b981;
        }

        .separator {
          color: #333;
        }

        .auth-right {
          background: linear-gradient(135deg, #ccff00 0%, #b3e600 100%);
          color: #000;
          padding: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .feature-showcase {
          text-align: left;
          max-width: 360px;
        }

        .feature-label {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #000;
          opacity: 0.6;
          margin-bottom: 16px;
        }

        .feature-title {
          font-size: 28px;
          font-weight: 700;
          line-height: 1.3;
          margin-bottom: 16px;
          color: #000;
        }

        .feature-subtitle {
          font-size: 14px;
          line-height: 1.6;
          color: rgba(0, 0, 0, 0.7);
        }

        @media (max-width: 768px) {
          .auth-container {
            grid-template-columns: 1fr;
          }

          .auth-right {
            display: none;
          }

          .auth-left {
            padding: 24px;
            justify-content: center;
          }

          .auth-content {
            width: 100%;
            max-width: none;
          }
        }
      `}</style>
    </div>
  );
}
