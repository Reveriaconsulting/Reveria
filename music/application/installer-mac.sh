#!/bin/zsh
# Reconstruit l'application RevLoop et l'installe dans /Applications.
# À relancer après chaque modification du logiciel :  ./installer-mac.sh
set -e
cd "${0:A:h}"
npx electron-builder --mac dir
# Le dossier Documents (synchronisé) ajoute des attributs cachés qui empêchent la signature :
# on signe donc une copie propre, dans un dossier temporaire, avant de l'installer.
TEMP=$(mktemp -d)
ditto --norsrc --noextattr --noacl "dist/mac-arm64/RevLoop.app" "$TEMP/RevLoop.app"
xattr -cr "$TEMP/RevLoop.app"
codesign --force --deep --sign - "$TEMP/RevLoop.app"     # signature locale (obligatoire sur puce Apple)
osascript -e 'tell application "RevLoop" to quit' 2>/dev/null || true
rm -rf "/Applications/RevLoop.app"
ditto "$TEMP/RevLoop.app" "/Applications/RevLoop.app"
rm -rf "$TEMP" dist                                            # rien ne traîne : l'application est dans /Applications
echo "RevLoop est installée dans Applications."
