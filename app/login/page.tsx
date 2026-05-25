"use client";
// app/login/page.tsx

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        // Store token in localStorage for API calls
        localStorage.setItem("auth-token", data.token);
        localStorage.setItem("admin-name", data.admin.name);
        localStorage.setItem("admin-email", data.admin.email);
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(data.message || "Login failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ fontFamily: "Lexend, sans-serif" }}
    >
      {/* Left Panel - Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #1a4a1a 0%, #2d6a2d 40%, #4a9e4a 100%)",
        }}
      >
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg, transparent, transparent 20px, rgba(255,255,255,0.1) 20px, rgba(255,255,255,0.1) 40px
            )`,
          }}
        />

        <div className="relative z-10 text-center text-white max-w-md">
          <div className="mx-auto mb-8 flex items-center justify-center">
            <Image
              src={"/assets/funato_logo.png"}
              height={100}
              width={90}
              alt="logo"
              className="w-25 h-23 object-contain"
            />
          </div>

          <h1 className="text-3xl font-extrabold mb-3 leading-tight">
            Federal University of Agriculture and Technology
          </h1>
          <p className="text-xl font-semibold opacity-90 mb-2">
            Okeho, Oyo State
          </p>
          <p className="text-lg opacity-70 mb-8">— FUNATO —</p>

          <div
            className="rounded-2xl p-6 text-left"
            style={{
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(10px)",
            }}
          >
            <p className="text-sm font-medium opacity-80 mb-3">
              Student ID Card Management System
            </p>
            <div className="space-y-2">
              {[
                "Import student data from Excel",
                "Generate professional ID cards",
                "Bulk print & PDF export",
                "QR code verification",
              ].map((f) => (
                <div
                  key={f}
                  className="flex items-center gap-2 text-sm opacity-90"
                >
                  <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-xs">
                    ✓
                  </span>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white font-extrabold text-3xl">
              <Image
                src={"/assets/funato_logo.png"}
                height={100}
                width={90}
                alt="logo"
                className="w-25 h-23 object-contain"
              />
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              FUNATO ID System
            </h2>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-10 border border-gray-100">
            <div className="mb-8">
              <h2 className="text-2xl font-extrabold text-gray-900 mb-1">
                Admin Login
              </h2>
              <p className="text-gray-500 text-sm">
                Sign in to access the ID card management system
              </p>
            </div>

            {error && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                <span className="text-red-500 text-lg">⚠</span>
                <p className="text-red-700 text-sm font-medium">
                  {error}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@funato.edu.ng"
                  required
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm font-medium bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm font-medium bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-600 transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  >
                    {showPassword ? "🙈" : "👁"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl font-bold text-white text-sm transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                style={{
                  background: loading
                    ? "#86efac"
                    : "linear-gradient(135deg, #2d6a2d 0%, #4a9e4a 100%)",
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  "Sign In to Dashboard"
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            © {new Date().getFullYear()} FUNATO ID Card Management
            System
          </p>
        </div>
      </div>
    </div>
  );
}
