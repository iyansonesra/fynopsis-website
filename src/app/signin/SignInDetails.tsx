"use client";
import { FormEvent, useState, useEffect } from "react";
import { signIn, signUp, confirmSignUp, resetPassword, confirmResetPassword } from "aws-amplify/auth";
import { useRouter } from 'next/navigation';
import { BackgroundBeams } from "../../components/ui/background-beams";
import { CircularProgress } from "@mui/material";
import { useAuthenticator } from '@aws-amplify/ui-react';

type AuthMode = 'signIn' | 'signUp' | 'verify' | 'forgotPassword' | 'resetPassword';

interface AuthFormElements extends HTMLFormControlsCollection {
  email: HTMLInputElement;
  password: HTMLInputElement;
  confirmPassword?: HTMLInputElement;
  code?: HTMLInputElement;
  firstName?: HTMLInputElement;
  lastName?: HTMLInputElement;
}

interface AuthForm extends HTMLFormElement {
  readonly elements: AuthFormElements;
}

export default function SignInDetails() {
  const router = useRouter();
  const { user, authStatus } = useAuthenticator((context) => [context.user, context.authStatus]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (authStatus === "configuring") return;

    if (!user && authStatus === 'authenticated') {
      window.location.reload();
      return;
    }
    
    if (user && authStatus === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [authStatus, router, user]);

  if (authStatus === 'configuring') {
    return (
      <div className="grid h-screen place-items-center bg-darkbg">
        <CircularProgress />
      </div>
    );
  }

  async function handleSignIn(form: AuthForm) {
    try {
      setLoading(true);
      setError("");
      
      await signIn({
        username: form.elements.email.value,
        password: form.elements.password.value,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during sign in");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(form: AuthForm) {
    try {
      setLoading(true);
      setError("");

      const { isSignUpComplete } = await signUp({
        username: form.elements.email.value,
        password: form.elements.password.value,
        options: {
          userAttributes: {
            given_name: form.elements.firstName?.value || '',
            family_name: form.elements.lastName?.value || '',
            email: form.elements.email.value,
          },
        },
      });

      if (!isSignUpComplete) {
        setEmail(form.elements.email.value);
        setMode('verify');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during sign up");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(form: AuthForm) {
    try {
      setLoading(true);
      setError("");

      const { isSignUpComplete } = await confirmSignUp({
        username: email,
        confirmationCode: form.elements.code?.value || '',
      });

      if (isSignUpComplete) {
        setMode('signIn');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during verification");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(form: AuthForm) {
    try {
      setLoading(true);
      setError("");

      await resetPassword({
        username: form.elements.email.value,
      });
      setEmail(form.elements.email.value);
      setMode('resetPassword');
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while requesting password reset");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(form: AuthForm) {
    try {
      setLoading(true);
      setError("");

      await confirmResetPassword({
        username: email,
        confirmationCode: form.elements.code?.value || '',
        newPassword: form.elements.password.value,
      });
      setMode('signIn');
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while resetting password");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<AuthForm>) {
    event.preventDefault();
    const form = event.currentTarget;

    switch (mode) {
      case 'signIn':
        await handleSignIn(form);
        break;
      case 'signUp':
        await handleSignUp(form);
        break;
      case 'verify':
        await handleVerify(form);
        break;
      case 'forgotPassword':
        await handleForgotPassword(form);
        break;
      case 'resetPassword':
        await handleResetPassword(form);
        break;
    }
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <GridBackground />
      <Spotlight />
      <div className="flex min-h-screen items-center justify-center px-4 overflow-hidden">
        <div className="w-full max-w-md space-y-8 rounded-xl bg-gradient-to-br from-gray-900 to-black p-8 backdrop-blur-xl shadow-xl min-h-[500px]">
          <div>
            {/* Add the logo image */}
            <div className="flex justify-center">
              <div className="rounded-full bg-gray-900 p-1">
                <img
                  src={logo.src}
                  alt="Fynopsis Logo"
                  className="h-16 w-auto"
                />
              </div>
            </div>

          </div>
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
              {mode === 'signIn' && 'Sign in to your account'}
              {mode === 'signUp' && 'Create your account'}
              {mode === 'verify' && 'Verify your email'}
              {mode === 'forgotPassword' && 'Reset your password'}
              {mode === 'resetPassword' && 'Enter new password'}
            </h2>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4 rounded-md shadow-sm">
              {(mode === 'signIn' || mode === 'signUp' || mode === 'forgotPassword') && (
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-white">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white/5 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              )}

              {mode === 'signUp' && (
                <>
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-white">
                      First Name
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white/5 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-white">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white/5 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </>
              )}

              {(mode === 'verify' || mode === 'resetPassword') && (
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-white">
                    Verification Code
                  </label>
                  <input
                    id="code"
                    name="code"
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white/5 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              )}

              {(mode === 'signIn' || mode === 'signUp' || mode === 'resetPassword') && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-white">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={mode === 'signIn' ? "current-password" : "new-password"}
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white/5 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              )}

              {mode === 'signUp' && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-white">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white/5 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-red-900/50 p-4 border border-red-700">
                <div className="text-sm text-red-400">{error}</div>
              </div>
            )}

            <div className="flex flex-col space-y-4">
              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                {loading ? "Processing..." : (
                  mode === 'signIn' ? "Sign in" :
                  mode === 'signUp' ? "Sign up" :
                  mode === 'verify' ? "Verify email" :
                  mode === 'forgotPassword' ? "Send reset link" :
                  "Reset password"
                )}
              </button>

              {mode === 'signIn' && (
                <div className="flex justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => setMode('signUp')}
                    className="text-indigo-300 hover:text-indigo-400"
                  >
                    Create an account
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('forgotPassword')}
                    className="text-indigo-300 hover:text-indigo-400"
                  >
                    Forgot your password?
                  </button>
                </div>
              )}

              {(mode === 'signUp' || mode === 'forgotPassword' || mode === 'resetPassword' || mode === 'verify') && (
                <button
                  type="button"
                  onClick={() => setMode('signIn')}
                  className="text-sm text-indigo-300 hover:text-indigo-400"
                >
                  Back to sign in
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
