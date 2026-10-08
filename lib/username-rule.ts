/**
 * Username normalization and validation utility according to README.md §7.5:
 * norm(username) includes norm(realName) AND norm(username).length > norm(realName).length
 * (the rule is "username = name + something")
 */

export const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export interface UsernameValidationResult {
  valid: boolean;
  error?: string;
}

export function validateUsername(realName: string, username: string): UsernameValidationResult {
  if (!realName || realName.trim().length === 0) {
    return { valid: false, error: "Real name is required." };
  }

  if (!username || username.trim().length === 0) {
    return { valid: false, error: "Username is required." };
  }

  const nName = norm(realName);
  const nUser = norm(username);

  if (nName.length === 0) {
    return { valid: false, error: "Real name must contain alphanumeric characters." };
  }

  if (!nUser.includes(nName)) {
    return {
      valid: false,
      error: `Username must contain your real name ("${realName}"). Example: "${nName}01"`,
    };
  }

  if (nUser.length <= nName.length) {
    return {
      valid: false,
      error: `Username must contain additional characters after your name ("username = name + something"). Example: "${nName}01"`,
    };
  }

  return { valid: true };
}
