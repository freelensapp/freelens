import { Icon } from "@freelensapp/icon";
import { withInjectables } from "@ogre-tools/injectable-react";
import React, { Fragment } from "react";
import openLinkInBrowserInjectable from "../../../../../common/utils/open-link-in-browser.injectable";
import { authorKey, fullNameOf, initialsOf, isGithubUrl } from "./extension-author-helpers";
import styles from "./extension-authors.module.scss";
import { ExtensionCollaboratorsPopover } from "./extension-collaborators-popover/extension-collaborators-popover";
import { GithubIcon } from "./github-icon/github-icon";
import { useAuthorItem } from "./use-author-item.hook";
import { useExtensionAuthors } from "./use-extension-authors.hook";

import type { OpenLinkInBrowser } from "../../../../../common/utils/open-link-in-browser.injectable";
import type { MarketplaceExtensionAuthor } from "../../marketplace-extensions/marketplace-extensions.injectable";

export interface ExtensionAuthorsProps {
  authors: MarketplaceExtensionAuthor[];
  disabled?: boolean;
}

interface Dependencies {
  openLinkInBrowser: OpenLinkInBrowser;
}

const hasLinks = (author: MarketplaceExtensionAuthor): boolean => Boolean(author.url);

const AuthorLinksTooltip: React.FC<{ author: MarketplaceExtensionAuthor; openLinkInBrowser: OpenLinkInBrowser }> = ({
  author,
  openLinkInBrowser,
}) => {
  const { url } = author;

  if (!url) return null;

  return (
    <div className={styles.authorTooltip} data-testid="author-links-tooltip">
      <button type="button" className={styles.tooltipRow} onClick={() => void openLinkInBrowser(url)}>
        {isGithubUrl(url) ? (
          <>
            <GithubIcon className={styles.tooltipIcon} />
            <span>github</span>
          </>
        ) : (
          <>
            <Icon material="language" className={styles.tooltipIcon} />
            <span>website</span>
          </>
        )}
      </button>
    </div>
  );
};

const AuthorItem: React.FC<{
  author: MarketplaceExtensionAuthor;
  disabled?: boolean;
  openLinkInBrowser: OpenLinkInBrowser;
}> = ({ author, disabled, openLinkInBrowser }) => {
  const { isHovered, handleMouseEnter, handleMouseLeave } = useAuthorItem({
    author,
    disabled,
    hasLinks: hasLinks(author),
  });

  return (
    <span
      className={styles.authorItem}
      data-testid="author-item"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className={styles.avatar}>{initialsOf(author)}</span>
      <span className={styles.authorName}>{fullNameOf(author)}</span>
      {isHovered && <AuthorLinksTooltip author={author} openLinkInBrowser={openLinkInBrowser} />}
    </span>
  );
};

const NonInjectedExtensionAuthors = ({
  authors,
  disabled,
  openLinkInBrowser,
}: ExtensionAuthorsProps & Dependencies) => {
  const { isPopoverOpen, handleDismiss, handleToggle, visible, remaining } = useExtensionAuthors({ authors });

  if (authors.length === 0) return null;

  return (
    <div className={styles.row}>
      <span className={styles.prefix}>by</span>
      {visible.map((a, index) => (
        <Fragment key={authorKey(a)}>
          <AuthorItem author={a} disabled={disabled} openLinkInBrowser={openLinkInBrowser} />
          {(index < visible.length - 1 || remaining > 0) && <span>,</span>}
        </Fragment>
      ))}
      {remaining > 0 && (
        <span className={styles.triggerWrapper}>
          <button
            type="button"
            className={`${styles.trigger} ${isPopoverOpen ? styles.open : ""}`}
            onClick={handleToggle}
            onMouseDown={(event) => event.stopPropagation()}
            aria-haspopup="dialog"
            aria-expanded={isPopoverOpen}
            data-testid="collaborators-trigger"
          >
            +{remaining} others
            <Icon material="expand_more" className={styles.chevron} />
          </button>
          {isPopoverOpen && (
            <ExtensionCollaboratorsPopover authors={authors} onDismiss={handleDismiss} disabled={disabled} />
          )}
        </span>
      )}
    </div>
  );
};

export const ExtensionAuthors = withInjectables<Dependencies, ExtensionAuthorsProps>(NonInjectedExtensionAuthors, {
  getProps: (di, props) => ({
    ...props,
    openLinkInBrowser: di.inject(openLinkInBrowserInjectable),
  }),
});
