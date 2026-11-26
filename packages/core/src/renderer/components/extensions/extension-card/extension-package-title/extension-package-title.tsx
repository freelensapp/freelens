import { withInjectables } from "@ogre-tools/injectable-react";
import openLinkInBrowserInjectable from "../../../../../common/utils/open-link-in-browser.injectable";
import styles from "./extension-package-title.module.scss";
import { useExtensionPackageTitle } from "./use-extension-package-title.hook";

import type { OpenLinkInBrowser } from "../../../../../common/utils/open-link-in-browser.injectable";

export interface ExtensionPackageTitleProps {
  name: string;
  repository?: string;
}

interface Dependencies {
  openLinkInBrowser: OpenLinkInBrowser;
}

const NonInjectedExtensionPackageTitle = ({
  name,
  repository,
  openLinkInBrowser,
}: ExtensionPackageTitleProps & Dependencies) => {
  const { scope, pkgName } = useExtensionPackageTitle({ name });

  return (
    <h3 className={styles.title}>
      {scope && <span className={styles.scope}>{scope}</span>}
      {repository ? (
        <button
          type="button"
          className={styles.link}
          onClick={() => void openLinkInBrowser(repository)}
          data-testid="extension-package-title-link"
        >
          {pkgName}
        </button>
      ) : (
        <span className={styles.pkgName}>{pkgName}</span>
      )}
    </h3>
  );
};

export const ExtensionPackageTitle = withInjectables<Dependencies, ExtensionPackageTitleProps>(
  NonInjectedExtensionPackageTitle,
  {
    getProps: (di, props) => ({
      ...props,
      openLinkInBrowser: di.inject(openLinkInBrowserInjectable),
    }),
  },
);
