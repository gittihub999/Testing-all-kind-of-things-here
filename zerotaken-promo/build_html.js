/* Inlines the engine and the audio into one self-contained player. */
const fs = require('fs');
const engine = fs.readFileSync('engine.js', 'utf8');
const audio = fs.readFileSync('audio.m4a').toString('base64');
let html = fs.readFileSync('shell.html', 'utf8');
html = html.replace('/*__ENGINE__*/', engine)
           .replace('__AUDIO__', 'data:audio/mp4;base64,' + audio);
fs.writeFileSync('zerotaken-promo.html', html);
console.log('zerotaken-promo.html', (fs.statSync('zerotaken-promo.html').size / 1048576).toFixed(2) + ' MB');
