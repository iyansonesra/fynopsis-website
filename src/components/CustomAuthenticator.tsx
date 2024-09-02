import React, { useState } from 'react';
import { signIn, signUp, confirmSignUp, signInWithRedirect } from 'aws-amplify/auth';

const CustomAuthenticator = ({ onAuthStateChange }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('signIn');

  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      await signIn({ username, password });
      onAuthStateChange('signedIn');
    } catch (error) {
      console.error('Error signing in', error);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      await signUp({
        username,
        password,
        attributes: {
          email,
        },
      });
      setStep('confirmSignUp');
    } catch (error) {
      console.error('Error signing up', error);
    }
  };

  const handleConfirmSignUp = async (e) => {
    e.preventDefault();
    try {
      await confirmSignUp({ username, confirmationCode: code });
      setStep('signIn');
    } catch (error) {
      console.error('Error confirming sign up', error);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithRedirect({ provider: 'Google' });
      // The page will redirect to Google sign-in, so we don't need to update state here
    } catch (error) {
      console.error('Error signing in with Google', error);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      {step === 'signIn' && (
        <div className="space-y-4">
          <form onSubmit={handleSignIn} className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <button type="submit" className="w-full p-2 bg-blue-500 text-white rounded">
              Sign In
            </button>
          </form>
          <button onClick={handleGoogleSignIn} className="w-full p-2 bg-red-500 text-white rounded">
            Sign In with Google
          </button>
          <button onClick={() => setStep('signUp')} className="w-full p-2 bg-gray-200 rounded">
            Create Account
          </button>
        </div>
      )}

      {step === 'signUp' && (
        <form onSubmit={handleSignUp} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <button type="submit" className="w-full p-2 bg-blue-500 text-white rounded">
            Sign Up
          </button>
          <button onClick={() => setStep('signIn')} className="w-full p-2 bg-gray-200 rounded">
            Back to Sign In
          </button>
        </form>
      )}

      {step === 'confirmSignUp' && (
        <form onSubmit={handleConfirmSignUp} className="space-y-4">
          <input
            type="text"
            placeholder="Confirmation Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <button type="submit" className="w-full p-2 bg-blue-500 text-white rounded">
            Confirm Sign Up
          </button>
        </form>
      )}
    </div>
  );
};

export default CustomAuthenticator;