module.exports = function(NODE) {

	const EventEmitter = require('events').EventEmitter;

	let doneOut = NODE.getOutputByName('done');
	let stdOut = NODE.getOutputByName('stdout');
	let stdErr = NODE.getOutputByName('stderr');

	let stdOutStream = new EventEmitter();
	let stdErrStream = new EventEmitter();

	stdOut.on('trigger', (conn, state, callback) => {
		callback(stdOutStream);
	});

	stdErr.on('trigger', (conn, state, callback) => {
		callback(stdErrStream);
	});

	let clientIn = NODE.getInputByName('client');
	let triggerIn = NODE.getInputByName('trigger');
	triggerIn.on('trigger', (conn, state) => {

		clientIn.getValues(state).then((clients) => {

			let closeCount = 0;
			let endCount = 0;
			let clientsLength = clients.length;

			clients.forEach((client) => {
				client.exec(NODE.data.cmd, (err, stream) => {

					if (err) {
						NODE.error(err, state);
						return;
					}

					// handle stdout
					stream.on('close', (code, signal) => {

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

					stream.on('end', () => {

						if (++endCount === clientsLength) {
							stdOutStream.emit('end');
						}

					});

					stream.on('error', (err) => {
						stdOutStream.emit('error', err);
						NODE.error(err, state);
					});

					stream.on('data', (data) => {

						stdOutStream.emit('data', data);

						NODE.addStatus({
							message: '' + data,
							timeout: 7000
						});

					});

					// handle stderr
					// TODO: handle other stream events
					stream.stderr.on('data', (data) => {

						stdErrStream.emit('data', data);

						NODE.addStatus({
							message: '' + data,
							color: 'red',
							timeout: 7000
						});

					});

				});

			});

		});

	});

};
