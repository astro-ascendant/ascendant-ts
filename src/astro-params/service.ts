import { Config, Context, Effect, Layer } from "effect";

import { Ayanamsa, HouseSystem, type Options } from "./model.js";

class Service extends Context.Service<
  Service,
  {
    readonly ayanamsa: Ayanamsa;
    readonly houseSystem: HouseSystem;
  }
>()("astro-ascendant/astro-params/service") {}

export function layer(options: Options) {
  return Layer.sync(Service, () => Service.of(options));
}

export function layerConfig(config: Config.Wrap<Options>) {
  return Layer.effect(Service, Config.unwrap(config).pipe(Effect.map((o) => Service.of(o))));
}

const defaultLayer = layer({
  ayanamsa: "KrishnamurtiVP291",
  houseSystem: "Placidus",
});

export { Service as AstroParams, defaultLayer as DefaultAstroParams };
