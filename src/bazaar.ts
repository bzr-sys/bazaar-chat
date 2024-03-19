import {
  CollectionAPI,
  BazaarApp,
  type Doc,
  type FilterObject,
  type BazaarOptions,
} from "@bzr/bazaar";

const baseURL = window.location.origin + window.location.pathname;

console.log("app id", import.meta.env.VITE_APP_ID);

const config: BazaarOptions = {
  appId: import.meta.env.VITE_APP_ID,
  loginRedirectUri: `${baseURL}`,
  onApiConnectError: async function (bzr: BazaarApp, message: string) {
    console.log("OnConnectError", message);
    bzr.logOut();
  },
  onLoginError: async function (bzr: BazaarApp, message: string) {
    console.log("OnLoginError:", message);
  },
};

if (import.meta.env.DEV) {
  config.bazaarUri = "http://localhost:3377";
}

export const bzr = new BazaarApp(config);

export type MirrorOptions<T extends Doc> = {
  onAdd?: (doc: T) => Promise<void>;
  onChange?: (oldDoc: T, newDoc: T) => Promise<void>;
  onDelete?: (doc: T) => Promise<void>;
};

export async function mirrorAll<T extends Doc>(
  filter: FilterObject,
  collection: CollectionAPI<T>,
  data: T[],
  mirrorOptions: MirrorOptions<T> = {}
) {
  const docs = await collection.getAll(filter);
  if (mirrorOptions.onAdd) {
    for (const doc of docs) {
      mirrorOptions
        .onAdd(doc)
        .catch((err) => console.log("failed onAdd:", err));
    }
  }

  data.push(...docs);
  return await collection.subscribeAll(filter, (changes) => {
    if (!changes.oldDoc) {
      // New doc
      data.push(changes.newDoc!);
      if (mirrorOptions.onAdd) {
        mirrorOptions
          .onAdd(changes.newDoc!)
          .catch((err) => console.log("failed onAdd:", err));
      }
      return;
    }
    const idx = data.findIndex((doc) => doc.id === changes.oldDoc!.id);

    if (!changes.newDoc) {
      // Deleted doc
      if (idx > -1) {
        data.splice(idx, 1);
      }
      if (mirrorOptions.onDelete) {
        mirrorOptions
          .onDelete(changes.oldDoc!)
          .catch((err) => console.log("failed onDelete:", err));
      }
      return;
    }
    // Changed doc
    if (idx > -1) {
      data[idx] = changes.newDoc!;
    } else {
      // It is missing for some reason, add it.
      data.push(changes.newDoc!);
    }
    if (mirrorOptions.onChange) {
      mirrorOptions
        .onChange(changes.oldDoc!, changes.newDoc!)
        .catch((err) => console.log("failed onChange:", err));
    }
    return;
  });
}
