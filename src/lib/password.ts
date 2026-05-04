export const passwordRequirementText =
  "Password must be at least 8 characters and include a number and a symbol.";

export function isStrongPassword(password: string) {
  return password.length >= 8 && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}
