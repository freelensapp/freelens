import { Common, Renderer } from "@freelensapp/extensions";

export default class ExampleLensExtension extends Renderer.LensExtension {
  protected onActivate(): void | Promise<void> {
    Common.logger.info("Activating bundled extension example");
  }

  protected onDeactivate(): void | Promise<void> {
    Common.logger.info("Deactivating bundled extension example");
  }
}
