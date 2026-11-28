import { withInjectables } from "@ogre-tools/injectable-react";
import openLinkInBrowserInjectable from "../../../../../common/utils/open-link-in-browser.injectable";
import styles from "./extension-package-title.module.scss";
import { useExtensionPackageTitle } from "./use-extension-package-title.hook";

import type { OpenLinkInBrowser } from "../../../../../common/utils/open-link-in-browser.injectable";

export interface ExtensionPackageTitleProps {
  /**
   * The name of the package.
   */
  name: string;
  /**
   * Shown instead of the name of the package, which is then its tooltip.
   */
  displayName?: string;
  link?: string;
}

interface Dependencies {
  openLinkInBrowser: OpenLinkInBrowser;
}

const NonInjectedExtensionPackageTitle = ({
  name,
  displayName,
  link,
  openLinkInBrowser,
}: ExtensionPackageTitleProps & Dependencies) => {
  const { scope, pkgName } = useExtensionPackageTitle({ name });
  const label = displayName ?? pkgName;

  return (
    <h3 className={styles.title} title={displayName ? name : undefined}>
      {!displayName && scope && <span className={styles.scope}>{scope}</span>}
      {link ? (
        <button
          type="button"
          className={styles.link}
          onClick={() => void openLinkInBrowser(link)}
          data-testid="extension-package-title-link"
        >
          {label}
        </button>
      ) : (
        <span className={styles.pkgName}>{label}</span>
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
