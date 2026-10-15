# Bazaar Chat

A one-to-one messaging app, built as a [Bazaar](https://bzr.dev) example app. There is no app backend: each person stores the messages they send in their own Bazaar database and gives the recipient read access through Bazaar permissions.

**Live app: https://bzr-sys.github.io/banter/**

## Features

- Log in with a Bazaar account
- Start a chat with any Bazaar user through the user search popup (**+**), or pick one of your Bazaar contacts
- Send and receive messages in real time
- Chats are sorted by latest message, and new incoming messages are marked as unread

## How it uses Bazaar

| Bazaar feature                   | Used for                                                                                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Collections (`individual_chats`) | Your chat list. Anyone can read only the entry with their own user ID (`filter: { id: "$user" }`), which is how the other person learns a chat exists |
| Collections (`message_<userId>`) | One collection per conversation partner, holding the messages you sent them                                                                           |
| Permissions                      | When a `message_<userId>` collection is created, the recipient gets read access to it                                                                 |
| Granted permissions              | The app watches for new grants to discover incoming chats                                                                                             |
| Contexts                         | Reads the other person's messages from their database                                                                                                 |
| Subscriptions                    | Live updates for chats and messages                                                                                                                   |
| Social API                       | Contacts and the user search popup                                                                                                                    |

A conversation is the two `message_` collections merged by timestamp. The Bazaar setup is in `src/bazaar.ts`, and the chat logic is in `src/stores/individualChats.ts`.

## Tech stack

Vue 3, Vite, Pinia, Tailwind CSS, and the [`@bzr/bazaar`](https://www.npmjs.com/package/@bzr/bazaar) SDK.

## Run locally

You need Node.js 24 or newer (required by the mock server) and pnpm 9 (`npm install -g pnpm@9`, or `corepack enable`).

In development the app talks to a local Bazaar mock server on `http://localhost:3377` instead of the real service (see `src/bazaar.ts`). The mock is installed as a dev dependency ([`@bzr/bazaar-mock`](https://www.npmjs.com/package/@bzr/bazaar-mock)).

```sh
pnpm install

# Terminal 1: start the mock server and register the app's dev URL
pnpm exec bzr -u http://localhost:5173/banter/

# Terminal 2: start the app against the mock app ID "test"
VITE_APP_ID=test pnpm dev
```

Open http://localhost:5173/banter/ and click **Log in with Bazaar**. In the popup:

1. Enter any email address and click **Log In or Sign Up**. There is no password or code.
2. First time only: pick a handle (at least 4 letters or digits) and a name, then click **Complete Setup**.
3. Click **Authorize**.

To chat with yourself, open a second browser profile or a private window and sign up with a different email. Both users use the same mock server.

Notes:

- The mock keeps its data in memory, so restarting it wipes all users and messages.
- The redirect URL has to match exactly. If Vite starts on a port other than 5173, restart the mock with that URL (`pnpm exec bzr -u http://localhost:<port>/banter/`).
- `pnpm exec bzr -h` lists the other mock options (app ID, port, extra redirect URIs).

### Scripts

| Command           | What it does                                     |
| ----------------- | ------------------------------------------------ |
| `pnpm dev`        | Start the Vite dev server with hot reload        |
| `pnpm build`      | Type-check and build for production into `dist/` |
| `pnpm preview`    | Serve the production build locally               |
| `pnpm type-check` | Run `vue-tsc`                                    |
| `pnpm lint`       | Run ESLint (with `--fix`)                        |
| `pnpm format`     | Format `src/` with Prettier                      |

## Deployment

Every push to `main` runs `.github/workflows/build_chat.yml`. It builds the app with the production Bazaar app ID (`VITE_APP_ID`) and publishes `dist/` to GitHub Pages at https://bzr-sys.github.io/banter/.

The Pages path is set by `base` in `vite.config.ts`. If you deploy somewhere else, change `base`, and register the new URL as a redirect URI for the app in the [Bazaar dashboard](https://cloud.bzr.dev).
