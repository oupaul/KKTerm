import { LockKeyhole, Upload } from "../lib/reicon";
import { useTranslation } from "react-i18next";
import { Actions, Btn, DialogShell, Field, Sheet, TextInput } from "./ui/dialog";

export function PortableOnboardingDialog({
  dataDir,
  onImport,
  onLater,
  onSetupEncryptedStorage,
}: {
  dataDir: string;
  onImport: () => void;
  onLater: () => void;
  onSetupEncryptedStorage: () => void;
}) {
  const { t } = useTranslation();

  return (
    <DialogShell>
      <Sheet
        title={t("settings.portableOnboardingTitle")}
        width={500}
        footer={
          <Actions
            extraLeft={
              <Btn onClick={onImport}>
                <Upload size={15} />
                {t("settings.portableOnboardingImport")}
              </Btn>
            }
            primary={
              <Btn kind="primary" onClick={onSetupEncryptedStorage}>
                <LockKeyhole size={15} />
                {t("settings.portableOnboardingSetup")}
              </Btn>
            }
            cancel={<Btn onClick={onLater}>{t("settings.encryptedSecretStoreLater")}</Btn>}
          />
        }
      >
        <p className="field-hint">{t("settings.portableOnboardingBody")}</p>
        <Field label={t("settings.portableDataFolder")}>
          <TextInput readOnly value={dataDir} />
        </Field>
        <p className="kk-dlg-warn">{t("settings.portableOnboardingSecurity")}</p>
      </Sheet>
    </DialogShell>
  );
}
