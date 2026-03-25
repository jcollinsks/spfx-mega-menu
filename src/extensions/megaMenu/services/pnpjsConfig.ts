import { spfi, SPFI, SPFx } from '@pnp/sp';
import { LogLevel, PnPLogging } from '@pnp/logging';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';

let _sp: SPFI | undefined;
let _rootSp: SPFI | undefined;

/**
 * CQ-02: Centralizes the unavoidable `any` cast required by PnPjs's SPFx integration
 * into a single location, rather than spreading it across multiple call sites.
 * The SPFx context type from @microsoft/sp-application-base does not exactly match
 * PnPjs's expected type, requiring this cast.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createSPFI(context: unknown, baseUrl?: string): SPFI {
  const base = baseUrl ? spfi(baseUrl) : spfi();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return base.using(SPFx(context as any)).using(PnPLogging(LogLevel.Warning));
}

export function getSP(context?: unknown): SPFI {
  if (context !== undefined && context !== null) {
    _sp = createSPFI(context);
  }

  if (!_sp) {
    throw new Error('PnPjs has not been initialized. Call getSP(context) first.');
  }

  return _sp;
}

export function getRootSP(context?: unknown, rootWebUrl?: string): SPFI {
  if (context !== undefined && context !== null && rootWebUrl) {
    _rootSp = createSPFI(context, rootWebUrl);
  }

  if (!_rootSp) {
    return getSP();
  }

  return _rootSp;
}
