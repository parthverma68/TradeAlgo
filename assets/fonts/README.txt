Drop IBM Plex font files here, then run:  npx react-native-asset

Required filenames (the PostScript name must match src/theme.ts):
  PlexSans.ttf
  PlexSansBold.ttf
  PlexMono.ttf
  PlexMonoBold.ttf

Download: https://github.com/IBM/plex/releases

If you skip this step, delete the `fontFamily` entries from src/theme.ts and the
app falls back to system fonts. It runs fine either way.

Note: on iOS, react-native-asset adds entries to Info.plist (UIAppFonts). On
Android the files land in android/app/src/main/assets/fonts/. Adding fonts
requires a rebuild, not a Metro reload.
