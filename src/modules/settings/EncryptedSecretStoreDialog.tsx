import { useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  Actions,
  Btn,
  DialogShell,
  Field,
  Segmented,
  Sheet,
  TextInput,
} from "../../app/ui/dialog";

type SetupMode = "unlock" | "create";

export function EncryptedSecretStoreDialog({
  busy,
  error,
  launchPrompt,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  error: string | null;
  launchPrompt: boolean;
  onCancel: () => void;
  onSubmit: (request: { password: string; createIfMissing: boolean }) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<SetupMode>(launchPrompt ? "create" : "unlock");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const createIfMissing = mode === "create";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      setValidationError(t("settings.encryptedSecretStorePasswordRequired"));
      return;
    }
    if (createIfMissing && password !== confirmPassword) {
      setValidationError(t("settings.encryptedSecretStorePasswordMismatch"));
      return;
    }
    setValidationError(null);
    await onSubmit({ password: trimmedPassword, createIfMissing });
  }

  return (
    <DialogShell>
      <Sheet
        title={
          launchPrompt
            ? t("settings.encryptedSecretStoreSetupRequiredTitle")
            : t("settings.encryptedSecretStoreSetupTitle")
        }
        width={460}
        footer={
          <Actions
            primary={
              <Btn
                disabled={busy}
                kind="primary"
                onClick={() => formRef.current?.requestSubmit()}
              >
                {createIfMissing
                  ? t("settings.encryptedSecretStoreCreateAction")
                  : t("settings.encryptedSecretStoreUnlockAction")}
              </Btn>
            }
            cancel={
              <Btn disabled={busy} onClick={onCancel}>
                {launchPrompt
                  ? t("settings.encryptedSecretStoreLater")
                  : t("common.cancel")}
              </Btn>
            }
          />
        }
      >
        <form ref={formRef} onSubmit={(event) => void handleSubmit(event)}>
          <p className="field-hint">{t("settings.encryptedSecretStoreSetupBody")}</p>
          <Field label={t("settings.encryptedSecretStoreSetupMode")}>
            <Segmented
              value={mode}
              options={[
                { value: "unlock", label: t("settings.encryptedSecretStoreUnlock") },
                { value: "create", label: t("settings.encryptedSecretStoreCreate") },
              ]}
              onChange={(value) => {
                setMode(value === "create" ? "create" : "unlock");
                setValidationError(null);
              }}
            />
          </Field>
          <Field label={t("settings.encryptedSecretStorePassword")} req>
            <TextInput
              autoFocus
              autoComplete="current-password"
              disabled={busy}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
            />
          </Field>
          {createIfMissing ? (
            <Field label={t("settings.encryptedSecretStoreConfirmPassword")} req>
              <TextInput
                autoComplete="new-password"
                disabled={busy}
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.currentTarget.value)}
              />
            </Field>
          ) : null}
          {validationError || error ? (
            <p className="field-hint settings-dialog-error" role="alert">
              {validationError ?? error}
            </p>
          ) : null}
        </form>
      </Sheet>
    </DialogShell>
  );
}
