'use strict';

module.exports = (NODE) => {
  const EventEmitter = require('events').EventEmitter;
  const childProcess = require('child_process');

  const doneOut = NODE.getOutputByName('done');
  const startedOut = NODE.getOutputByName('started');
  const stdOut = NODE.getOutputByName('stdout');
  const stdErr = NODE.getOutputByName('stderr');

  stdOut.on('trigger', async (conn, state) => {
    const thisState = state.get(NODE);
    if (!thisState) {
      return;
    }

    return thisState.stdOutStream;
  });

  stdErr.on('trigger', async (conn, state) => {
    const thisState = state.get(NODE);
    if (!thisState) {
      return;
    }

    return thisState.stdErrStream;
  });

  const commandsIn = NODE.getInputByName('commands');
  const clientsIn = NODE.getInputByName('clients');
  const triggerIn = NODE.getInputByName('trigger');
  triggerIn.on('trigger', async (conn, state) => {
    // get the commands to run
    let commands = await commandsIn.getValues(state);
    if (!commands.length) {
      commands.push(NODE.data.cmd);
    }

    // add sudo details to the command
    if (NODE.data.sudoUser) {
      commands = commands.map((cmd) => {
        if (NODE.data.sudoUser === 'root') {
          return `sudo ${cmd}`;
        }
        return `sudo su - '${NODE.data.sudoUser}' -c "${cmd.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
      });
    }

    // build the streams and save them in the state
    const stdOutStream = new EventEmitter();
    const stdErrStream = new EventEmitter();
    state.set(NODE, {
      stdOutStream,
      stdErrStream
    });

    startedOut.trigger(state);

    // get the clients to execute this command on
    const clients = await clientsIn.getValues(state);
    if (!clients.length) {
      clients.push('local');
    }

    let closeCount = 0;
    let endCount = 0;
    const clientsLength = clients.length;
    const commandsLength = commands.length;
    const callLength = clientsLength * commandsLength;

    const handleExec = (cmd, err, stdout, stderr, clientExec) => {
      if (err) {
        NODE.error(err, state);
        return;
      }

      if (!stderr) {
        stderr = stdout.stderr;
      }

      // Handle exit codes for 'local' / child_process.
      let exitCode;
      let stdErrStr = '';
      if (clientExec) {
        clientExec.on('exit', (code) => {
          exitCode = code;
        });
      }

      // handle stdout
      stdout.on('close', (code) => {
        let done = false;
        if (++closeCount === callLength) {
          stdOutStream.emit('close');
          done = true;
        }

        if (code || exitCode) {
          NODE.error(`Command failed: ${cmd} \n${stdErrStr}`, state);
          return;
        }

        // check if we have processed the command for all clients
        if (done) {
          doneOut.trigger(state);
        }
      });

      stdout.on('end', () => {
        if (++endCount === callLength) {
          stdOutStream.emit('end');
        }
      });

      stdout.on('error', (streamErr) => {
        stdOutStream.emit('error', streamErr);
        NODE.error(streamErr, state);
      });

      stdout.on('data', (data) => {
        stdOutStream.emit('data', data.toString());

        NODE.addStatus({
          message: `${data}`,
          timeout: 7000
        });
      });

      // handle stderr
      // TODO: handle other stream events on stderr
      stderr.on('data', (data) => {
        stdErrStream.emit('data', data.toString());
        stdErrStr += data;

        NODE.addStatus({
          message: `${data}`,
          color: 'red',
          timeout: 7000
        });
      });
    };

    clients.forEach((client) => {
      commands.forEach((cmd) => {
        if (client === 'local') {
          const clientExec = childProcess.exec(cmd);
          handleExec(cmd, null, clientExec.stdout, clientExec.stderr, clientExec);
        } else {
          client.exec(cmd, (err, stdout, stderr) => {
            handleExec(cmd, err, stdout, stderr);
          });
        }
      });
    });
  });
};
