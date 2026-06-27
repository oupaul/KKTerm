import { ConfirmSheet, Btn } from "kkterm";

const noop = () => {};

export const Danger = () => (
  <ConfirmSheet
    tone="danger"
    title="Delete “Production DB”?"
    message="This permanently removes the connection and its saved credentials. This can’t be undone."
    confirmLabel="Delete"
    cancelLabel="Cancel"
    onConfirm={noop}
    onCancel={noop}
  />
);

export const Info = () => (
  <ConfirmSheet
    tone="info"
    title="Run command on 3 hosts?"
    message="“sudo systemctl restart nginx” will run on every selected host."
    confirmLabel="Run"
    cancelLabel="Cancel"
    onConfirm={noop}
    onCancel={noop}
  />
);

export const Warn = () => (
  <ConfirmSheet
    tone="warn"
    title="Unsaved changes"
    message="You have unsaved changes to this profile. Save before closing?"
    confirmLabel="Save"
    cancelLabel="Cancel"
    extraLeft={<Btn onClick={noop}>Don’t Save</Btn>}
    onConfirm={noop}
    onCancel={noop}
  />
);
