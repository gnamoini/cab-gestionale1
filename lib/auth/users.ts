export type AuthUserRecord = {
  id: string;
  nome: string;
  username: string;
  password: string;
  ruolo?: string;
};

/** Utenti demo — credenziali: username minuscolo, password come da specifica. */
export const MOCK_AUTH_USERS: AuthUserRecord[] = [
  { id: "user-giorgio", nome: "Giorgio", username: "giorgio", password: "giorgio1", ruolo: "officina" },
  { id: "user-vito", nome: "Vito", username: "vito", password: "vito1", ruolo: "officina" },
  { id: "user-gaetano", nome: "Gaetano", username: "gaetano", password: "gaetano1", ruolo: "officina" },
];

export type PublicAuthUser = Omit<AuthUserRecord, "password">;

export function normalizeAuthUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function findAuthUserByCredentials(username: string, password: string): AuthUserRecord | null {
  const key = normalizeAuthUsername(username);
  const found = MOCK_AUTH_USERS.find((u) => u.username.toLowerCase() === key);
  if (!found || found.password !== password) return null;
  return found;
}

export function findAuthUserById(id: string): AuthUserRecord | undefined {
  return MOCK_AUTH_USERS.find((u) => u.id === id);
}

export function toPublicUser(u: AuthUserRecord): PublicAuthUser {
  const { password: _p, ...rest } = u;
  return rest;
}
