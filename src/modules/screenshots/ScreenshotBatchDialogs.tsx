import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Actions,
  Btn,
  DialogShell,
  Field,
  GRow,
  Group,
  Select,
  Sheet,
  Switch,
  TextInput,
} from "../../app/ui/dialog";
import { invokeCommand, type StoredScreenshot } from "../../lib/tauri";

type BatchDialogProps = {
  screenshots: StoredScreenshot[];
  onComplete: (created: StoredScreenshot[]) => void;
  onError: (error: unknown) => void;
  onClose: () => void;
};

export function ResizeScreenshotsDialog({
  screenshots,
  onComplete,
  onError,
  onClose,
}: BatchDialogProps) {
  const { t } = useTranslation();
  const [width, setWidth] = useState(String(screenshots[0]?.width ?? 1920));
  const [height, setHeight] = useState(String(screenshots[0]?.height ?? 1080));
  const [preserveAspectRatio, setPreserveAspectRatio] = useState(true);
  const [busy, setBusy] = useState(false);
  const parsedWidth = Number(width);
  const parsedHeight = Number(height);
  const valid = Number.isInteger(parsedWidth)
    && Number.isInteger(parsedHeight)
    && parsedWidth >= 1
    && parsedWidth <= 16_384
    && parsedHeight >= 1
    && parsedHeight <= 16_384;

  async function submit() {
    if (!valid || busy) {
      return;
    }
    setBusy(true);
    try {
      const created = await invokeCommand("resize_screenshots", {
        request: {
          ids: screenshots.map((screenshot) => screenshot.id),
          width: parsedWidth,
          height: parsedHeight,
          preserveAspectRatio,
        },
      });
      onComplete(created);
    } catch (error) {
      setBusy(false);
      onError(error);
    }
  }

  return (
    <DialogShell onBackdrop={busy ? undefined : onClose}>
      <Sheet
        width={440}
        title={t("screenshots.batch.resize", { count: screenshots.length })}
        ariaLabel={t("screenshots.batch.resize", { count: screenshots.length })}
        footer={
          <Actions
            cancel={<Btn disabled={busy} onClick={onClose}>{t("common.cancel")}</Btn>}
            primary={
              <Btn kind="primary" icon="check" disabled={!valid || busy} onClick={() => void submit()}>
                {t("screenshots.batch.resize", { count: screenshots.length })}
              </Btn>
            }
          />
        }
      >
        <div className="screenshots-batch-fields">
          <div className="screenshots-batch-dimensions">
            <Field label={t("screenshots.resize.width")}>
              <TextInput
                mono
                type="number"
                min={1}
                max={16384}
                value={width}
                onChange={(event) => setWidth(event.currentTarget.value)}
              />
            </Field>
            <Field label={t("screenshots.resize.height")}>
              <TextInput
                mono
                type="number"
                min={1}
                max={16384}
                value={height}
                onChange={(event) => setHeight(event.currentTarget.value)}
              />
            </Field>
          </div>
          <Group>
            <GRow
              label={t("screenshots.resize.preserveAspect")}
              control={
                <Switch
                  on={preserveAspectRatio}
                  onChange={setPreserveAspectRatio}
                  ariaLabel={t("screenshots.resize.preserveAspect")}
                />
              }
            />
          </Group>
          <p className="screenshots-batch-hint">
            {t("screenshots.resize.hint")}
          </p>
        </div>
      </Sheet>
    </DialogShell>
  );
}

export function ConvertScreenshotsDialog({
  screenshots,
  onComplete,
  onError,
  onClose,
}: BatchDialogProps) {
  const { t } = useTranslation();
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [quality, setQuality] = useState(90);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      const created = await invokeCommand("convert_screenshots", {
        request: {
          ids: screenshots.map((screenshot) => screenshot.id),
          format,
          quality,
        },
      });
      onComplete(created);
    } catch (error) {
      setBusy(false);
      onError(error);
    }
  }

  return (
    <DialogShell onBackdrop={busy ? undefined : onClose}>
      <Sheet
        width={440}
        title={t("screenshots.batch.convert", { count: screenshots.length })}
        ariaLabel={t("screenshots.batch.convert", { count: screenshots.length })}
        footer={
          <Actions
            cancel={<Btn disabled={busy} onClick={onClose}>{t("common.cancel")}</Btn>}
            primary={
              <Btn kind="primary" icon="check" disabled={busy} onClick={() => void submit()}>
                {t("screenshots.batch.convert", { count: screenshots.length })}
              </Btn>
            }
          />
        }
      >
        <div className="screenshots-batch-fields">
          <Field label={t("screenshots.convert.format")}>
            <Select
              value={format}
              onChange={(event) => setFormat(event.currentTarget.value as "png" | "jpeg")}
              options={[
                { value: "png", label: "PNG" },
                { value: "jpeg", label: "JPEG" },
              ]}
            />
          </Field>
          <Field
            label={t("screenshots.convert.quality", { value: quality })}
            hint={format === "png" ? t("screenshots.convert.pngLossless") : undefined}
          >
            <input
              className="screenshots-quality-range"
              type="range"
              min={1}
              max={100}
              value={quality}
              onChange={(event) => setQuality(Number(event.currentTarget.value))}
            />
          </Field>
          <p className="screenshots-batch-hint">
            {t("screenshots.convert.hint")}
          </p>
        </div>
      </Sheet>
    </DialogShell>
  );
}
