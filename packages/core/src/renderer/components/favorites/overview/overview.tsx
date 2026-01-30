/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./overview.scss";

import React from "react";
import { SiblingsInTabLayout } from "../../layout/siblings-in-tab-layout";

export class FavoritesOverview extends React.Component {
  render() {
    return (
      <SiblingsInTabLayout>
        <div className="FavoritesOverview">
          <div className="favorites-overview-placeholder">
            <h1>Favorites Dashboard</h1>
            <p>Coming soon: Your pinned resources will appear here.</p>
          </div>
        </div>
      </SiblingsInTabLayout>
    );
  }
}
