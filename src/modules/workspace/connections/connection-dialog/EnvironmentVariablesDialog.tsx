import { KeyRound, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Actions, Btn, DialogShell, Field, Select, Sheet, TextInput } from "../../../../app/ui/dialog";
import {
  applyEnvironmentBlock,
  createCliAccountVariable,
  parseEnvironmentBlock,
  renderEnvironmentBlock,
  slugCliAccountLabel,
  validateEnvironmentVariables,
  type CliAccountTool,
  type EnvironmentShellFamily,
  type ManagedEnvironmentVariable,
} from "./environmentVariables";

type DraftVariable = ManagedEnvironmentVariable & { id: number };

export function EnvironmentVariablesDialog({
  connectionName,
  shellFamily,
  startupScript,
  onApply,
  onCancel,
}: {
  connectionName: string;
  shellFamily: EnvironmentShellFamily;
  startupScript: string;
  onApply: (script: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const parsed = useMemo(() => parseEnvironmentBlock(startupScript, shellFamily), [shellFamily, startupScript]);
  const [rows, setRows] = useState<DraftVariable[]>(() =>
    (parsed.status === "ok" && parsed.variables.length > 0 ? parsed.variables : [blankVariable()]).map((row, index) => ({
      ...row,
      id: index + 1,
    })),
  );
  const [nextId, setNextId] = useState(rows.length + 1);
  const [errorKey, setErrorKey] = useState("");
  const [cliWizardOpen, setCliWizardOpen] = useState(false);

  function updateRow(id: number, patch: Partial<ManagedEnvironmentVariable>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch, source: "literal" } : row)));
    setErrorKey("");
  }

  function addRow() {
    setRows((current) => [...current, { ...blankVariable(), id: nextId }]);
    setNextId((current) => current + 1);
  }

  function removeRow(id: number) {
    setRows((current) => {
      const remaining = current.filter((row) => row.id !== id);
      return remaining.length > 0 ? remaining : [{ ...blankVariable(), id: nextId }];
    });
    if (rows.length === 1) setNextId((current) => current + 1);
    setErrorKey("");
  }

  function applyRows() {
    const variables = rows
      .filter((row) => row.name.trim() || row.value)
      .map(({ name, value, source }) => ({ name: name.trim(), value, source }));
    const validationError = validateEnvironmentVariables(variables);
    if (validationError) {
      setErrorKey(`connections.environmentVariable${capitalize(validationError)}`);
      return;
    }
    const block = variables.length > 0 ? renderEnvironmentBlock(variables, shellFamily) : "";
    onApply(applyEnvironmentBlock(startupScript, block));
  }

  function applyCliAccount(variable: ManagedEnvironmentVariable) {
    setRows((current) => {
      const matchIndex = current.findIndex((row) => row.name.toLowerCase() === variable.name.toLowerCase());
      if (matchIndex < 0) {
        const withoutBlank = current.filter((row) => row.name.trim() || row.value);
        return [...withoutBlank, { ...variable, id: nextId }];
      }
      return current.map((row, index) => (index === matchIndex ? { ...variable, id: row.id } : row));
    });
    setNextId((current) => current + 1);
    setErrorKey("");
    setCliWizardOpen(false);
  }

  const malformed = parsed.status === "malformed";
  return (
    <>
      <DialogShell onBackdrop={onCancel}>
        <Sheet
          ariaLabel={t("connections.environmentVariables")}
          className="connection-environment-dialog"
          footer={
            <Actions
              extraLeft={
                <Btn onClick={() => setCliWizardOpen(true)}>
                  <KeyRound size={14} aria-hidden />
                  {t("connections.cliAccountHelper")}
                </Btn>
              }
              cancel={<Btn onClick={onCancel}>{t("common.cancel")}</Btn>}
              primary={
                <Btn disabled={malformed} kind="primary" onClick={applyRows}>
                  {t("connections.environmentVariableApply")}
                </Btn>
              }
            />
          }
          title={t("connections.environmentVariables")}
          width={620}
        >
          <p className="kk-dlg-sub connection-environment-guidance">
            {t("connections.environmentVariablesHint")}
          </p>
          <p className="kk-dlg-warn">{t("connections.environmentVariablesNonSecret")}</p>
          {malformed ? (
            <p className="field-error">{t("connections.environmentVariablesMalformed")}</p>
          ) : (
            <div className="connection-environment-list">
              <div className="connection-environment-headings" aria-hidden="true">
                <span>{t("connections.environmentVariableName")}</span>
                <span>{t("connections.environmentVariableValue")}</span>
              </div>
              {rows.map((row) => (
                <div className="connection-environment-row" key={row.id}>
                  <TextInput
                    aria-label={t("connections.environmentVariableName")}
                    mono
                    onChange={(event) => updateRow(row.id, { name: event.currentTarget.value })}
                    placeholder="EXAMPLE_NAME"
                    value={row.name}
                  />
                  <TextInput
                    aria-label={t("connections.environmentVariableValue")}
                    mono
                    onChange={(event) => updateRow(row.id, { value: event.currentTarget.value })}
                    value={row.value}
                  />
                  <button
                    aria-label={t("connections.environmentVariableRemove", { name: row.name || t("connections.environmentVariable") })}
                    className="connection-environment-remove"
                    onClick={() => removeRow(row.id)}
                    type="button"
                  >
                    <Trash2 size={15} aria-hidden />
                  </button>
                </div>
              ))}
              <Btn className="connection-environment-add" kind="ghost" onClick={addRow} sm>
                <Plus size={14} aria-hidden />
                {t("connections.environmentVariableAdd")}
              </Btn>
            </div>
          )}
          {errorKey ? <p className="field-error">{t(errorKey)}</p> : null}
        </Sheet>
      </DialogShell>
      {cliWizardOpen ? (
        <CliAccountWizard
          connectionName={connectionName}
          onApply={applyCliAccount}
          onCancel={() => setCliWizardOpen(false)}
          shellFamily={shellFamily}
        />
      ) : null}
    </>
  );
}

function CliAccountWizard({
  connectionName,
  shellFamily,
  onApply,
  onCancel,
}: {
  connectionName: string;
  shellFamily: EnvironmentShellFamily;
  onApply: (variable: ManagedEnvironmentVariable) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [tool, setTool] = useState<CliAccountTool>("claude-code");
  const [label, setLabel] = useState(connectionName);
  const [error, setError] = useState(false);
  const slug = slugCliAccountLabel(label);
  const preview = slug ? createCliAccountVariable(tool, label, shellFamily).value : "—";

  return (
    <DialogShell onBackdrop={onCancel} zClassName="connection-environment-subdialog">
      <Sheet
        footer={
          <Actions
            cancel={<Btn onClick={onCancel}>{t("common.cancel")}</Btn>}
            primary={
              <Btn
                kind="primary"
                onClick={() => {
                  if (!slug) {
                    setError(true);
                    return;
                  }
                  onApply(createCliAccountVariable(tool, label, shellFamily));
                }}
              >
                {t("connections.cliAccountApply")}
              </Btn>
            }
          />
        }
        title={t("connections.cliAccountHelper")}
        width={480}
      >
        <p className="kk-dlg-sub connection-environment-guidance">{t("connections.cliAccountHint")}</p>
        <div className="connection-cli-account-fields">
          <Field label={t("connections.cliAccountTool")}>
            <Select
              onChange={(event) => setTool(event.currentTarget.value as CliAccountTool)}
              options={[
                { value: "claude-code", label: t("connections.cliAccountClaudeCode") },
                { value: "codex", label: t("connections.cliAccountCodex") },
              ]}
              value={tool}
            />
          </Field>
          <Field label={t("connections.cliAccountLabel")}>
            <TextInput
              onChange={(event) => {
                setLabel(event.currentTarget.value);
                setError(false);
              }}
              placeholder={t("connections.cliAccountLabelPlaceholder")}
              value={label}
            />
          </Field>
        </div>
        <div className="connection-cli-account-path">
          <span>{t("connections.cliAccountDirectory")}</span>
          <code>{preview}</code>
        </div>
        {error ? <p className="field-error">{t("connections.cliAccountInvalidLabel")}</p> : null}
      </Sheet>
    </DialogShell>
  );
}

function blankVariable(): ManagedEnvironmentVariable {
  return { name: "", value: "", source: "literal" };
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
