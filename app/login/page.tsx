"use client";


import { useState } from "react";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [persona, setPersona]= useState("gen-z")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    if (isLogin) {
      // TODO: Add login logic here
      alert(`Logged in as ${email}`);
    } else {
      // TODO: Add signup logic here
      alert(`Signed up as ${email}`);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6", color: "black" }}>
      <form onSubmit={handleSubmit} style={{ background: "white", padding: 32, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", minWidth: 320 }}>
        <h2 style={{ marginBottom: 24, textAlign: "center" }}>{isLogin ? "Login" : "Sign Up"}</h2>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="email" style={{ display: "block", marginBottom: 4 }}>Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
            required
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="password" style={{ display: "block", marginBottom: 4 }}>Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
            required
          />
        </div>
        {!isLogin && (
          
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="confirmPassword" style={{ display: "block", marginBottom: 4 }}>Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
              required
            />
          </div>
          
          
        )}
        {!isLogin && (
          
          <div style={{ marginBottom: 16 }}>
    <label htmlFor="persona" style={{ display: "block", marginBottom: 4 }}>Select Boomer or Gen-Z</label>
    <select
      id="persona"
      value={persona}
      onChange={e => setPersona(e.target.value)}
      style={{
        width: "100%",
        padding: 8,
        borderRadius: 4,
        border: "1px solid #2563eb",
        background: "#f3f4f6",
        color: "#2563eb",
        fontWeight: 500
      }}
      required
    >
      <option value="gen-z">Gen-Z</option>
      <option value="boomer">Boomer</option>
    </select>
  </div>
          
          
        )}
        {error && <div style={{ color: "red", marginBottom: 16 }}>{error}</div>}
        <button type="submit" style={{ width: "100%", padding: 10, borderRadius: 4, background: "#2563eb", color: "white", border: "none", fontWeight: 600 }}>
          {isLogin ? "Login" : "Sign Up"}
        </button>
        <div style={{ marginTop: 16, textAlign: "center" }}>
          {isLogin ? (
            <span>
              Don't have an account?{' '}
              <button type="button" style={{ color: "#2563eb", background: "none", border: "none", textDecoration: "underline", cursor: "pointer" }} onClick={() => { setIsLogin(false); setError(""); }}>
                Sign up
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button type="button" style={{ color: "#2563eb", background: "none", border: "none", textDecoration: "underline", cursor: "pointer" }} onClick={() => { setIsLogin(true); setError(""); }}>
                Login
              </button>
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
