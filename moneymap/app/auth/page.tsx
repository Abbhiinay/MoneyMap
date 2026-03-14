"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

const carouselSlides = [
  {
    title: "Track Every Dollar",
    description: "Easily monitor all your expenses with smart categories and real-time insights.",
    icon: "💰",
  },
  {
    title: "Split Bills Effortlessly",
    description: "Share expenses with friends and groups. Settle up automatically with MoneyMap.",
    icon: "👥",
  },
  {
    title: "Smart Email Integration",
    description: "Your Gmail keeps you updated. We read order confirmations and add expenses automatically.",
    icon: "📧",
  },
  {
    title: "Real-Time Analytics",
    description: "Visualize your spending patterns with beautiful charts and detailed reports.",
    icon: "📊",
  },
  {
    title: "Multicurrency Support",
    description: "Track expenses across different currencies. Perfect for travelers and global spenders.",
    icon: "🌍",
  },
];

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleSignUp = async () => {
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
    setError("");
    setLoading(true);
    try {
      const redirectUrl = typeof window !== "undefined"
        ? `${window.location.origin}/dashboard`
        : "http://localhost:3000/dashboard";

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        setError(error.message || "Google sign-in failed. Please ensure Google OAuth is enabled in your Supabase project settings.");
        setLoading(false);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
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

      {/* Right Side - Feature Carousel */}
      <div className="auth-right">
        <div className="carousel-container">
          {/* Glow Effect */}
          <div className="glow-orb glow-orb-1" />
          <div className="glow-orb glow-orb-2" />

          {/* Previous Button */}
          <button
            className="carousel-nav carousel-nav-prev"
            onClick={() => setCurrentSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length)}
            aria-label="Previous slide"
          >
            ←
          </button>

          {/* Carousel */}
          <div className="carousel-wrapper">
            {carouselSlides.map((slide, idx) => (
              <div
                key={idx}
                className={`carousel-slide ${idx === currentSlide ? "active" : ""}`}
              >
                <div className="glassmorphism-card">
                  <div className="slide-icon">{slide.icon}</div>
                  <h2 className="slide-title">{slide.title}</h2>
                  <p className="slide-description">{slide.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Next Button */}
          <button
            className="carousel-nav carousel-nav-next"
            onClick={() => setCurrentSlide((prev) => (prev + 1) % carouselSlides.length)}
            aria-label="Next slide"
          >
            →
          </button>

          {/* Carousel Indicators */}
          <div className="carousel-indicators">
            {carouselSlides.map((_, idx) => (
              <button
                key={idx}
                className={`indicator-dot ${idx === currentSlide ? "active" : ""}`}
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
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
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #fff;
          padding: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .carousel-container {
          position: relative;
          width: 100%;
          max-width: 400px;
          text-align: center;
        }

        /* Glow Effects */
        .glow-orb {
          position: absolute;
          border-radius: 50%;
          opacity: 0.3;
          filter: blur(40px);
          animation: float 6s ease-in-out infinite;
        }

        .glow-orb-1 {
          width: 200px;
          height: 200px;
          background: rgba(255, 255, 255, 0.4);
          top: -50px;
          right: -50px;
          animation-delay: 0s;
        }

        .glow-orb-2 {
          width: 150px;
          height: 150px;
          background: rgba(255, 255, 255, 0.2);
          bottom: -30px;
          left: -30px;
          animation-delay: 3s;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        /* Carousel */
        .carousel-wrapper {
          position: relative;
          height: 320px;
          display: flex;
          align-items: center;
          justify-content: center;
          perspective: 1000px;
        }

        .carousel-slide {
          position: absolute;
          width: 100%;
          opacity: 0;
          transform: scale(0.75) rotateY(-25deg);
          transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          pointer-events: none;
          padding: 20px;
        }

        .carousel-slide.active {
          opacity: 1;
          transform: scale(1) rotateY(0deg);
          pointer-events: auto;
        }

        /* Glassmorphism Card */
        .glassmorphism-card {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 16px;
          padding: 32px 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .carousel-slide.active .glassmorphism-card {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.35);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }

        .glassmorphism-card:hover {
          background: rgba(255, 255, 255, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.35);
        }

        .slide-icon {
          font-size: 64px;
          margin-bottom: 16px;
          animation: bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          display: block;
        }

        @keyframes bounce {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .slide-title {
          font-size: 28px;
          font-weight: 700;
          line-height: 1.3;
          margin-bottom: 12px;
          color: #fff;
        }

        .slide-description {
          font-size: 14px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.95);
        }

        /* Carousel Navigation Arrows */
        .carousel-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 48px;
          height: 48px;
          border: none;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 50%;
          color: #fff;
          font-size: 24px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 20;
        }

        .carousel-nav:hover {
          background: rgba(255, 255, 255, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.35);
          transform: translateY(-50%) scale(1.1);
        }

        .carousel-nav:active {
          transform: translateY(-50%) scale(0.95);
        }

        .carousel-nav-prev {
          left: -60px;
        }

        .carousel-nav-next {
          right: -60px;
        }

        /* Carousel Indicators */
        .carousel-indicators {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 24px;
          position: relative;
          z-index: 10;
        }

        .indicator-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .indicator-dot.active {
          background: #fff;
          width: 24px;
          border-radius: 4px;
        }

        .indicator-dot:hover {
          background: rgba(255, 255, 255, 0.7);
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
