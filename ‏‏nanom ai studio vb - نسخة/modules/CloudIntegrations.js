/**
 * CloudIntegrations.js
 * Handles real integration with Google Drive and OneDrive.
 */

// REPLACE THESE WITH YOUR OWN KEYS
const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY';
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
const ONEDRIVE_CLIENT_ID = 'YOUR_ONEDRIVE_CLIENT_ID';

// Configuration
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive.readonly';
const GOOGLE_DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];

window.CloudIntegrations = class {
    constructor() {
        this.googleLoaded = false;
        this.oneDriveLoaded = false;
        this.initGoogle();
    }

    initGoogle() {
        if (typeof gapi !== 'undefined') {
            gapi.load('client:auth2', () => {
                this.googleLoaded = true;
            });
        }
    }

    /**
     * Trigger Google Drive Picker
     * @param {Function} onFileSelected - Callback(fileData)
     */
    async pickFromGoogleDrive(onFileSelected) {
        if (!this.googleLoaded) {
            alert('Google API not loaded yet. Please wait or check your internet connection.');
            return;
        }

        if (GOOGLE_API_KEY.includes('YOUR_') || GOOGLE_CLIENT_ID.includes('YOUR_')) {
            alert('Setup Required: Please add your Google API Key and Client ID in modules/CloudIntegrations.js');
            return;
        }

        try {
            await gapi.client.init({
                apiKey: GOOGLE_API_KEY,
                clientId: GOOGLE_CLIENT_ID,
                discoveryDocs: GOOGLE_DISCOVERY_DOCS,
                scope: GOOGLE_SCOPES
            });

            const googleAuth = gapi.auth2.getAuthInstance();
            if (!googleAuth.isSignedIn.get()) {
                await googleAuth.signIn();
            }

            this.createGooglePicker(googleAuth.currentUser.get().getAuthResponse().access_token, onFileSelected);

        } catch (error) {
            console.error('Google Auth Error:', error);
            alert('Failed to authenticate with Google Drive.');
        }
    }

    createGooglePicker(oauthToken, callback) {
        if (typeof google === 'undefined' || !google.picker) {
            gapi.load('picker', () => {
                const picker = new google.picker.PickerBuilder()
                    .addView(google.picker.ViewId.DOCS)
                    .setOAuthToken(oauthToken)
                    .setDeveloperKey(GOOGLE_API_KEY)
                    .setCallback((data) => {
                        if (data[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
                            const doc = data[google.picker.Response.DOCUMENTS][0];
                            callback({
                                name: doc.name,
                                url: doc.url,
                                mime: doc.mimeType,
                                source: 'Google Drive'
                            });
                        }
                    })
                    .build();
                picker.setVisible(true);
            });
        }
    }

    /**
     * Trigger OneDrive Picker
     * @param {Function} onFileSelected - Callback(fileData)
     */
    pickFromOneDrive(onFileSelected) {
        if (ONEDRIVE_CLIENT_ID.includes('YOUR_')) {
            alert('Setup Required: Please add your OneDrive Client ID in modules/CloudIntegrations.js');
            return;
        }

        if (typeof OneDrive === 'undefined') {
            alert('OneDrive SDK not loaded.');
            return;
        }

        var odOptions = {
            clientId: ONEDRIVE_CLIENT_ID,
            action: "share",
            multiSelect: false,
            openInNewWindow: true,
            advanced: {},
            success: function (files) {
                const file = files.value[0];
                onFileSelected({
                    name: file.name,
                    url: file.webUrl,
                    size: file.size,
                    source: 'OneDrive'
                });
            },
            cancel: function () { /* Cancelled */ },
            error: function (error) { console.error(error); }
        };

        OneDrive.open(odOptions);
    }
}
