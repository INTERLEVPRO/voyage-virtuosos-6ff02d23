/** Übersetzt die englischen Auth-Fehlermeldungen in verständliches Deutsch. */
export function authErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("email not confirmed")) {
    return "Deine E-Mail-Adresse ist noch nicht bestätigt. Bitte öffne den Link in unserer Bestätigungs-E-Mail (auch im Spam-Ordner nachsehen).";
  }
  if (m.includes("invalid login credentials")) {
    return "E-Mail oder Passwort ist falsch.";
  }
  if (m.includes("weak") || m.includes("pwned")) {
    return "Dieses Passwort ist zu unsicher. Bitte wähle ein längeres Passwort mit Zahlen und Sonderzeichen.";
  }
  if (m.includes("user already registered")) {
    return "Für diese E-Mail-Adresse gibt es bereits ein Konto. Bitte melde dich an.";
  }
  if (m.includes("password should be at least")) {
    return "Das Passwort muss mindestens 8 Zeichen lang sein.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Zu viele Versuche. Bitte warte einen Moment und versuche es erneut.";
  }
  if (m.includes("unable to validate email") || m.includes("invalid email")) {
    return "Bitte gib eine gültige E-Mail-Adresse ein.";
  }
  return message;
}

export function isUnconfirmedEmail(message: string): boolean {
  return message.toLowerCase().includes("email not confirmed");
}
