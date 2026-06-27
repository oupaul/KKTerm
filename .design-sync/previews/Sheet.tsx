import { Sheet, Field, TextInput, Select, Switch, Actions, Btn, Group, GRow } from "kkterm";

const noop = () => {};

export const ConnectionForm = () => (
  <Sheet
    width={440}
    eyebrow="SSH"
    title="New Connection"
    sub="Connect to a remote host over SSH"
    footer={
      <Actions
        cancel={<Btn>Cancel</Btn>}
        primary={
          <Btn kind="primary" icon="check">
            Connect
          </Btn>
        }
      />
    }
  >
    <Field label="Name">
      <TextInput defaultValue="Production DB" />
    </Field>
    <Field label="Host">
      <TextInput defaultValue="db.example.com" mono />
    </Field>
    <div style={{ display: "flex", gap: 10 }}>
      <Field label="Port" style={{ flex: "0 0 100px" }}>
        <TextInput defaultValue="22" mono />
      </Field>
      <Field label="Authentication" style={{ flex: 1 }}>
        <Select
          options={[
            { value: "key", label: "SSH Key" },
            { value: "password", label: "Password" },
          ]}
          defaultValue="key"
        />
      </Field>
    </div>
  </Sheet>
);

export const SettingsGroup = () => (
  <Sheet
    width={440}
    title="Terminal"
    sub="Appearance and behavior"
    footer={
      <Actions cancel={<Btn>Cancel</Btn>} primary={<Btn kind="primary">Save</Btn>} />
    }
  >
    <Group title="General">
      <GRow
        icon="bolt"
        label="Cursor blink"
        desc="Blink the block cursor while idle"
        control={<Switch on onChange={noop} />}
      />
      <GRow
        icon="terminal"
        label="Font ligatures"
        desc="Render programming ligatures"
        control={<Switch onChange={noop} />}
      />
    </Group>
  </Sheet>
);
