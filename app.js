
import $ from 'jquery';
window.$ = window.jQuery = $;
import '@matrix-org/olm';
import 'focus-visible';
import './react/features/base/jitsi-local-storage/setup';
import conference from './conference';
import API from './modules/API';
import UI from './modules/UI/UI';
import translation from './modules/translation/translation';

if (!('createImageBitmap' in window)) {
    window.createImageBitmap = function(data) {
        return new Promise((resolve, reject) => {
            let dataURL;

            if (data instanceof HTMLCanvasElement) {
                dataURL = data.toDataURL();
            } else {
                reject(new Error('createImageBitmap does not handle the provided image source type'));
            }
            const img = document.createElement('img');

            img.addEventListener('load', () => {
                resolve(img);
            });
            img.src = dataURL;
        });
    };
}


if (window.Olm) {
    window.Olm.init().catch(e => {
        console.error('Failed to initialize Olm, E2EE will be disabled', e);
        delete window.Olm;
    });
}

window.APP = {
    API,
    conference,
    translation,
    UI
};

import './react';
