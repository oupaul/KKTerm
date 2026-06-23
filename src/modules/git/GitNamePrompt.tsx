// Small app-owned text-input dialog for git names (new branch / tag / merge
// ref), built from the shared dialog primitives. Replaces window.prompt, which
// is forbidden by the design language.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Actions, Btn, DialogShell, Field, Sheet, TextInput } from "../../app/ui/dialog";

export function GitNamePrompt({
  title,
  label,
  placeholder,
  confirmLabel,
  initialValue = "",
  onConfirm,
  onCancel,
}: {
  title: string;
  label: string;
  placeholder?: string;
  confirmLabel: string;
  initialValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);
  const trimmed = value.trim();
  return (
    <DialogShell onBackdrop={onCancel}>
      <Sheet
        width={420}
        ariaLabel={title}
        footer={
          <Actions
            cancel={<Btn onClick={onCancel}>{t("common.cancel")}</Btn>}
            primary={
              <Btn kind="primary" disabled={trimmed.length === 0} onClick={() => onConfirm(trimmed)}>
                {confirmLabel}
              </Btn>
            }
          />
        }
      >
        <div className="kk-ct">
          <h2>{title}</h2>
          <Field label={label}>
            <TextInput
              autoFocus
              value={value}
              placeholder={placeholder}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && trimmed.length > 0) {
                  onConfirm(trimmed);
                }
              }}
            />
          </Field>
        </div>
      </Sheet>
    </DialogShell>
  );
}
