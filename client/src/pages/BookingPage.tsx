import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { getSupabaseConfigError, supabase } from "../lib/supabase";

const bookingSchema = z.object({
  phone: z.string().min(1, "El teléfono es obligatorio"),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  serviceId: z.string().min(1, "Selecciona un servicio"),
  date: z.string().optional(),
  startTime: z.string(),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;
type ClientTier = "REGULAR" | "SILVER" | "GOLD";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  tier: ClientTier;
  phone: string;
  sex?: string | null;
  birthday?: string | null;
}

const profileSchema = z.object({
  name: z.string().min(1, "El nombre completo es obligatorio"),
  phone: z.string().min(1, "El teléfono es obligatorio"),
  sex: z.enum(["FEMENINO", "MASCULINO", "OTRO", "PREFIERO_NO_DECIR"]),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

type ProfileFormData = z.infer<typeof profileSchema>;

async function fetchAvailability(date: string, serviceId: string, token: string) {
  const params = new URLSearchParams({ date, serviceId });
  const res = await fetch(`/api/availability?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Error al cargar la disponibilidad");
  const data = await res.json();
  return data.slots as { start: string; end: string }[];
}

async function fetchServices() {
  const res = await fetch("/api/services");
  if (!res.ok) return [];
  const data = await res.json();
  return data.services ?? [];
}

async function createBooking({
  body,
  token,
  name,
  email,
}: {
  body: BookingFormData;
  token: string;
  name: string;
  email: string;
}) {
  const res = await fetch("/api/bookings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...body,
      name,
      email,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al reservar");
  return data;
}

export function BookingPage() {
  const queryClient = useQueryClient();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const meQuery = useQuery({
    queryKey: ["me", token],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo obtener el usuario");
      return data.user as AuthUser;
    },
    enabled: Boolean(token),
    retry: false,
  });

  const currentUser = meQuery.data;
  const currentTier = currentUser?.tier ?? "REGULAR";
  const profileComplete = useMemo(
    () =>
      Boolean(currentUser?.name && currentUser?.email && currentUser?.phone && currentUser?.sex && currentUser?.birthday),
    [currentUser]
  );

  useEffect(() => {
    if (token && meQuery.isError) {
      setToken(null);
    }
  }, [token, meQuery.isError]);

  useEffect(() => {
    const configError = getSupabaseConfigError();
    if (configError) {
      setAuthError(configError);
      return;
    }
    if (!supabase) return;

    let isMounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setToken(data.session?.access_token ?? null);
      })
      .catch(() => {
        if (!isMounted) return;
        setAuthError("No se pudo recuperar la sesión de Supabase");
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: fetchServices,
  });

  const today = new Date().toISOString().slice(0, 10);
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: currentUser?.name ?? "",
      phone: currentUser?.phone ?? "",
      sex: (currentUser?.sex as ProfileFormData["sex"]) ?? "PREFIERO_NO_DECIR",
      birthday: currentUser?.birthday ? currentUser.birthday.slice(0, 10) : "",
    },
  });

  useEffect(() => {
    if (!currentUser) return;
    profileForm.reset({
      name: currentUser.name ?? "",
      phone: currentUser.phone ?? "",
      sex: (currentUser.sex as ProfileFormData["sex"]) ?? "PREFIERO_NO_DECIR",
      birthday: currentUser.birthday ? currentUser.birthday.slice(0, 10) : "",
    });
  }, [currentUser, profileForm]);
  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      phone: "",
      serviceId: "",
      birthday: "",
      date: today,
      startTime: "",
      notes: "",
    },
  });

  const date = form.watch("date") ?? today;
  const serviceId = form.watch("serviceId");
  const dateStr = date && date.length >= 10 ? date.slice(0, 10) : "";

  const { data: slots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ["availability", dateStr, serviceId, currentTier, token],
    queryFn: () => fetchAvailability(dateStr, serviceId, token ?? ""),
    enabled: Boolean(dateStr && serviceId && token),
  });

  const bookMutation = useMutation({
    mutationFn: (values: BookingFormData) =>
      createBooking({
        body: values,
        token: token ?? "",
        name: currentUser?.name ?? "",
        email: currentUser?.email ?? "",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability"] });
      setSelectedSlot(null);
      form.reset();
    },
  });

  const profileMutation = useMutation({
    mutationFn: async (values: ProfileFormData) => {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar el perfil");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    if (!selectedSlot) return;
    if (!token || !currentUser) return;
    const { birthday, ...rest } = values;
    const nextValues: BookingFormData = {
      ...rest,
      startTime: selectedSlot,
      birthday: birthday && birthday.trim() ? birthday : undefined,
    };
    bookMutation.mutate(nextValues);
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#F8F0E4] via-stone-50 to-stone-100 p-6">
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
        <img
          src="/nomade-logo.png"
          alt="Nomade Peluqueria decorativo"
          className="h-auto w-[95vw] max-w-[1400px] object-contain opacity-15"
        />
      </div>
      <div className="relative z-10 mx-auto max-w-3xl">
        <div className="rounded-2xl border border-[#E9DDCA] bg-white/88 p-6 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col items-center text-center">
            <h1 className="mt-4 text-2xl font-semibold tracking-wide text-stone-800">
              Reservar una cita
            </h1>
          </div>
          <p className="mt-2 text-center text-stone-600">
            Inicia sesión con Google para ver disponibilidad según tu categoría.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link to="/" className="rounded border border-stone-300 px-3 py-1.5 text-sm text-stone-700">
              Volver a bienvenida
            </Link>
            <Link to="/admin" className="rounded border border-stone-300 px-3 py-1.5 text-sm text-stone-700">
              Administración
            </Link>
          </div>
        </div>

        {!token ? (
          <div className="mt-6 rounded-xl border border-stone-200 bg-white/90 p-4 shadow-sm">
            <p className="mb-3 text-sm text-stone-700">Acceso de clientes</p>
            <button
              type="button"
              onClick={async () => {
                try {
                  setAuthError(null);
                  if (!supabase) {
                    throw new Error(getSupabaseConfigError() ?? "Supabase no está configurado");
                  }
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: "google",
                    options: {
                      redirectTo: window.location.origin,
                    },
                  });
                  if (error) {
                    throw error;
                  }
                } catch (e) {
                  setAuthError((e as Error).message);
                }
              }}
              className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
            >
              Iniciar sesión con Google
            </button>
            {authError && <p className="mt-2 text-sm text-red-600">{authError}</p>}
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-stone-200 bg-white/90 p-4 shadow-sm">
            <p className="text-sm text-stone-700">
              Sesión iniciada como <strong>{currentUser?.email ?? "-"}</strong>
            </p>
            <p className="text-sm text-stone-700">
              Categoría: <strong>{currentTier}</strong>
            </p>
            <button
              type="button"
              onClick={async () => {
                if (supabase) {
                  await supabase.auth.signOut();
                }
                setToken(null);
                setSelectedSlot(null);
                form.reset();
              }}
              className="mt-3 rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 transition hover:bg-stone-100"
            >
              Cerrar sesión
            </button>
          </div>
        )}

        {token && !profileComplete && (
          <form
            onSubmit={profileForm.handleSubmit((values) => profileMutation.mutate(values))}
            className="mt-8 space-y-4 rounded-2xl border border-stone-200 bg-white/95 p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-stone-800">Completa tus datos antes de reservar</h2>
            <p className="text-sm text-stone-600">
              Necesitamos nombre completo, sexo, fecha de nacimiento, correo y teléfono.
            </p>
            <div>
              <label className="block text-sm font-medium text-stone-700">Correo</label>
              <input
                value={currentUser?.email ?? ""}
                readOnly
                className="mt-1 block w-full rounded border border-stone-200 bg-stone-100 px-3 py-2 text-stone-700"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-stone-700">Nombre completo</label>
                <input {...profileForm.register("name")} className="mt-1 block w-full rounded border border-stone-300 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">Teléfono</label>
                <input {...profileForm.register("phone")} className="mt-1 block w-full rounded border border-stone-300 px-3 py-2" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-stone-700">Sexo</label>
                <select {...profileForm.register("sex")} className="mt-1 block w-full rounded border border-stone-300 px-3 py-2">
                  <option value="FEMENINO">Femenino</option>
                  <option value="MASCULINO">Masculino</option>
                  <option value="OTRO">Otro</option>
                  <option value="PREFIERO_NO_DECIR">Prefiero no decir</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">Fecha de nacimiento</label>
                <input type="date" {...profileForm.register("birthday")} className="mt-1 block w-full rounded border border-stone-300 px-3 py-2" />
              </div>
            </div>
            {profileMutation.isError && <p className="text-sm text-red-600">{(profileMutation.error as Error).message}</p>}
            <button type="submit" className="rounded bg-stone-800 px-4 py-2 font-medium text-white">
              Guardar datos de cliente
            </button>
          </form>
        )}

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-6 rounded-2xl border border-stone-200 bg-white/90 p-6 shadow-sm"
        >
          <div>
            <label className="block text-sm font-medium text-stone-700">Servicio</label>
            <select
              {...form.register("serviceId")}
              className="mt-1 block w-full rounded border border-stone-300 px-3 py-2 text-stone-900"
            >
              <option value="">Seleccionar servicio</option>
              {services.map((s: { id: string; name: string }) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {form.formState.errors.serviceId && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.serviceId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700">Fecha</label>
            <input
              type="date"
              {...form.register("date")}
              className="mt-1 block w-full rounded border border-stone-300 px-3 py-2 text-stone-900"
            />
            {form.formState.errors.date && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.date.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700">Hora</label>
            {slotsLoading ? (
              <p className="text-stone-500">Cargando horarios…</p>
            ) : !token ? (
              <p className="text-stone-500">Inicia sesión para ver horarios disponibles.</p>
            ) : slots.length === 0 && dateStr && serviceId ? (
              <p className="text-stone-500">No hay horarios disponibles para esta fecha.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.start}
                    type="button"
                    onClick={() => setSelectedSlot(slot.start)}
                    className={`rounded px-3 py-1.5 text-sm ${
                      selectedSlot === slot.start
                        ? "bg-stone-800 text-white"
                        : "bg-stone-200 text-stone-800 hover:bg-stone-300"
                    }`}
                  >
                    {new Date(slot.start).toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-stone-700">Teléfono</label>
              <input
                {...form.register("phone")}
                className="mt-1 block w-full rounded border border-stone-300 px-3 py-2 text-stone-900"
              />
              {form.formState.errors.phone && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.phone.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700">Fecha de nacimiento (opcional)</label>
            <input
              type="date"
              {...form.register("birthday")}
              className="mt-1 block w-full rounded border border-stone-300 px-3 py-2 text-stone-900"
            />
            {form.formState.errors.birthday && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.birthday.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700">Notas (opcional)</label>
            <textarea
              {...form.register("notes")}
              rows={2}
              className="mt-1 block w-full rounded border border-stone-300 px-3 py-2 text-stone-900"
            />
          </div>

          {bookMutation.isError && (
            <p className="text-sm text-red-600">{(bookMutation.error as Error).message}</p>
          )}
          {bookMutation.isSuccess && (
            <p className="text-sm text-green-700">Reserva creada correctamente.</p>
          )}

          <button
            type="submit"
            disabled={!token || !profileComplete || !selectedSlot || bookMutation.isPending || meQuery.isLoading}
            className="w-full rounded bg-stone-800 px-4 py-2 font-medium text-white hover:bg-stone-700 disabled:opacity-50"
          >
            {bookMutation.isPending ? "Reservando…" : "Confirmar reserva"}
          </button>
        </form>

      </div>
    </div>
  );
}
