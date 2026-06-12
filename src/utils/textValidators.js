/**
 * Validates an email address.
 * Rule: Must contain an "@" symbol with characters before and after it,
 *       followed by a "." and a domain extension.
 * @param {string} value
 * @returns {{ valid: boolean, message: string }}
 */
export function email(value) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const valid = regex.test(value);
  return {
    valid,
    message: valid ? "Valid email." : "Email must contain a valid '@' and domain (e.g. user@example.com).",
  };
}

/**
 * Validates a password.
 * Rules:
 *  - Minimum 8 characters
 *  - At least 1 uppercase letter
 *  - At least 1 lowercase letter
 *  - At least 1 number
 *  - At least 1 special character (!@#$%^&* etc.)
 * @param {string} value
 * @returns {{ valid: boolean, message: string }}
 */
export function password(value) {
  const checks = [
    { regex: /.{8,}/,          message: "at least 8 characters"          },
    { regex: /[A-Z]/,          message: "at least 1 uppercase letter"    },
    { regex: /[a-z]/,          message: "at least 1 lowercase letter"    },
    { regex: /[0-9]/,          message: "at least 1 number"              },
    { regex: /[^A-Za-z0-9]/,   message: "at least 1 special character"   },
  ];

  const failed = checks.filter(({ regex }) => !regex.test(value)).map(({ message }) => message);

  const valid = failed.length === 0;
  return {
    valid,
    message: valid
      ? "Valid password."
      : `Password must contain: ${failed.join(", ")}.`,
  };
}

/**
 * Validates a phone number.
 * Rules:
 *  - Must contain digits only (no spaces, dashes, or symbols)
 *  - Maximum length of 15 digits
 * @param {string} value
 * @returns {{ valid: boolean, message: string }}
 */
export function phoneNumber(value) {
  const digitsOnly = /^\d+$/.test(value);
  const withinLength = value.length <= 15;

  const valid = digitsOnly && withinLength;

  if (!digitsOnly) {
    return { valid: false, message: "Phone number must contain digits only (no spaces or symbols)." };
  }
  if (!withinLength) {
    return { valid: false, message: "Phone number must not exceed 15 digits." };
  }
  return { valid: true, message: "Valid phone number." };
}

/**
 * Validates a username.
 * Rules:
 *  - No spaces allowed
 *  - Only letters, numbers, underscores (_), and dots (.) are permitted
 * @param {string} value
 * @returns {{ valid: boolean, message: string }}
 */
export function username(value) {
  const regex = /^[A-Za-z0-9_.]+$/;
  const valid = regex.test(value);
  return {
    valid,
    message: valid
      ? "Valid username."
      : "Username may only contain letters, numbers, underscores (_), and dots (.). No spaces or other special characters.",
  };
}
