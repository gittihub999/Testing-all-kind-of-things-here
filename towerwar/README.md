# Qala Savaşı

Sıfırdan yazılmış yol-çəkmə strategiya oyunu (3D, Three.js + HTML5 Canvas UI).

- Öz evindən başqa evə sürüşdür: yol çəkilir, əsgərlər axınla yeriyir
- Evə toxun: yüksəlt (daha çox istehsal və yol limiti)
- Yola toxun: yolu kəs
- Düşmən əsgərləri yolda toqquşanda bir-birini məhv edir
- Qüllələr radiusa girən düşmən əsgərlərinə atəş açır
- Qaya və göl maneələri yol çəkilməsinə icazə vermir
- Boosterlər: bomba, sürət
- Hər 5-ci səviyyə boss səviyyəsidir (3 düşmən)

## Vizualı dəyişmək
Rəng cədvəli `theme.js`-də, 3D modellər və kamera `r3.js`-də, mexanika `game.js`-dədir.

## APK
```
npm install && npm run build
npx cap add android && npx cap sync android
cd android && ./gradlew assembleDebug
```
