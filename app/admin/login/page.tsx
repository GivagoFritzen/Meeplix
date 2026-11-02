"use client";

import { signIn, getCsrfToken } from "next-auth/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    getCsrfToken().then(setCsrfToken);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      }, {
        csrfToken,
      });

      if (result?.error) {
        setError("E-mail ou senha incorretos");
      } else {
        window.location.href = "/admin/dashboard";
      }
    } catch {
      setError("Erro ao fazer login. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute inset-0 bg-grid-pattern opacity-80" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-primary/5 via-secondary/5 to-transparent blur-3xl pointer-events-none" />
      </div>
      <header className="relative z-10 w-full px-margin md:px-gutter-desktop py-space-sm bg-white/80 backdrop-blur-md shadow-sm border-b border-[#e2e8f0]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-space-xs text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md group">
            <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
            <span>Voltar para a Coleção de Jogos</span>
          </Link>
        </div>
      </header>
      <main className="relative z-10 flex-1 flex items-center justify-center px-margin md:px-gutter-desktop py-space-lg">
        <div className="w-full max-w-[480px]">
          <div className="bg-white rounded-xl border border-[#e2e8f0] card-elevated-shadow p-space-md sm:p-space-lg relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-secondary to-primary" />
            <div className="text-center pt-space-xs pb-space-md">
              <img src="/logo.svg" alt="Meeplix" className="h-20 w-20 mx-auto" />
              <h1 className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight mt-1">Painel Administrativo</h1>
            </div>
            <form onSubmit={handleSubmit} className="space-y-space-md">
              {error && (
                <div className="p-3 rounded-lg bg-error-container/20 border border-error/30 text-error text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="admin-user">Usuário ou E-mail Admin</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                    <span className="material-symbols-outlined text-[20px]">person</span>
                  </div>
                  <Input
                    id="admin-user"
                    type="email"
                    placeholder="ex: admin@meeplix.local"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 pr-4"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="admin-pass">Senha de Acesso</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                    <span className="material-symbols-outlined text-[20px]">lock</span>
                  </div>
                  <Input
                    id="admin-pass"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-11"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    aria-pressed={showPassword}
                    title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? "visibility" : "visibility_off"}
                    </span>
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full py-3 px-4"
                style={{ marginTop: "25px" }}
                disabled={isLoading}
              >
                <span className="material-symbols-outlined text-[20px]">login</span>
                <span>{isLoading ? "Entrando..." : "Entrar no Painel Admin"}</span>
              </Button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}