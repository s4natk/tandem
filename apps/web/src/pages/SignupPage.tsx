import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authApi } from "@/api/endpoints";
import { ApiClientError } from "@/api/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Spinner } from "@/components/ui/Spinner";
import { useAuthStore } from "@/store/auth";

export function SignupPage(): JSX.Element {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.signup({ email, name, password });
      setSession({
        user: res.user,
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
      });
      navigate("/app", { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="font-display text-3xl font-bold tracking-tight text-white">Create your account</h1>
      <p className="mt-1.5 text-sm text-white/55">
        Start a board and bring your team along in seconds.
      </p>
      <form className="mt-7 space-y-4" onSubmit={submit}>
        <div>
          <label className="block text-sm font-medium text-white/70">Full name</label>
          <input
            type="text"
            autoComplete="name"
            required
            className="input mt-1.5 py-2.5"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70">Email</label>
          <input
            type="email"
            autoComplete="email"
            required
            className="input mt-1.5 py-2.5"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70">Password</label>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="input mt-1.5 py-2.5"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-white/40">At least 8 characters.</p>
        </div>
        <button type="submit" className="btn-glow w-full py-3" disabled={loading}>
          {loading ? <Spinner size="sm" className="text-white" /> : "Create account"}
        </button>
      </form>
      <p className="mt-7 text-center text-sm text-white/55">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-brand-200 hover:text-white">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
