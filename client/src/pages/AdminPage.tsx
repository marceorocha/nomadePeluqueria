import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { authHeaders, getAccessToken } from "../lib/session";
import { getSupabaseConfigError, supabase } from "../lib/supabase";

function toIsoDateTime(value: string): string {
  return new Date(value).toISOString();
}

interface ClientItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  sex: string | null;
  tier: "REGULAR" | "SILVER" | "GOLD";
}

interface StaffItem {
  id: string;
  name: string;
}

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  staffId: string;
  staff: StaffItem;
}

interface BookingItem {
  id: string;
  startTime: string;
  endTime: string;
  notes: string | null;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  client: ClientItem;
  service: ServiceItem;
}

async function fetchAdminData<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al cargar datos de administración");
  return data as T;
}

export function AdminPage() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evt, session) => setToken(session?.access_token ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const clientsQuery = useQuery({
    queryKey: ["admin-clients", token],
    queryFn: () => fetchAdminData<{ clients: ClientItem[] }>("/api/admin/clients"),
    enabled: Boolean(token),
  });
  const staffQuery = useQuery({
    queryKey: ["admin-staff", token],
    queryFn: () => fetchAdminData<{ staff: StaffItem[] }>("/api/admin/staff"),
    enabled: Boolean(token),
  });
  const servicesQuery = useQuery({
    queryKey: ["admin-services", token],
    queryFn: () => fetchAdminData<{ services: ServiceItem[] }>("/api/admin/services"),
    enabled: Boolean(token),
  });
  const bookingsQuery = useQuery({
    queryKey: ["admin-bookings", token],
    queryFn: () => fetchAdminData<{ bookings: BookingItem[] }>("/api/admin/bookings"),
    enabled: Boolean(token),
  });

  const postMutation = useMutation({
    mutationFn: async ({ path, body }: { path: string; body: unknown }) => {
      const headers = await authHeaders();
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (e) => setError((e as Error).message),
  });

  const putMutation = useMutation({
    mutationFn: async ({ path, body }: { path: string; body: unknown }) => {
      const headers = await authHeaders();
      const res = await fetch(path, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al actualizar");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <div className="min-h-screen bg-stone-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold text-stone-800">Entorno de administración</h1>
            <div className="flex gap-2">
              <Link to="/" className="rounded border border-stone-300 px-3 py-1.5 text-sm text-stone-700">
                Inicio
              </Link>
              <Link to="/reservas" className="rounded border border-stone-300 px-3 py-1.5 text-sm text-stone-700">
                Reservas
              </Link>
              <button
                type="button"
                onClick={async () => {
                  if (!supabase) {
                    setError(getSupabaseConfigError() ?? "Supabase no está configurado");
                    return;
                  }
                  await supabase.auth.signOut();
                }}
                className="rounded border border-stone-300 px-3 py-1.5 text-sm text-stone-700"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
          {!token && <p className="mt-2 text-sm text-stone-600">Inicia sesión con Google para usar admin.</p>}
        </div>

        {!token && (
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <button
              type="button"
              onClick={async () => {
                setError(null);
                if (!supabase) {
                  setError(getSupabaseConfigError() ?? "Supabase no está configurado");
                  return;
                }
                const { error: authError } = await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo: `${window.location.origin}/admin` },
                });
                if (authError) setError(authError.message);
              }}
              className="rounded bg-stone-800 px-4 py-2 text-white"
            >
              Acceso administrador con Google
            </button>
          </div>
        )}

        {token && (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <h2 className="text-lg font-semibold text-stone-800">Alta de clientes</h2>
                <form
                  className="mt-3 grid gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    postMutation.mutate({
                      path: "/api/admin/clients",
                      body: {
                        name: String(fd.get("name") ?? ""),
                        email: String(fd.get("email") ?? ""),
                        phone: String(fd.get("phone") ?? ""),
                        sex: String(fd.get("sex") ?? "PREFIERO_NO_DECIR"),
                        birthday: String(fd.get("birthday") ?? "") || null,
                        tier: String(fd.get("tier") ?? "REGULAR"),
                      },
                    });
                    e.currentTarget.reset();
                  }}
                >
                  <input name="name" placeholder="Nombre completo" required className="rounded border px-3 py-2" />
                  <input name="email" placeholder="Correo" required className="rounded border px-3 py-2" />
                  <input name="phone" placeholder="Teléfono" required className="rounded border px-3 py-2" />
                  <input name="birthday" type="date" className="rounded border px-3 py-2" />
                  <select name="sex" className="rounded border px-3 py-2">
                    <option value="FEMENINO">Femenino</option>
                    <option value="MASCULINO">Masculino</option>
                    <option value="OTRO">Otro</option>
                    <option value="PREFIERO_NO_DECIR">Prefiero no decir</option>
                  </select>
                  <select name="tier" className="rounded border px-3 py-2">
                    <option value="REGULAR">Regular</option>
                    <option value="SILVER">Silver</option>
                    <option value="GOLD">Gold</option>
                  </select>
                  <button type="submit" className="rounded bg-stone-800 px-4 py-2 text-white">
                    Guardar cliente
                  </button>
                </form>
              </section>

              <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <h2 className="text-lg font-semibold text-stone-800">Alta de staff y servicios</h2>
                <form
                  className="mt-3 grid gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    postMutation.mutate({
                      path: "/api/admin/staff",
                      body: {
                        name: String(fd.get("name") ?? ""),
                        email: String(fd.get("email") ?? ""),
                        role: String(fd.get("role") ?? "staff"),
                      },
                    });
                    e.currentTarget.reset();
                  }}
                >
                  <input name="name" placeholder="Nombre staff" required className="rounded border px-3 py-2" />
                  <input name="email" placeholder="Correo staff" required className="rounded border px-3 py-2" />
                  <input name="role" placeholder="Rol" className="rounded border px-3 py-2" defaultValue="staff" />
                  <button type="submit" className="rounded border border-stone-300 px-4 py-2 text-stone-700">
                    Crear staff
                  </button>
                </form>

                <form
                  className="mt-4 grid gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    postMutation.mutate({
                      path: "/api/admin/services",
                      body: {
                        name: String(fd.get("name") ?? ""),
                        durationMinutes: Number(fd.get("durationMinutes") ?? 0),
                        bufferMinutes: Number(fd.get("bufferMinutes") ?? 0),
                        price: Number(fd.get("price") ?? 0),
                        staffId: String(fd.get("staffId") ?? ""),
                      },
                    });
                    e.currentTarget.reset();
                  }}
                >
                  <input name="name" placeholder="Nombre servicio" required className="rounded border px-3 py-2" />
                  <input name="durationMinutes" type="number" placeholder="Duración (min)" required className="rounded border px-3 py-2" />
                  <input name="bufferMinutes" type="number" placeholder="Buffer (min)" className="rounded border px-3 py-2" />
                  <input name="price" type="number" step="0.01" placeholder="Precio" required className="rounded border px-3 py-2" />
                  <select name="staffId" required className="rounded border px-3 py-2">
                    <option value="">Selecciona staff</option>
                    {(staffQuery.data?.staff ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="rounded bg-stone-800 px-4 py-2 text-white">
                    Crear servicio
                  </button>
                </form>
              </section>
            </div>

            <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-stone-800">Alta manual de reserva</h2>
              <form
                className="mt-3 grid gap-2 md:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  postMutation.mutate({
                    path: "/api/admin/bookings/manual",
                    body: {
                      clientId: String(fd.get("clientId") ?? ""),
                      serviceId: String(fd.get("serviceId") ?? ""),
                      staffId: String(fd.get("staffId") ?? ""),
                        startTime: toIsoDateTime(String(fd.get("startTime") ?? "")),
                        endTime: toIsoDateTime(String(fd.get("endTime") ?? "")),
                      status: String(fd.get("status") ?? "CONFIRMED"),
                      notes: String(fd.get("notes") ?? ""),
                    },
                  });
                  e.currentTarget.reset();
                }}
              >
                <select name="clientId" required className="rounded border px-3 py-2">
                  <option value="">Cliente</option>
                  {(clientsQuery.data?.clients ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
                <select name="serviceId" required className="rounded border px-3 py-2">
                  <option value="">Servicio</option>
                  {(servicesQuery.data?.services ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select name="staffId" required className="rounded border px-3 py-2">
                  <option value="">Staff</option>
                  {(staffQuery.data?.staff ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select name="status" className="rounded border px-3 py-2">
                  <option value="CONFIRMED">Confirmada</option>
                  <option value="PENDING">Pendiente</option>
                  <option value="CANCELLED">Cancelada</option>
                </select>
                <input name="startTime" type="datetime-local" required className="rounded border px-3 py-2" />
                <input name="endTime" type="datetime-local" required className="rounded border px-3 py-2" />
                <input name="notes" placeholder="Notas" className="rounded border px-3 py-2 md:col-span-2" />
                <button type="submit" className="rounded bg-stone-800 px-4 py-2 text-white md:col-span-2">
                  Crear reserva manual
                </button>
              </form>
            </section>

            <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-stone-800">Reservas existentes</h2>
              <div className="mt-3 space-y-3">
                {(bookingsQuery.data?.bookings ?? []).map((b) => (
                  <form
                    key={b.id}
                    className="grid gap-2 rounded border border-stone-200 p-3 md:grid-cols-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      putMutation.mutate({
                        path: `/api/admin/bookings/${b.id}`,
                        body: {
                          startTime: toIsoDateTime(String(fd.get("startTime") ?? b.startTime.slice(0, 16))),
                          endTime: toIsoDateTime(String(fd.get("endTime") ?? b.endTime.slice(0, 16))),
                          status: String(fd.get("status") ?? b.status),
                          notes: String(fd.get("notes") ?? ""),
                        },
                      });
                    }}
                  >
                    <div className="md:col-span-4 text-sm text-stone-700">
                      {b.client.name} - {b.service.name}
                    </div>
                    <input name="startTime" type="datetime-local" defaultValue={b.startTime.slice(0, 16)} className="rounded border px-3 py-2" />
                    <input name="endTime" type="datetime-local" defaultValue={b.endTime.slice(0, 16)} className="rounded border px-3 py-2" />
                    <select name="status" defaultValue={b.status} className="rounded border px-3 py-2">
                      <option value="PENDING">Pendiente</option>
                      <option value="CONFIRMED">Confirmada</option>
                      <option value="CANCELLED">Cancelada</option>
                    </select>
                    <button type="submit" className="rounded bg-stone-800 px-4 py-2 text-white">
                      Guardar cambios
                    </button>
                    <input name="notes" defaultValue={b.notes ?? ""} placeholder="Notas" className="rounded border px-3 py-2 md:col-span-4" />
                  </form>
                ))}
              </div>
            </section>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
