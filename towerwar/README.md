# Qala Savaşı

Sıfırdan yazılmış qüllə-ələ-keçirmə oyunu (HTML5 Canvas).

- Öz qüllənə toxun: yüksəlt (daha çox əsgər istehsalı)
- Öz qüllədən başqa qülləyə sürüşdür: əsgərlərin yarısı hücuma keçir
- Bütün düşmən qüllələri ələ keçir

## Vizualı dəyişmək
Fon, qüllə, əsgər və rənglər yalnız `theme.js` içindədir. Mexanika `game.js`-dədir.

## Brauzerdə
`index.html`-i aç.

## APK
```
npm install && npm run build
npx cap add android && npx cap sync android
cd android && ./gradlew assembleDebug
```
