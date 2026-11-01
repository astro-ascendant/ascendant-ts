import { Effect, HashMap, Option } from "effect";

import type { Holder, Role } from "./model.js";
import { ClassicalPlanets, CharaKarakasParseError, Roles } from "./model.js";

export const CLASSICAL_PLANET_ORDER = ClassicalPlanets.literals;
export const ROLE_ORDER = Roles.literals;

export const assignmentAt = Effect.fnUntraced(function* (
  assignments: HashMap.HashMap<Role, readonly [Holder, ...Holder[]]>,
  role: Role,
) {
  const assignment = HashMap.get(assignments, role);
  if (Option.isNone(assignment)) {
    return yield* CharaKarakasParseError.make({ message: `Missing Chara Karaka role ${role}` });
  }
  return assignment.value;
});
