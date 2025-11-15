"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
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
      
      // Wait a bit for auth state to propagate, then redirect
      setTimeout(() => {
        router.push('/discussions');
      }, 100);
      
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      if (error) throw error;
      
      console.log('Login successful, session:', data.session);
      console.log('User after login:', data.user);
      
      // Wait a bit for auth state to propagate, then redirect
      setTimeout(() => {
        router.push('/discussions');
      }, 100);
  
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('An unknown error occurred');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-purple-50 flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      
      <form 
        onSubmit={isLogin ? handleLogin : handleSignUp} 
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-4xl mb-3">💬</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Translator
          </h1>
          <h2 className="text-xl font-semibold text-slate-700">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-sm text-slate-500">
            {isLogin 
              ? "Sign in to continue chatting" 
              : "Join the conversation today"}
          </p>
        </div>

        {/* Email Input */}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="input-focus w-full px-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            required
          />
        </div>

        {/* Password Input */}
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="input-focus w-full px-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            required
          />
        </div>

        {/* Confirm Password (Sign Up only) */}
        {!isLogin && (
          <div className="space-y-2 scaleIn">
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="input-focus w-full px-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              required
            />
          </div>
        )}

        {/* Persona Selection (Sign Up only) */}
        {!isLogin && (
          <div className="space-y-2 scaleIn">
            <label htmlFor="persona" className="block text-sm font-semibold text-slate-700">
              Select Your Persona
            </label>
            <div className="grid grid-cols-2 gap-3">
              {['gen-z', 'boomer'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPersona(option)}
                  className={`button-hover px-4 py-3 rounded-lg font-semibold text-sm transition-all border-2 ${
                    persona === option
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-600 shadow-lg'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:border-blue-400'
                  }`}
                >
                  {option === 'gen-z' ? '🎮 Gen-Z' : '👴 Boomer'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button 
          type="submit" 
          className="button-hover w-full py-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-blue-700 transition-all"
        >
          {isLogin ? "Sign In" : "Create Account"}
        </button>

        {/* Toggle Auth Mode */}
        <div className="pt-2 text-center space-y-2">
          <p className="text-sm text-slate-600">
            {isLogin ? (
              <>
                Don't have an account?{' '}
                <button 
                  type="button" 
                  onClick={() => { setIsLogin(false); setError(""); }}
                  className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button 
                  type="button" 
                  onClick={() => { setIsLogin(true); setError(""); }}
                  className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  Login
                </button>
              </>
            )}
          </p>
        </div>
      </form>
    </div>
  );
}
