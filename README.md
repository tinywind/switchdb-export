# SwitchDB Export

Export Nintendo Switch game metadata from the IGDB API to CSV, including release
dates, Korean language support and PC availability.

## Prerequisites

- Node.js 18 or newer, as required by `package.json`.
- A Twitch account and an application Client ID and Client Secret for the IGDB API.

Follow the [IGDB account-creation instructions](https://api-docs.igdb.com/#account-creation):
enable Twitch two-factor authentication, register an application in the
[Twitch Developer Console](https://dev.twitch.tv/console/apps), choose the
Confidential client type, and generate a Client Secret. IGDB does not use the
OAuth redirect URL; its setup instructions use `localhost` for that field.

The exporter obtains an access token from Twitch automatically. Keep the Client
Secret private and keep the local `.env` file out of version control.

## Installation

From the repository directory:

```bash
npm install
```

## Configuration

Create `.env` in the repository directory and replace the placeholders:

```dotenv
IGDB_CLIENT_ID=your_client_id_here
IGDB_CLIENT_SECRET=your_client_secret_here
OUTPUT_FILE=switch_games.csv
```

`OUTPUT_FILE` is optional and defaults to `switch_games.csv`. The exporter joins
this path to the script directory, so the default output is beside
`igdb-switch-exporter.js`. If you choose a subdirectory, create it before running.
An existing output file at that path is overwritten.

## Run the export

```bash
npm start
```

The exporter retrieves matching games in pages of up to 500 records, reports the
running total and prints the output path when finished. It pauses 400 ms between
pages. The number of games and total runtime depend on the current IGDB data and
API responses.

## Output

The CSV uses Korean column headers and category values. Its columns contain:

- Game name.
- Supported platforms.
- Overall first release date and Switch release date.
- Korean audio, subtitle or interface support.
- Category-based original, remake, remaster, expanded-game, port or remade status.
- PC availability.

The Switch date uses the first matching Switch release-date entry and falls back
to the overall first release date when none is available. Korean support records
the first matching Korean language-support entry; it does not combine multiple
support types into one value.

## CSV security

Game and platform names come from a remote API. Exported text that begins with a
formula marker, its full-width equivalent, or a tab/carriage return/line feed
receives a tab prefix inside its quoted CSV cell. Leading whitespace before a
formula marker is covered. Ordinary values and existing columns stay unchanged.
The protective tab remains part of the CSV data and must be considered by
programmatic consumers. Spreadsheet applications differ; this is not a guarantee
for every application or subsequent edit/save cycle. See the
[OWASP CSV injection guidance](https://community.owasp.org/attacks/CSV_Injection).

## Tests

Run the existing integration tests with Node.js 24 or 26:

```bash
npm test
```

They run the actual exporter against intercepted Twitch/IGDB responses and
use temporary files under `.tmp/`. They need no API credentials or network
requests.
