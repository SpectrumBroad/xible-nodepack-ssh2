'use strict';

module.exports = (NODE) => {
  let sshClient;
  let sshClientReady = false;

  function callbackSsh(callback) {
    if (!sshClientReady) {
      if (!sshClient) {
        sshClient = new require('ssh2').Client();
        sshClient.on('ready', () => {
          NODE.removeAllStatuses();
          NODE.addStatus({
            message: 'connected',
            color: 'green'
          });

          sshClientReady = true;
        });

        sshClient.on('error', (err) => {
          NODE.setTracker({
            message: `${err}`,
            color: 'red',
            timeout: 7000
          });
        });

        sshClient.on('close', () => {
          NODE.removeAllStatuses();
          NODE.addStatus({
            message: 'disconnected',
            color: 'red'
          });

          sshClientReady = false;
        });

        sshClient.on('end', () => {
          NODE.removeAllStatuses();
          NODE.addStatus({
            message: 'disconnected',
            color: 'red'
          });

          sshClientReady = false;
        });

        NODE.removeAllStatuses();
        NODE.addStatus({
          message: 'connecting',
          color: 'orange'
        });

        sshClient.connect({
          host: NODE.data.hostname,
          port: NODE.data.port,
          username: NODE.data.username,
          password: NODE.data.password
        });

        sshClient.once('ready', () => callbackSsh(callback));
        return;
      }

      sshClient.once('ready', () => callbackSsh(callback));
      return;
    }

    callback(sshClient);
  }

  const clientOut = NODE.getOutputByName('client');
  clientOut.on('trigger', (conn, state, callback) => callbackSsh(callback));
};
