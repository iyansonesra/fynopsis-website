"use client";
import { FormEvent, useState } from "react";
import { signIn } from "aws-amplify/auth";
import { useRouter } from 'next/navigation';
import { BackgroundBeams } from "../../components/ui/background-beams";
import AnimatedGridPattern from "@/components/ui/animated-grid-pattern";
import { cn } from "@/lib/utils";
import { GridBackground, Spotlight } from "@/components/ui/spotlight-new";
import logo from './../assets/fynopsis_noBG.png'



interface SignInFormElements extends HTMLFormControlsCollection {
  email: HTMLInputElement;
  password: HTMLInputElement;
}

interface SignInForm extends HTMLFormElement {
  readonly elements: SignInFormElements;
}

export default function SignInDetails() {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<SignInForm>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = event.currentTarget;

    try {
      const { isSignedIn } = await signIn({
        username: form.elements.email.value,
        password: form.elements.password.value,
      });

      if (isSignedIn) {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during sign in");
    } finally {
      setLoading(false);
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
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white font-cormorant">
              Sign in to your account
            </h2>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4 rounded-md shadow-sm">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-800/50 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm transition-colors"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-800/50 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-900/50 p-4 border border-red-700">
                <div className="text-sm text-red-400">{error}</div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
