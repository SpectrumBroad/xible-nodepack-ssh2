'use strict';

module.exports = (NODE) => {
  const doneOut = NODE.getOutputByName('done');

  const clientIn = NODE.getInputByName('client');
  const triggerIn = NODE.getInputByName('trigger');
  triggerIn.on('trigger', (conn, state) => {
    clientIn.getValues(state).then((clients) => {
      clients.forEach((client) => {
        if (client === 'local') {
          return;
        }
        client.end();
      });

      doneOut.trigger(state);
    });
  });
};
