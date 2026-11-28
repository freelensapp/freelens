/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import openLinkInBrowserInjectable from "../../../../../common/utils/open-link-in-browser.injectable";
import { CopyToClipboardIcon } from "../../../copy-to-clipboard/copy-to-clipboard-icon";
import { MarkdownViewer } from "../../../markdown-viewer";
import styles from "./extension-details.module.scss";

import type { OpenLinkInBrowser } from "../../../../../common/utils/open-link-in-browser.injectable";
import type { ExtensionCardDetails } from "../use-extension-card.hook";

export interface ExtensionDetailsProps {
  details: ExtensionCardDetails;
}

interface Dependencies {
  openLinkInBrowser: OpenLinkInBrowser;
}

const NonInjectedExtensionDetails = ({
  details: { source, markdown, text, homepage, repository, versions },
  openLinkInBrowser,
}: ExtensionDetailsProps & Dependencies) => {
  const link = (url: string, testId: string) => (
    <button type="button" className={styles.link} onClick={() => void openLinkInBrowser(url)} data-testid={testId}>
      {url}
    </button>
  );

  return (
    <div className={styles.details} data-testid="extension-details">
      {markdown && <MarkdownViewer markdown={markdown} className={styles.description} />}
      {text && <p className={styles.description}>{text}</p>}
      {/* Not an <hr>: the settings page gives every <hr> in it margins of its own. */}
      {(markdown || text) && <div role="separator" className={styles.separator} />}
      <dl className={styles.fields}>
        {source && (
          <>
            <dt>{source.label}</dt>
            <dd className={styles.sourceRow}>
              <span className={styles.source} data-testid="extension-source">
                {source.value}
              </span>
              <CopyToClipboardIcon
                getText={() => source.value}
                className={styles.copy}
                data-testid="extension-source-copy"
              />
            </dd>
          </>
        )}
        {homepage && (
          <>
            <dt>Homepage</dt>
            <dd>{link(homepage, "extension-homepage")}</dd>
          </>
        )}
        {repository && (
          <>
            <dt>Repository</dt>
            <dd>{link(repository, "extension-repository")}</dd>
          </>
        )}
        {versions.length > 0 && (
          <>
            <dt>Freelens</dt>
            <dd>
              <ul className={styles.versions}>
                {versions.map(({ version, freelens, source }) => (
                  <li key={source} data-testid={`extension-freelens-${source}`}>
                    <span className={styles.range}>{freelens}</span>
                    {` for v${version} ${source === "installed" ? "installed" : "in the marketplace"}`}
                  </li>
                ))}
              </ul>
            </dd>
          </>
        )}
      </dl>
    </div>
  );
};

export const ExtensionDetails = withInjectables<Dependencies, ExtensionDetailsProps>(NonInjectedExtensionDetails, {
  getProps: (di, props) => ({
    ...props,
    openLinkInBrowser: di.inject(openLinkInBrowserInjectable),
  }),
});
