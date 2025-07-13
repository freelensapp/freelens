import React from "react";
import { Link } from "react-router-dom";

type MaybeLinkProps = Omit<React.ComponentProps<typeof Link>, "to"> & {
  to?: React.ComponentProps<typeof Link>["to"];
};

export function MaybeLink(props: MaybeLinkProps): React.ReactElement {
  const { children, to, ...rest } = props;
  if (to) {
    return (
      <Link to={to} {...rest}>
        {children}
      </Link>
    );
  } else {
    return <>{children}</>;
  }
}
