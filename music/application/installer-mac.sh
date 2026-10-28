#!/bin/zsh
# Reconstruit l'application Astrellia et l'installe dans /Applications.
# À relancer après chaque modification du logiciel :  ./installer-mac.sh
set -e
cd "${0:A:h}"
npx electron-builder --mac dir
# Le dossier Documents (synchronisé) ajoute des attributs cachés qui empêchent la signature :
# on signe donc une copie propre, dans un dossier temporaire, avant de l'installer.
TEMP=$(mktemp -d)
ditto --norsrc --noextattr --noacl "dist/mac-arm64/Astrellia.app" "$TEMP/Astrellia.app"
xattr -cr "$TEMP/Astrellia.app"
codesign --force --deep --sign - "$TEMP/Astrellia.app"     # signature locale (obligatoire sur puce Apple)
osascript -e 'tell application "Astrellia" to quit' 2>/dev/null || true
osascript -e 'tell application "RevLoop" to quit' 2>/dev/null || true      # l'ancien nom de l'application
rm -rf "/Applications/Astrellia.app" "/Applications/RevLoop.app"
ditto "$TEMP/Astrellia.app" "/Applications/Astrellia.app"
rm -rf "$TEMP" dist                                            # rien ne traîne : l'application est dans /Applications
echo "Astrellia est installée dans Applications."
