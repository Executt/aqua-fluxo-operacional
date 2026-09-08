// =============================================================================
// admin-users
// Gestão de utilizadores reais (auth) + perfis + papéis. Apenas admin.
// Ações: list | create | set_roles | set_active | reset_password | delete
// =============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsFor, rateLimit } from "../_shared/cors.ts";

const ROLES = ["admin", "gestor", "compliance", "auditor", "operador"] as const;
type Role = (typeof ROLES)[number];

Deno.serve(async (req) => {
  const cors = corsFor(req);
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userResp } = await userClient.auth.getUser();
  const caller = userResp?.user;
  if (!caller) return json({ error: "Unauthorized" }, 401);

  if (!rateLimit(`admin-users:${caller.id}`, 60, 60_000)) {
    return json({ error: "Rate limit excedido" }, 429);
  }

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: callerRoles } = await admin.from("user_roles").select("role").eq("user_id", caller.id);
  const isAdmin = (callerRoles ?? []).some((r: { role: string }) => r.role === "admin");
  if (!isAdmin) return json({ error: "Apenas administradores" }, 403);

  const body = await req.json().catch(() => null);
  const action = body?.action as string | undefined;

  const validRoles = (arr: unknown): Role[] =>
    Array.isArray(arr) ? (arr.filter((r) => ROLES.includes(r as Role)) as Role[]) : [];

  const audit = async (entity_id: string, act: string, name: string | null, after: unknown) => {
    await admin.from("infra_audit_log").insert({
      entity_type: "user",
      entity_id,
      entity_name: name,
      action: act,
      changed_by: caller.id,
      changed_by_email: caller.email ?? null,
      after_json: after as never,
    });
  };

  try {
    switch (action) {
      case "list": {
        const { data: users, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        if (error) throw error;
        const ids = users.users.map((u) => u.id);
        const [{ data: profiles }, { data: roles }] = await Promise.all([
          admin.from("profiles").select("user_id, nome, email, ativo, operador_id").in("user_id", ids),
          admin.from("user_roles").select("user_id, role").in("user_id", ids),
        ]);
        const list = users.users.map((u) => {
          const p = (profiles ?? []).find((x: any) => x.user_id === u.id);
          return {
            user_id: u.id,
            email: u.email,
            nome: p?.nome ?? (u.user_metadata?.nome as string) ?? u.email?.split("@")[0],
            ativo: p?.ativo ?? true,
            operador_id: p?.operador_id ?? null,
            last_sign_in_at: u.last_sign_in_at,
            created_at: u.created_at,
            email_confirmed: !!u.email_confirmed_at,
            roles: (roles ?? []).filter((r: any) => r.user_id === u.id).map((r: any) => r.role),
          };
        });
        return json({ users: list });
      }

      case "create": {
        const email = String(body?.email ?? "").trim().toLowerCase();
        const nome = String(body?.nome ?? "").trim();
        const password = String(body?.password ?? "");
        const roles = validRoles(body?.roles);
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "E-mail inválido" }, 400);
        if (password.length < 10) return json({ error: "A palavra-passe precisa de pelo menos 10 caracteres" }, 400);
        if (!nome) return json({ error: "Nome obrigatório" }, 400);
        if (!roles.length) return json({ error: "Selecione ao menos um perfil" }, 400);

        const { data: created, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { nome },
        });
        if (error) throw error;
        const uid = created.user!.id;
        await admin.from("profiles").upsert(
          { user_id: uid, nome, email, ativo: true },
          { onConflict: "user_id" },
        );
        await admin.from("user_roles").insert(roles.map((role) => ({ user_id: uid, role })));
        await audit(uid, "create", nome, { email, roles });
        return json({ ok: true, user_id: uid });
      }

      case "set_roles": {
        const uid = String(body?.user_id ?? "");
        const roles = validRoles(body?.roles);
        if (!uid || !roles.length) return json({ error: "Dados inválidos" }, 400);
        if (uid === caller.id && !roles.includes("admin")) {
          return json({ error: "Não pode remover o seu próprio perfil de administrador" }, 400);
        }
        await admin.from("user_roles").delete().eq("user_id", uid);
        await admin.from("user_roles").insert(roles.map((role) => ({ user_id: uid, role })));
        await audit(uid, "update", null, { roles });
        return json({ ok: true });
      }

      case "set_active": {
        const uid = String(body?.user_id ?? "");
        const ativo = !!body?.ativo;
        if (!uid) return json({ error: "Dados inválidos" }, 400);
        if (uid === caller.id && !ativo) return json({ error: "Não pode desativar a sua própria conta" }, 400);
        await admin.from("profiles").update({ ativo }).eq("user_id", uid);
        await admin.auth.admin.updateUserById(uid, { ban_duration: ativo ? "none" : "876000h" });
        await audit(uid, ativo ? "activate" : "deactivate", null, { ativo });
        return json({ ok: true });
      }

      case "reset_password": {
        const uid = String(body?.user_id ?? "");
        const password = String(body?.password ?? "");
        if (!uid || password.length < 10) return json({ error: "Palavra-passe demasiado curta" }, 400);
        const { error } = await admin.auth.admin.updateUserById(uid, { password });
        if (error) throw error;
        await audit(uid, "update", null, { password_reset: true });
        return json({ ok: true });
      }

      case "delete": {
        const uid = String(body?.user_id ?? "");
        if (!uid) return json({ error: "Dados inválidos" }, 400);
        if (uid === caller.id) return json({ error: "Não pode eliminar a sua própria conta" }, 400);
        await admin.from("user_roles").delete().eq("user_id", uid);
        await admin.from("profiles").delete().eq("user_id", uid);
        const { error } = await admin.auth.admin.deleteUser(uid);
        if (error) throw error;
        await audit(uid, "delete", null, {});
        return json({ ok: true });
      }

      default:
        return json({ error: "Ação desconhecida" }, 400);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
