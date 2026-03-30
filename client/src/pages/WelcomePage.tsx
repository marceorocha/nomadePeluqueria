import { useState } from "react";
import { Link } from "react-router-dom";
import { getSupabaseConfigError, supabase } from "../lib/supabase";

export function WelcomePage() {
  const [error, setError] = useState<string | null>(null);

  const handleClientAccess = async () => {
    try {
      setError(null);
      if (!supabase) {
        throw new Error(getSupabaseConfigError() ?? "Supabase no está configurado");
      }
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/reservas`,
        },
      });
      if (authError) {
        throw authError;
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#F8F0E4] via-stone-50 to-stone-100 p-6">
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
        <img
          src="client/public/nomadeLogo.jpg"
          alt="Nomade Peluqueria decorativo"
          className="h-auto w-[95vw] max-w-[1400px] object-contain opacity-10"
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl flex-col items-center justify-center rounded-3xl border border-[#E9DDCA] bg-white/88 p-8 text-center shadow-sm backdrop-blur-sm">
        <img
          src="client/public/nomadeLogo.jpg"
          alt="Nomade Peluqueria"
          className="h-auto w-full max-w-[620px] object-contain"
        />
        <h1 className="mt-6 text-3xl font-semibold text-stone-800">Bienvenida a Nomade</h1>
        <p className="mt-2 text-stone-600">Gestiona tus turnos de forma simple, elegante y profesional.</p>

        <div className="mt-8 flex w-full max-w-md flex-col gap-3">
          <button
            type="button"
            onClick={handleClientAccess}
            className="w-full rounded-xl bg-stone-800 px-5 py-4 text-lg font-semibold text-white transition hover:bg-stone-700"
          >
            Acceso clientes
          </button>
          <Link
            to="/reservas"
            className="w-full rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
          >
            Ir a reservas
          </Link>
          <Link
            to="/admin"
            className="w-full rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
          >
            Entorno de administración
          </Link>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
