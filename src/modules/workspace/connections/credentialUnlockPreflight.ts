type ConnectionSecretRequest = {
  password?: string;
  keyPassphrase?: string;
  passwordCredentialId?: string;
  sshSocksProxyPassword?: string;
  urlPassword?: string;
};

type SshSocksProxySecretState = {
  type: string;
  sshSocksProxy?: string;
  sshSocksProxyUsername?: string;
  sshSocksProxyInheritDefaults?: boolean;
  existingSecretExists: boolean;
};

export function connectionRequestNeedsCredentialStoreUnlock(
  request: ConnectionSecretRequest,
) {
  return Boolean(
    request.password || request.keyPassphrase || request.urlPassword || request.sshSocksProxyPassword,
  );
}

export function shouldDeleteSshSocksProxySecret({
  type,
  sshSocksProxy,
  sshSocksProxyUsername,
  sshSocksProxyInheritDefaults,
  existingSecretExists,
}: SshSocksProxySecretState) {
  if (type !== "ssh" || !existingSecretExists) {
    return false;
  }
  const hasPerConnectionAuth =
    sshSocksProxyInheritDefaults === false &&
    Boolean(sshSocksProxy?.trim()) &&
    Boolean(sshSocksProxyUsername?.trim());
  return !hasPerConnectionAuth;
}
