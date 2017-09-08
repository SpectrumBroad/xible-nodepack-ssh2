'use strict';

module.exports = (NODE) => {
  const EventEmitter = require('events').EventEmitter;
  const childProcess = require('child_process');

  const doneOut = NODE.getOutputByName('done');
  const stdOut = NODE.getOutputByName('stdout');
  const stdErr = NODE.getOutputByName('stderr');

  const stdOutStream = new EventEmitter();
  const stdErrStream = new EventEmitter();

  stdOut.on('trigger', (conn, state, callback) => {
    callback(stdOutStream);
  });

  stdErr.on('trigger', (conn, state, callback) => {
    callback(stdErrStream);
  });

  const clientsIn = NODE.getInputByName('clients');
  const triggerIn = NODE.getInputByName('trigger');
  triggerIn.on('trigger', (conn, state) => {
    clientsIn.getValues(state)
    .then((clients) => {
      if (!clients.length) {
        clients = ['local'];
      }

      const handleExec = (err, stdout, stderr, clientExec) => {
        if (err) {
          NODE.error(err, state);
          return;
        }

        if (!stderr) {
          stderr = stdout.stderr;
        }

        // Handle exit codes for 'local' / child_process.
        let exitCode;
        if (clientExec) {
          clientExec.on('exit', (code) => {
            exitCode = code;
          });
        }

        // handle stdout
        stdout.on('close', (code) => {
          let done = false;
          if (++closeCount === clientsLength) {
            stdOutStream.emit('close');
            done = true;
          }

          if (code || exitCode) {
            NODE.error(`exited with non-zero code: "${code || exitCode}"`, state);
            return;
          }

          // check if we have processed the command for all clients
          if (done) {
            doneOut.trigger(state);
          }
        });

        stdout.on('end', () => {
          if (++endCount === clientsLength) {
            stdOutStream.emit('end');
          }
        });

        stdout.on('error', (streamErr) => {
          stdOutStream.emit('error', streamErr);
          NODE.error(streamErr, state);
        });

        stdout.on('data', (data) => {
          stdOutStream.emit('data', data);

          NODE.addStatus({
            message: `${data}`,
            timeout: 7000
          });
        });

        // handle stderr
        // TODO: handle other stream events on stderr
        stderr.on('data', (data) => {
          stdErrStream.emit('data', data);

          NODE.addStatus({
            message: `${data}`,
            color: 'red',
            timeout: 7000
          });
        });
      };

      let closeCount = 0;
      let endCount = 0;
      const clientsLength = clients.length;

      clients.forEach((client) => {
        if (client === 'local') {
          client = childProcess;
          const clientExec = client.exec(NODE.data.cmd);
          handleExec(null, clientExec.stdout, clientExec.stderr, clientExec);
        } else {
          client.exec(NODE.data.cmd, handleExec);
        }
      });
    });
  });
};
