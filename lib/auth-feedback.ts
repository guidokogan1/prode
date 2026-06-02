type AuthFlow = "login" | "register" | "pin";

type AuthPayload = {
  error?: string;
  detail?: string;
} | null;

function getInfraMessage(flow: AuthFlow) {
  if (flow === "register") {
    return "No pudimos conectar el registro con la base de acceso. Hay una configuración pendiente del servidor.";
  }

  if (flow === "pin") {
    return "No pudimos conectar el cambio de PIN con la base de acceso. Hay una configuración pendiente del servidor.";
  }

  return "No pudimos conectar el acceso con la base de acceso. Hay una configuración pendiente del servidor.";
}

export function getAuthErrorMessage(flow: AuthFlow, status: number, payload: AuthPayload) {
  const detail = payload?.detail?.toLowerCase() ?? "";
  const error = payload?.error ?? "";

  if (flow === "register" && status === 409) {
    return "Ese nombre ya existe. Probá otro o iniciá sesión.";
  }

  if (flow === "login" && status === 401) {
    return "Nombre o PIN incorrectos.";
  }

  if (flow === "pin" && status === 401) {
    return "Nombre o PIN actual incorrectos.";
  }

  if (status === 503 || error === "remote auth unavailable") {
    if (flow === "register") {
      return "El registro real no está disponible en este entorno.";
    }

    if (flow === "pin") {
      return "El cambio de PIN no está disponible en este entorno.";
    }

    return "El acceso real no está disponible en este entorno.";
  }

  if (
    detail.includes("enotfound") ||
    detail.includes("fetch failed") ||
    detail.includes("supabase.co") ||
    error === "register_failed" ||
    error === "login_failed" ||
    error === "pin_change_failed"
  ) {
    return getInfraMessage(flow);
  }

  if (status === 500) {
    if (flow === "register") {
      return "Error del servidor al crear la cuenta.";
    }

    if (flow === "pin") {
      return "Error del servidor al cambiar el PIN.";
    }

    return "Error del servidor al iniciar sesión.";
  }

  if (flow === "register") {
    return "No pudimos crear la cuenta ahora. Probá de nuevo.";
  }

  if (flow === "pin") {
    return "No pudimos cambiar el PIN ahora. Probá de nuevo.";
  }

  return "No pudimos validar tu cuenta ahora. Probá de nuevo.";
}
