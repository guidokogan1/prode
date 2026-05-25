import { createSessionToken, hashPin, hashSessionToken, verifyPin } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type UserRow = {
  id: string;
  display_name: string;
};

type CredentialRow = {
  pin_hash: string;
};

export async function createOrVerifySession(displayName: string, pin: string) {
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
    throw existingUserQuery.error;
  }

  let user = existingUserQuery.data;

  if (!user) {
    const createdUserQuery = await supabase
      .from("users")
      .insert({ display_name: displayName })
      .select("id, display_name")
      .single<UserRow>();

    if (createdUserQuery.error) {
      throw createdUserQuery.error;
    }

    user = createdUserQuery.data;

    const credentialInsert = await supabase.schema("app_private").from("user_credentials").insert({
      user_id: user.id,
      pin_hash: hashPin(pin),
    });

    if (credentialInsert.error) {
      throw credentialInsert.error;
    }
  } else {
    const credentialQuery = await supabase
      .schema("app_private")
      .from("user_credentials")
      .select("pin_hash")
      .eq("user_id", user.id)
      .single<CredentialRow>();

    if (credentialQuery.error) {
      throw credentialQuery.error;
    }

    if (!verifyPin(pin, credentialQuery.data.pin_hash)) {
      return null;
    }
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
    throw sessionInsert.error;
  }

  return {
    displayName: user.display_name,
    sessionToken,
  };
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
    throw sessionQuery.error;
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
    throw userQuery.error;
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
