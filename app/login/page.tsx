"use client";


  import { useState } from "react";
  import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [persona, setPersona]= useState("gen-z")


  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Stop the page from refreshing

    try {
      console.log(email);
      console.log(password);
      // 4. This is the main Supabase Auth call
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      console.log('Signup data:', data);
      console.log('Signup error:', error);

      if (error) throw error;

      // 5. If signup is successful, get the new user's ID
      const userId = data?.user?.id;
      console.log('User ID:', userId);
      
      // 6. This is the "Set Persona" step!
      // We insert into our 'profiles' table.
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId, // Link it to the auth user
          username: email, // You can ask for a username in the form
          persona_type: persona,
        });

      console.log('Profile insert result:', { profileData, profileError });
      
      if (profileError) {
        console.error('Profile error details:', profileError);
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      alert("Your account has been created successfully.");
      
      
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('An unknown error occurred');
      }
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      if (error) throw error;
      
      // If login is successful, redirect to the chat page
      // (You'll need to set up routing for this)
      alert('Logged in!');
      // router.push('/dashboard'); 
  
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('An unknown error occurred');
      }
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6", color: "black" }}>
      <form onSubmit={isLogin ? handleLogin : handleSignUp} style={{ background: "white", padding: 32, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", minWidth: 320 }}>
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
          
          <select value={persona} onChange={e => setPersona(e.target.value)}>
            <option value="gen-z">Gen-Z</option>
            <option value="boomer">Boomer</option>
          </select>
          
          
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
