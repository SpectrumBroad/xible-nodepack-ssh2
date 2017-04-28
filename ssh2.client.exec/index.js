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

  const clientIn = NODE.getInputByName('client');
  const triggerIn = NODE.getInputByName('trigger');
  triggerIn.on('trigger', (conn, state) => {
    clientIn.getValues(state).then((clients) => {
      const handleExec = (err, stdout, stderr) => {
        if (err) {
          NODE.error(err, state);
          return;
        }

        if (!stderr) {
          stderr = stdout.stderr;
        }

        // handle stdout
        stdout.on('close', (code, signal) => {
          let done = false;
          if (++closeCount === clientsLength) {
            stdOutStream.emit('close');
            done = true;
          }

          if (code) {
            NODE.error(`exited with non-zero code: "${code}"`, state);
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
        // TODO: handle other stream events
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
          handleExec(null, clientExec.stdout, clientExec.stderr);
        } else {
          client.exec(NODE.data.cmd, handleExec);
        }
      });
    });
  });
};
