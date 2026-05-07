type BootstrapResult = {
  organizationId: string | null;
  error?: string;
};

type MinimalUser = {
  id: string;
  email?: string | null;
};

export async function ensureDemoOwnerBootstrap(
  _user: MinimalUser | null
): Promise<BootstrapResult> {
  return { organizationId: null } satisfies BootstrapResult;
}
