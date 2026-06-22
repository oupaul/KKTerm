import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { technicalInputProps } from "../../../../lib/inputBehavior";
import type { StoredCredentialSummary } from "../../../../types";
import { createStoredSecretMask } from "../connectionSidebarState";

export function PasswordField({
  autoComplete = "current-password",
  hasStoredSecret,
  initialValue = "",
  label,
  name,
  placeholder,
  required,
}: {
  autoComplete?: string;
  hasStoredSecret: boolean;
  initialValue?: string;
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const [storedSecretMask, setStoredSecretMask] = useState(createStoredSecretMask);
  const shouldShowStoredSecretMask = hasStoredSecret && !isFocused && value.length === 0;

  useEffect(() => {
    if (hasStoredSecret) {
      setStoredSecretMask(createStoredSecretMask());
    }
  }, [hasStoredSecret]);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <label>
      <span>{label}</span>
      <input
        autoComplete={autoComplete}
        {...technicalInputProps}
        name={shouldShowStoredSecretMask ? undefined : name}
        onBlur={() => setIsFocused(false)}
        onChange={(event) => setValue(event.currentTarget.value)}
        onFocus={() => setIsFocused(true)}
        placeholder={placeholder}
        required={shouldShowStoredSecretMask ? false : required}
        type="password"
        value={shouldShowStoredSecretMask ? storedSecretMask : value}
      />
    </label>
  );
}

export function PasswordCredentialSelect({
  credentials,
  selectedCredentialId,
  onChange,
}: {
  credentials: StoredCredentialSummary[];
  selectedCredentialId: string;
  onChange: (credentialId: string) => void;
}) {
  const { t } = useTranslation();
  if (credentials.length === 0) {
    return null;
  }
  return (
    <label>
      <span>{t("connections.savedPassword")}</span>
      <select
        name="passwordCredentialId"
        onChange={(event) => onChange(event.currentTarget.value)}
        value={selectedCredentialId}
      >
        <option value="">{t("connections.typeNewPassword")}</option>
        {credentials.map((credential) => (
          <option key={credential.ownerId} value={credential.ownerId}>
            {passwordCredentialOptionLabel(credential)}
          </option>
        ))}
      </select>
    </label>
  );
}

function passwordCredentialOptionLabel(credential: StoredCredentialSummary) {
  const user = credential.username?.trim() || "-";
  const host = credential.host?.trim() || credential.detail || credential.ownerId;
  const suffix = credential.label.match(/\s(#[0-9]+)$/)?.[1] ?? "";
  return `${user} @ ${host}${suffix ? ` ${suffix}` : ""}`;
}
