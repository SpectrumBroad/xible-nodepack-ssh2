module.exports = function(NODE) {

	const fs = require('fs');

	let doneOut = NODE.getOutputByName('done');

	let clientIn = NODE.getInputByName('client');
	let triggerIn = NODE.getInputByName('trigger');
	triggerIn.on('trigger', (conn, state) => {

		clientIn.getValues(state).then((clients) => {

			let doneCount = 0;
			let clientsLength = clients.length;

			clients.forEach((client) => {

				client.sftp((err, sftp) => {

					if (err) {

						NODE.fail(err, state);
						return;

					}

					//read the file from its origin and hook event handlers
					let readStream = fs.createReadStream(NODE.data.originPath);

					readStream.on('error', (err) => {

						console.error(err);
						NODE.fail('' + err, state);

					});

					//write the file to the destination and hook event handlers
					let writeStream = sftp.createWriteStream(NODE.data.destinationPath);

					writeStream.on('error', (err) => {

						console.error(err);
						NODE.fail('' + err, state);

					});

					writeStream.on('close', () => {

						sftp.end();

						//check if we have processed the command for all clients
						if (++doneCount === clientsLength) {
							doneOut.trigger(state);
						}

					});

					//pipe read into write to start the actual transfer of data
					readStream.pipe(writeStream);

				});

			});

		});

	});

};
