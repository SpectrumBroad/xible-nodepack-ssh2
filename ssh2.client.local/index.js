'use strict';

module.exports = (NODE) => {
  const clientOut = NODE.getOutputByName('client');
  clientOut.on('trigger', (conn, state, callback) => callback('local'));
};
