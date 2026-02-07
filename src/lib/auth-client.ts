import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Base URL is automatically inferred when running on the same domain
});

// Export commonly used methods for convenience
export const { signIn, signUp, signOut, useSession } = authClient;
