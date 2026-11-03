# instagram-unfollowers

A single-file tool you paste into your browser console to see which Instagram accounts you follow that don't follow you back. No install, no password, no third-party app.

![Results panel, shown with fake data](docs/ekran.png)

*Screenshot taken with fake data. The panel's interface text is in Turkish.*

## Usage

1. Log in to instagram.com on a computer.
2. Press `F12` to open developer tools and switch to the **Console** tab.
3. Copy the whole of [`not_following_back_ui.js`](not_following_back_ui.js), paste it into the console and press `Enter`. If the browser blocks pasting, type `allow pasting` and press `Enter` first.
4. Click the start button in the panel that opens. Large accounts can take a few minutes, so keep the tab open while it runs.

## What the panel offers

- Live counters and a progress bar, with a button to cancel.
- Two tabs: accounts that don't follow you back, and accounts that follow you but you don't follow.
- Search and a filter to hide verified accounts.
- Copy the filtered list, or download it as CSV.
- Click a row to open that profile in a new tab.
- `Esc` or the × button closes the panel. The result is also kept in `window.__notFollowingBack`.

## How it works

The script runs inside your logged-in instagram.com tab and reads the `friendships/{id}/following` and `followers` endpoints that Instagram's own web app uses, one page at a time, waiting 1.5–3.5 seconds at random between pages. It then compares the two lists and shows the difference.

- **Read-only:** it never unfollows, likes or messages anyone.
- **Nothing leaves your browser:** requests go only to instagram.com.
- On an error (for example HTTP 429) it stops and shows no result, rather than reporting from incomplete data.

## Risks

- This uses Instagram's **unofficial** internal API. If Instagram changes its response format, the tool can break.
- Automated requests sit in a gray area of Instagram's terms of use. Running it often may get your account temporarily restricted, so use it rarely and once at a time.
- Read any code before you run it. Whatever you paste into the console runs with your session, so never paste scripts from sources you don't trust.
- Official alternative: use *Accounts Center → Download your information* to export your followers and following lists as JSON and compare them yourself.

## Disclaimer

Not affiliated with Instagram or Meta. Written for personal use on your own account.
