/**
 * The one place forms configures dayjs. The utc and timezone plugins used to
 * be extended at module scope in FormElement and in each CRUD form: four
 * copies of a side effect in a package that declares `"sideEffects": false`.
 *
 * Only the datetime renderer (FormElement) imports this, and it uses the
 * `dayjs` exported here, so a bundler keeps the module (and its extend calls)
 * exactly where dayjs is actually used. `@bcl32/forms/fields` never reaches
 * it. Extending is idempotent, so an app that extends dayjs itself is fine.
 */
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export { dayjs };
