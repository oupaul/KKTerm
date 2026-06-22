const VERSION_TAG = /^v(\d+\.\d+\.\d+)$/;

export function versionFromTag(tag) {
  const match = VERSION_TAG.exec(tag ?? "");
  if (!match) throw new Error(`Invalid release tag: ${tag ?? ""}`);
  return match[1];
}

export function recognizedReleaseAssets(release) {
  const version = versionFromTag(release.tag_name);
  const escaped = version.replaceAll(".", "\\.");
  const pattern = new RegExp(
    `^kkterm-${escaped}-(?:windows-(?:x64|arm64)-setup\\.exe(?:\\.sha256)?|macos-universal\\.(?:dmg(?:\\.sha256)?|app\\.tar\\.gz(?:\\.sig)?)|linux-x86_64\\.AppImage(?:\\.(?:sha256|sig))?)$`,
  );
  return (release.assets ?? []).filter((asset) => pattern.test(asset.name ?? ""));
}

function completePair(names, asset, companion) {
  return names.has(asset) && names.has(companion);
}

export function buildReleaseManifest(release, baseUrl) {
  if (release.draft) throw new Error("Draft releases cannot update the stable manifest");
  if (release.prerelease) throw new Error("Prerelease releases cannot update the stable manifest");
  const version = versionFromTag(release.tag_name);
  const assets = recognizedReleaseAssets(release);
  const names = new Set(assets.map((asset) => asset.name));
  const root = baseUrl.replace(/\/$/, "");
  const assetUrl = (name) => `${root}/releases/v${version}/${name}`;
  const platforms = {};

  for (const arch of ["x64", "arm64"]) {
    const installer = `kkterm-${version}-windows-${arch}-setup.exe`;
    const checksum = `${installer}.sha256`;
    if (completePair(names, installer, checksum)) {
      platforms[`windows-${arch}`] = {
        url: assetUrl(installer),
        checksum_url: assetUrl(checksum),
      };
    }
  }

  const macUpdater = `kkterm-${version}-macos-universal.app.tar.gz`;
  const macSignature = `${macUpdater}.sig`;
  if (completePair(names, macUpdater, macSignature)) {
    // The universal bundle serves both architectures from the same asset.
    for (const arch of ["darwin-aarch64", "darwin-x86_64"]) {
      platforms[arch] = {
        url: assetUrl(macUpdater),
        signature_asset: macSignature,
      };
    }
  }

  const linuxUpdater = `kkterm-${version}-linux-x86_64.AppImage`;
  const linuxSignature = `${linuxUpdater}.sig`;
  if (completePair(names, linuxUpdater, linuxSignature)) {
    platforms["linux-x86_64"] = {
      url: assetUrl(linuxUpdater),
      signature_asset: linuxSignature,
    };
  }

  return {
    version,
    notes: (release.body ?? "").trim(),
    pub_date: release.published_at,
    release_url: release.html_url,
    platforms,
  };
}
