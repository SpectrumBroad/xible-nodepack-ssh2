'use strict';

module.exports = (NODE) => {
  let sshClient;
  let sshClientConnecting = false;
  let sshClientReady = false;

  function connectSsh() {
    sshClientConnecting = true;
    sshClient.connect({
      host: NODE.data.hostname,
      port: NODE.data.port,
      username: NODE.data.username,
      password: NODE.data.password
    });
  }

  function callbackSsh(callback) {
    // Already connected, return sshClient.
    if (sshClientReady) {
      callback(sshClient);
      return;
    }

    // Connecting, wait for connection and return sshClient.
    if (sshClientConnecting) {
      sshClient.once('ready', () => callbackSsh(callback));
      return;
    }

    // Disconnected. Connect and wait for connection to return sshClient
    if (sshClient) {
      sshClient.once('ready', () => callbackSsh(callback));
      connectSsh();
      return;
    }

    // Never setup/connected. Setup, connect and wait for connection to return sshClient
    sshClientConnecting = true;
    sshClient = new require('ssh2').Client(); // eslint-disable-line
    sshClient.on('ready', () => {
      NODE.removeAllStatuses();
      NODE.addStatus({
        message: 'connected',
        color: 'green'
      });

      sshClientConnecting = false;
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

      sshClientConnecting = false;
      sshClientReady = false;
    });

    sshClient.on('end', () => {
      NODE.removeAllStatuses();
      NODE.addStatus({
        message: 'disconnected',
        color: 'red'
      });
      sshClientConnecting = false;
      sshClientReady = false;
    });

    NODE.removeAllStatuses();
    NODE.addStatus({
      message: 'connecting',
      color: 'orange'
    });

    sshClient.once('ready', () => callbackSsh(callback));
    connectSsh();
  }

  const clientOut = NODE.getOutputByName('client');
  clientOut.on('trigger', (conn, state, callback) => callbackSsh(callback));
};
