const { withAndroidManifest } = require('@expo/config-plugins');

function addForegroundServicePermissions(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // Ensure uses-permission array exists
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const permissions = manifest['uses-permission'];

    const requiredPermissions = [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MICROPHONE',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.RECORD_AUDIO',
    ];

    // Allow cleartext HTTP traffic for local dev backend
    const application = manifest.application?.[0];
    if (application?.$) {
      application.$['android:usesCleartextTraffic'] = 'true';
    }

    for (const perm of requiredPermissions) {
      const exists = permissions.some(
        (p) => p.$?.['android:name'] === perm
      );
      if (!exists) {
        permissions.push({
          $: { 'android:name': perm },
        });
      }
    }

    return config;
  });
}

module.exports = addForegroundServicePermissions;
