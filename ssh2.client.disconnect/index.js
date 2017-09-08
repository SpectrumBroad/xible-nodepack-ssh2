'use strict';

module.exports = (NODE) => {
  const doneOut = NODE.getOutputByName('done');

  const clientsIn = NODE.getInputByName('clients');
  const triggerIn = NODE.getInputByName('trigger');
  triggerIn.on('trigger', (conn, state) => {
    clientsIn.getValues(state)
    .then((clients) => {
      const clientsLength = clients.length;
      let doneCount = 0;
      for (let i = 0; i < clients.length; i += 1) {
        const client = clients[i];
        if (client === 'local') {
          if (++doneCount === clientsLength) {
            doneOut.trigger(state);
          }
          continue;
        }
        client.once('end', () => {
          if (++doneCount === clientsLength) {
            doneOut.trigger(state);
          }
        });
        client.end();
      }
    });
  });
};
