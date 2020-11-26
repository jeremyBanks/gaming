This is an unofficial in-progress/unstable/pre-1.0 library/CLI tool for
interacting with your Stadia account, using the Deno JavaScript runtime.

⚠️ Features may not be implemented or may not function as describe, and this may
only work on Windows 10 using WSL Ubuntu and Chrome, with all Deno permissions
allowed.

## install Deno runtime (dependency)

```sh
curl -fsSL https://deno.land/x/install/install.sh | sh
# or see https://deno.land/manual/getting_started/installation
```

## invocation or installation

### run remotely

```sh
deno run --allow-all "https://deno.land/x/stadia/mod.ts" [...<args>]
```

### install and run locally

```sh
sudo deno install --reload --allow-all --force --root "/usr/local" "https://deno.land/x/stadia/mod.ts"
stadia ...<args>
```

## usage

```sh
USAGE:

    stadia [<authentication>] <command> [<arguments>...]

AUTHENTICATION:

    You must authenticate with Google Stadia in one of the following ways:

    (1) If using Google Chrome on Windows 10 and running this command within
        Windows Subsystem for Linux, it will detect any Chrome Profiles that are
        synced with a Google account and load their authentication cookies
        automatically. If there are multiple synced profiles, you will be
        prompted to pick one, or you may specify it with the
        --google-email=<email> parameter.

    (2) The --google-cookie=<cookies> parameter may be set to a header-style
        semicolon-delimited Cookie string that will be used to authenticate with
        Google. This should contain the Google authentication cookies "SID",
        "SSID", and "HSID".

    (3) --offline will disable all authentication and network
        operations. Operations that require data that isn't already saved
        locally will fail.

LOCAL STATE:

    Local state is persisted in a SQLite database named "./deno-stadia.sqlite"
    in the current working directory. This may contain the Google ID and
    Google Email of the current user, but it will never include authentication
    credentials, so you can share it without compromising your Google account.

COMMANDS:

    stadia auth

        Prints information about the authenticated user.

    stadia run <game_name | game_id>

        Launch a Stadia game in Chrome, specified by name or ID.

    stadia captures list

        Lists captured images and video.

    stadia users profile <user_id>

        Displays basic profile information for the user with the given ID.

    stadia store update

        Updates the local Stadia store catalogue.

    stadia store search <name>

        Search the local Stadia store catalogue.

```
