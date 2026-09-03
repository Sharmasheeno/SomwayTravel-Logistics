// One password policy for the whole system: owner setup, staff accounts the
// owner creates, generated temporary passwords and self-service changes all
// go through here, so no route can quietly accept a weaker password.

export const PASSWORD_MIN_LENGTH = 10;

export const PASSWORD_RULE =
  "Use at least 10 characters with letters, numbers and a symbol.";

const HAS_LETTER = /[A-Za-z]/;
const HAS_NUMBER = /[0-9]/;
const HAS_SYMBOL = /[^A-Za-z0-9]/;

/**
 * Returns a message describing what is missing, or "" when the password is
 * acceptable. Returning the reason rather than a bare boolean lets each route
 * tell the person exactly what to fix.
 */
export const passwordProblem = (value) => {
  const password = String(value ?? "");
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  const missing = [];
  if (!HAS_LETTER.test(password)) missing.push("a letter");
  if (!HAS_NUMBER.test(password)) missing.push("a number");
  if (!HAS_SYMBOL.test(password)) missing.push("a symbol");
  if (!missing.length) return "";
  const list =
    missing.length === 1
      ? missing[0]
      : `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}`;
  return `Password must also include ${list}.`;
};

export const isStrongPassword = (value) => passwordProblem(value) === "";

const LETTERS = "abcdefghijkmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const NUMBERS = "23456789";
const SYMBOLS = "!@#$%&*?";

const pick = (alphabet) =>
  alphabet[Math.floor(Math.random() * alphabet.length)];

/**
 * A temporary password that satisfies the policy by construction. Ambiguous
 * characters (0/O, 1/l/I) are left out because these get read aloud and typed
 * by hand when an owner hands an account to a new staff member.
 */
export const generateStrongPassword = () => {
  const required = [
    pick(UPPERCASE),
    pick(LETTERS),
    pick(NUMBERS),
    pick(SYMBOLS),
  ];
  const pool = `${LETTERS}${UPPERCASE}${NUMBERS}${SYMBOLS}`;
  while (required.length < 14) required.push(pick(pool));
  for (let index = required.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [required[index], required[swap]] = [required[swap], required[index]];
  }
  return required.join("");
};
