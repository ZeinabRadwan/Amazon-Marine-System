# Google Drive & Background Jobs Setup Guide

This guide details the steps required to enable Google Drive storage and configure background job processing on a shared hosting environment.

---

## 🟢 Part 1: Google Cloud Console Configuration

To use Google Drive as a storage provider, you must create an application in the Google Cloud Console.

### 1. Create a Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click on the project dropdown and select **New Project**.
3. Name it (e.g., "Amazon Marine Storage") and click **Create**.

### 2. Enable Google Drive API
1. In the sidebar, go to **APIs & Services > Library**.
2. Search for **"Google Drive API"**.
3. Click on it and select **Enable**.

### 3. Configure OAuth Consent Screen
1. Go to **APIs & Services > OAuth consent screen**.
2. Select **External** and click **Create**.
3. Fill in the "App information" (App name, User support email).
4. In **Scopes**, add `.../auth/drive` or `.../auth/drive.file` (recommended).
5. Add your own email as a **Test User** (required while the app is in "Testing" mode).

### 4. Create OAuth Credentials
1. Go to **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth client ID**.
3. Select **Web application** as the Application type.
4. Set the **Authorized redirect URIs** to: `https://developers.google.com/oauthplayground` (used for the next step).
5. Click **Create** and save your **Client ID** and **Client Secret**.

---

## 🔵 Part 2: Generating the Refresh Token

Since the system needs to access Drive without user interaction, you need a long-lived Refresh Token.

1. Go to the [Google OAuth2 Playground](https://developers.google.com/oauthplayground).
2. Click the **Settings icon** (top right) and check **"Use your own OAuth credentials"**.
3. Enter your **Client ID** and **Client Secret**.
4. In the "Select & authorize APIs" box, paste: `https://www.googleapis.com/auth/drive` and click **Authorize APIs**.
5. Log in with your Google account and grant permissions.
6. Click **Exchange authorization code for tokens**.
7. Copy the **Refresh Token** from the JSON response.

---

## 🟡 Part 3: Laravel Configuration

Update your `.env` file on the server:

```env
# Google Drive Credentials
GOOGLE_DRIVE_CLIENT_ID="your-client-id"
GOOGLE_DRIVE_CLIENT_SECRET="your-client-secret"
GOOGLE_DRIVE_REFRESH_TOKEN="your-refresh-token"
GOOGLE_DRIVE_FOLDER_ID="optional-folder-id-if-you-want-a-specific-root"

# System Default Storage
FILESYSTEM_DISK=google_drive
```

---

## 🟠 Part 4: Shared Hosting Cron Job (Queue Configuration)

Shared hosts usually don't allow running a persistent `php artisan queue:work` process. Instead, you must use a Cron Job to process the `ProcessFileUpload` job.

### 1. Add the Cron Job
Access your hosting control panel (cPanel/Plesk) and add a new Cron Job to run **every minute**:

**Command:**
```bash
/usr/local/bin/php /home/your-username/public_html/back/artisan schedule:run >> /dev/null 2>&1
```
*(Note: Replace paths with your actual server paths. Use `pwd` in terminal to verify.)*

### 2. Configure the Scheduler
Ensure your `back/routes/console.php` or `back/app/Console/Kernel.php` contains the following instruction to process the queue automatically:

```php
// In routes/console.php
use Illuminate\Support\Facades\Schedule;

Schedule::command('queue:work --stop-when-empty')->everyMinute()->withoutOverlapping();
```

### 3. How it Works
- The Cron Job triggers Laravel's **Schedule** every minute.
- Laravel checks if the queue is already running (via `withoutOverlapping`).
- If not, it runs `queue:work --stop-when-empty`, which processes all pending `ProcessFileUpload` jobs and then exits gracefully to save server resources.

---

## ✅ Verification
1. Log in to the System Admin panel.
2. Go to **Settings > Storage**.
3. Add a new disk with driver `google_drive` and your credentials.
4. Click **Health Check** to verify the connection.
5. Set it as **Default** to start uploading all new files to your Google Drive!
