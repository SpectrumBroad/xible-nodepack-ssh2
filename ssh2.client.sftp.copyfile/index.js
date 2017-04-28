'use strict';

module.exports = (NODE) => {
  const getFsHandler = require('../getFsHandler');

  const doneOut = NODE.getOutputByName('done');
  const originClientIn = NODE.getInputByName('originclient');
  const destinationClientIn = NODE.getInputByName('destinationclient');
  const triggerIn = NODE.getInputByName('trigger');
  triggerIn.on('trigger', (conn, state) => {
    Promise.all([originClientIn.getValues(state), destinationClientIn.getValues(state)])
      .then(([originClients, destinationClients]) => {
        // get the origin fs handlers
        if (!originClients.length) {
          originClients = ['local'];
        }
        const originPromise = Promise.all(originClients.map(client => getFsHandler(client)));

        // get the destination fs handlers
        if (!destinationClients.length) {
          destinationClients = ['local'];
        }
        const destinationPromise = Promise.all(destinationClients.map(client => getFsHandler(client)));

        Promise.all([originPromise, destinationPromise])
          .then(([originFsHandlers, destinationFsHandlers]) => {
            const originLength = originFsHandlers.length;
            const destinationLength = destinationFsHandlers.length;
            let originDoneCount = 0;
            originFsHandlers.forEach((originFsHandler) => {
              const readStream = originFsHandler.createReadStream(NODE.data.originPath, {
                autoClose: false
              });
              readStream.on('error', (err) => {
                NODE.error(err, state);
              });

              let destinationDoneCount = 0;
              destinationFsHandlers.forEach((destinationFsHandler) => {
                const writeStream = destinationFsHandler.createWriteStream(NODE.data.destinationPath);
                writeStream.on('error', (err) => {
                  NODE.error(err, state);
                });

                writeStream.on('close', () => {
                  // done for this originFsHandler
                  if (++destinationDoneCount === destinationLength) {
                    readStream.close();

                    // completely done
                    if (++originDoneCount === originLength) {
                      // close all sftp's
                      originFsHandlers.concat(destinationFsHandlers).forEach((handler) => {
                        if (typeof handler.end === 'function') {
                          handler.end();
                        }
                      });

                      // next
                      doneOut.trigger(state);
                    }
                  }
                });

                // pipe read into write to start the actual transfer of data
                readStream.pipe(writeStream);
              });
            });
          });
      });
  });
};
