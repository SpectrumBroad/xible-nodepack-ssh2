module.exports = function(NODE) {

	let doneOut = NODE.getOutputByName('done');

	let clientIn = NODE.getInputByName('client');
	let triggerIn = NODE.getInputByName('trigger');
	triggerIn.on('trigger', (conn, state) => {

		clientIn.getValues(state).then((clients) => {

			let doneCount = 0;
			let clientsLength = clients.length;

			clients.forEach((client) => {
				client.exec(NODE.data.cmd, (err, stream) => {

					if (err) {

						NODE.fail(err, state);
						return;

					}

					stream.on('close', (code, signal) => {

						if (code) {
							return NODE.fail(`exited with non-zero code: "${code}"`, state);
						}

						//check if we have processed the command for all clients
						if (++doneCount === clientsLength) {
							doneOut.trigger(state);
						}

					});

					stream.on('data', (data) => {

						NODE.addStatus({
							message: '' + data,
							timeout: 7000
						});

					});

					stream.stderr.on('data', (data) => {

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
