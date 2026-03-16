import { spfi, SPFI, SPFx } from '@pnp/sp';
import { LogLevel, PnPLogging } from '@pnp/logging';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';

let _sp: SPFI | undefined;
let _rootSp: SPFI | undefined;

export function getSP(context?: unknown): SPFI {
  if (context !== undefined && context !== null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _sp = spfi().using(SPFx(context as any)).using(PnPLogging(LogLevel.Warning));
  }

  if (!_sp) {
    throw new Error('PnPjs has not been initialized. Call getSP(context) first.');
  }

  return _sp;
}

export function getRootSP(context?: unknown, rootWebUrl?: string): SPFI {
  if (context !== undefined && context !== null && rootWebUrl) {
    _rootSp = spfi(rootWebUrl)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .using(SPFx(context as any))
      .using(PnPLogging(LogLevel.Warning));
  }

  if (!_rootSp) {
    return getSP();
  }

  return _rootSp;
}
