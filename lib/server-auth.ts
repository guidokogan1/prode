import { createSessionToken, hashPin, hashSessionToken, verifyPin } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type UserRow = {
  id: string;
  display_name: string;
};

type CredentialRow = {
  pin_hash: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const candidate = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };
    const parts = [
      typeof candidate.message === "string" ? candidate.message : null,
      typeof candidate.details === "string" && candidate.details.length > 0 ? candidate.details : null,
      typeof candidate.hint === "string" && candidate.hint.length > 0 ? candidate.hint : null,
      typeof candidate.code === "string" && candidate.code.length > 0 ? `code ${candidate.code}` : null,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(" · ");
    }
  }

  return "unexpected auth error";
}

function describeStepError(step: string, error: unknown) {
  return `${step}: ${getErrorMessage(error)}`;
}

async function findUserByDisplayName(displayName: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const existingUserQuery = await supabase
    .from("users")
    .select("id, display_name")
    .ilike("display_name", displayName)
    .maybeSingle<UserRow>();

  if (existingUserQuery.error) {
    throw new Error(describeStepError("buscar usuario", existingUserQuery.error));
  }

  return existingUserQuery.data;
}

async function createSessionForUser(user: UserRow) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const sessionToken = createSessionToken();
  const tokenHash = hashSessionToken(sessionToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 45).toISOString();

  const sessionInsert = await supabase.schema("app_private").from("user_sessions").insert({
    user_id: user.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (sessionInsert.error) {
    throw new Error(describeStepError("crear sesión", sessionInsert.error));
  }

  return {
    displayName: user.display_name,
    sessionToken,
  };
}

export async function registerSession(displayName: string, pin: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { ok: false as const, reason: "unavailable" as const };
  }

  const existingUser = await findUserByDisplayName(displayName);
  if (existingUser) {
    return { ok: false as const, reason: "name_taken" as const };
  }

  const createdUserQuery = await supabase
    .from("users")
    .insert({ display_name: displayName })
    .select("id, display_name")
    .single<UserRow>();

  if (createdUserQuery.error) {
    throw new Error(describeStepError("crear usuario", createdUserQuery.error));
  }

  const user = createdUserQuery.data;

  const credentialInsert = await supabase.schema("app_private").from("user_credentials").insert({
    user_id: user.id,
    pin_hash: hashPin(pin),
  });

  if (credentialInsert.error) {
    throw new Error(describeStepError("guardar PIN", credentialInsert.error));
  }

  const session = await createSessionForUser(user);
  if (!session) {
    return { ok: false as const, reason: "unavailable" as const };
  }

  return {
    ok: true as const,
    ...session,
  };
}

export async function loginSession(displayName: string, pin: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { ok: false as const, reason: "unavailable" as const };
  }

  const user = await findUserByDisplayName(displayName);

  if (!user) {
    return { ok: false as const, reason: "invalid_credentials" as const };
  }

  const credentialQuery = await supabase
    .schema("app_private")
    .from("user_credentials")
    .select("pin_hash")
    .eq("user_id", user.id)
    .single<CredentialRow>();

  if (credentialQuery.error) {
    throw new Error(describeStepError("leer PIN", credentialQuery.error));
  }

  if (!verifyPin(pin, credentialQuery.data.pin_hash)) {
    return { ok: false as const, reason: "invalid_credentials" as const };
  }

  const session = await createSessionForUser(user);
  if (!session) {
    return { ok: false as const, reason: "unavailable" as const };
  }

  return {
    ok: true as const,
    ...session,
  };
}

export async function changeUserPin(displayName: string, currentPin: string, nextPin: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { ok: false as const, reason: "unavailable" as const };
  }

  const user = await findUserByDisplayName(displayName);
  if (!user) {
    return { ok: false as const, reason: "invalid_credentials" as const };
  }

  const credentialQuery = await supabase
    .schema("app_private")
    .from("user_credentials")
    .select("pin_hash")
    .eq("user_id", user.id)
    .single<CredentialRow>();

  if (credentialQuery.error) {
    throw new Error(describeStepError("leer PIN", credentialQuery.error));
  }

  if (!verifyPin(currentPin, credentialQuery.data.pin_hash)) {
    return { ok: false as const, reason: "invalid_credentials" as const };
  }

  const update = await supabase
    .schema("app_private")
    .from("user_credentials")
    .update({ pin_hash: hashPin(nextPin) })
    .eq("user_id", user.id);

  if (update.error) {
    throw new Error(describeStepError("actualizar PIN", update.error));
  }

  return { ok: true as const };
}

export async function getSessionUser(sessionToken: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const tokenHash = hashSessionToken(sessionToken);
  const sessionQuery = await supabase
    .schema("app_private")
    .from("user_sessions")
    .select("user_id, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle<{ user_id: string; expires_at: string }>();

  if (sessionQuery.error) {
    throw new Error(describeStepError("leer sesión", sessionQuery.error));
  }

  if (!sessionQuery.data) {
    return null;
  }

  if (new Date(sessionQuery.data.expires_at).getTime() < Date.now()) {
    await deleteSession(sessionToken);
    return null;
  }

  const userQuery = await supabase
    .from("users")
    .select("display_name")
    .eq("id", sessionQuery.data.user_id)
    .single<{ display_name: string }>();

  if (userQuery.error) {
    throw new Error(describeStepError("leer usuario de sesión", userQuery.error));
  }

  return {
    userId: sessionQuery.data.user_id,
    displayName: userQuery.data.display_name,
    mode: "remote" as const,
  };
}

export async function deleteSession(sessionToken: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return;
  }

  const tokenHash = hashSessionToken(sessionToken);
  await supabase.schema("app_private").from("user_sessions").delete().eq("token_hash", tokenHash);
}
