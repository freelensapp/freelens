/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { isObject } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import { reduce } from "es-toolkit/compat";
import * as verkit from "verkit";
import getBasenameOfPathInjectable from "../../../common/path/get-basename.injectable";
import extensionInstallationStateStoreInjectable from "../../../extensions/extension-installation-state-store/extension-installation-state-store.injectable";
import downloadBinaryViaChannelInjectable from "../../../renderer/fetch/download-binary-via-channel.injectable";
import downloadJsonViaChannelInjectable from "../../../renderer/fetch/download-json-via-channel-copy.injectable";
import confirmInjectable from "../confirm-dialog/confirm.injectable";
import attemptInstallInjectable from "./attempt-install/attempt-install.injectable";
import getBaseRegistryUrlInjectable from "./get-base-registry-url/get-base-registry-url.injectable";
import { getTarballDownloadUrl } from "./get-tarball-download-url";

import type { PackageJson } from "@freelensapp/type-fest";
import type { ExtendableDisposer } from "@freelensapp/utilities";

export interface ExtensionInfo {
  name: string;
  version?: string;
  requireConfirmation?: boolean;
}

// @ts-ignore
interface NpmPackageVersionDescriptor extends PackageJson {
  dist: {
    integrity: string;
    shasum: string;
    tarball: string;
  };
}

interface NpmRegistryPackageDescriptor {
  versions: Partial<Record<string, NpmPackageVersionDescriptor>>;
  "dist-tags"?: Partial<Record<string, string>>;
}

export type AttemptInstallByInfo = (info: ExtensionInfo) => Promise<void>;

const isValidUrl = (value: string) => {
  try {
    return Boolean(new URL(value));
  } catch {
    return false;
  }
};

const attemptInstallByInfoInjectable = getInjectable({
  id: "attempt-install-by-info",
  instantiate: (di): AttemptInstallByInfo => {
    const attemptInstall = di.inject(attemptInstallInjectable);
    const getBaseRegistryUrl = di.inject(getBaseRegistryUrlInjectable);
    const extensionInstallationStateStore = di.inject(extensionInstallationStateStoreInjectable);
    const confirm = di.inject(confirmInjectable);
    const getBasenameOfPath = di.inject(getBasenameOfPathInjectable);
    const downloadJson = di.inject(downloadJsonViaChannelInjectable);
    const downloadBinary = di.inject(downloadBinaryViaChannelInjectable);
    const showErrorNotification = di.inject(showErrorNotificationInjectable);
    const logger = di.inject(loggerInjectionToken);

    const installByInfo = async (info: ExtensionInfo, baseUrl: string, disposer: ExtendableDisposer): Promise<void> => {
      const { name, version: versionOrTagName, requireConfirmation = false } = info;
      const registryUrl = new URL(baseUrl);
      // keep the path of a registry served under a prefix, such as Artifactory's /artifactory/api/npm/<repo>/
      // a scoped name is escaped the way npm does it: @scope%2fname
      registryUrl.pathname = registryUrl.pathname.replace(/\/?$/, "/") + name.replace("/", "%2f");
      let json: NpmRegistryPackageDescriptor;

      try {
        const result = await downloadJson(registryUrl.href, { timeout: 15_000 });

        if (!result.callWasSuccessful) {
          showErrorNotification(`Failed to get registry information for extension: ${result.error}`);

          return disposer();
        }

        if (!isObject(result.response) || Array.isArray(result.response)) {
          showErrorNotification("Failed to get registry information for extension");

          return disposer();
        }

        if (result.response.error || !isObject(result.response.versions)) {
          const message = result.response.error || "Incorrect response from registry";

          showErrorNotification(`Failed to get registry information for extension: ${message}`);

          return disposer();
        }

        json = result.response as unknown as NpmRegistryPackageDescriptor;
      } catch (error) {
        if (error instanceof SyntaxError) {
          // assume invalid JSON
          logger.warn("Set registry has invalid json", { url: baseUrl }, error);
          showErrorNotification(
            "Failed to get valid registry information for extension. Registry did not return valid JSON",
          );
        } else {
          logger.error("Failed to download registry information", error);
          showErrorNotification(`Failed to get valid registry information for extension. ${error}`);
        }

        return disposer();
      }

      let version = versionOrTagName;

      if (versionOrTagName) {
        validDistTagName: if (!json.versions[versionOrTagName]) {
          if (json["dist-tags"]) {
            const potentialVersion = json["dist-tags"][versionOrTagName];

            if (potentialVersion) {
              if (!json.versions[potentialVersion]) {
                showErrorNotification(
                  <p>
                    Configured registry claims to have tag <code>{versionOrTagName}</code>. But does not have version
                    infomation for the reference.
                  </p>,
                );

                return disposer();
              }

              version = potentialVersion;
              break validDistTagName;
            }
          }

          showErrorNotification(
            <p>
              {"The "}
              <em>{name}</em>
              {" extension does not have a version or tag "}
              <code>{versionOrTagName}</code>.
            </p>,
          );

          return disposer();
        }
      } else {
        const versions = Object.keys(json.versions)
          .map((version) => verkit.parse(version, { loose: true }))
          // ignore pre-releases for auto picking the version
          .filter((version) => !version.prerelease?.length);

        const latestVersion = reduce(versions, (prev, curr) => (verkit.compareMain(prev, curr) === -1 ? curr : prev));

        version = (latestVersion && verkit.normalize(latestVersion)) ?? undefined;
      }

      if (!version) {
        logger.error("No versions supplied for extension", { name });
        showErrorNotification(`No versions found for ${name}`);

        return disposer();
      }

      const versionInfo = json.versions[version];
      const tarballUrl = versionInfo?.dist.tarball;

      if (!tarballUrl) {
        showErrorNotification("Configured registry has invalid data model. Please verify that it is like NPM's.");
        logger.warn(
          `[ATTEMPT-INSTALL-BY-INFO]: registry returned unexpected data, final version is ${version} but the versions object is missing .dist.tarball as a string`,
          versionInfo,
        );

        return disposer();
      }

      if (requireConfirmation) {
        const proceed = await confirm({
          message: (
            <p>
              {"Are you sure you want to install "}
              <b>{`${name}@${version}`}</b>?
            </p>
          ),
          labelCancel: "Cancel",
          labelOk: "Install",
        });

        if (!proceed) {
          return disposer();
        }
      }

      const fileName = getBasenameOfPath(tarballUrl);
      // a registry that lists the tarball of the default one is asked for it instead
      const downloadUrl = getTarballDownloadUrl(tarballUrl, baseUrl);

      if (downloadUrl !== tarballUrl) {
        logger.info(
          `[ATTEMPT-INSTALL-BY-INFO]: downloading ${tarballUrl} from the configured registry: ${downloadUrl}`,
        );
      }

      const request = await downloadBinary(downloadUrl, { timeout: 30_000 });

      if (!request.callWasSuccessful) {
        showErrorNotification(`Failed to download extension from ${downloadUrl}: ${request.error}`);

        return disposer();
      }

      const integrity = versionInfo?.dist.integrity;

      if (!integrity) {
        logger.warn(`[ATTEMPT-INSTALL-BY-INFO]: registry has no integrity for ${name}@${version}`);
      }

      return attemptInstall(
        {
          fileName,
          data: request.response,
          // The concrete version, not the tag that was asked for: a later tag
          // move must not change what counts as installed.
          source: { kind: "registry", name, version },
          checksum: integrity ? { kind: "integrity", value: integrity } : undefined,
        },
        disposer,
      );
    };

    return async (info) => {
      const baseUrl = await getBaseRegistryUrl();

      // Checked before the pre-install phase starts, so that the notification can say what to fix.
      if (!isValidUrl(baseUrl)) {
        showErrorNotification(
          'The URL of the custom extension registry is not valid. Set it in the App preferences, under "Extension Install Registry".',
        );

        return;
      }

      const disposer = extensionInstallationStateStore.startPreInstall();

      try {
        await installByInfo(info, baseUrl, disposer);
      } catch (error) {
        // Nothing else ends the phase on a throw, and the install form would stay disabled until a restart. Ending
        // it again after `attemptInstall` has taken it over does no harm.
        disposer();

        throw error;
      }
    };
  },
});

export default attemptInstallByInfoInjectable;
