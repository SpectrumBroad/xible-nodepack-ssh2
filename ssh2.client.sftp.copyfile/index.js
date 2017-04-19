module.exports = function(NODE) {

	const fs = require('fs');

	let doneOut = NODE.getOutputByName('done');

	function getFsHandler(client, state) {

		return new Promise((resolve, reject) => {

			if (client === 'local') {
				resolve(fs);
				return;
			}

			if (client.__xibleSftp) {
				resolve(client.__xibleSftp);
			}

			client.sftp((err, sftp) => {
				if (err) {
					reject(err);
					return;
				}
				client.__xibleSftp = sftp;
				resolve(sftp);
			});
		});

	}

	let originClientIn = NODE.getInputByName('originclient');
	let destinationClientIn = NODE.getInputByName('destinationclient');
	let triggerIn = NODE.getInputByName('trigger');
	triggerIn.on('trigger', (conn, state) => {

		Promise.all([originClientIn.getValues(state), destinationClientIn.getValues(state)])
			.then(([originClients, destinationClients]) => {

				//get the origin fs handlers
				if (!originClients.length) {
					originClients = ['local'];
				}
				let originPromise = Promise.all(originClients.map(client => getFsHandler(client)));

				//get the destination fs handlers
				if (!destinationClients.length) {
					destinationClients = ['local'];
				}
				let destinationPromise = Promise.all(destinationClients.map(client => getFsHandler(client)));

				Promise.all([originPromise, destinationPromise])
					.then(([originFsHandlers, destinationFsHandlers]) => {

						const originLength = originFsHandlers.length;
						const destinationLength = destinationFsHandlers.length;
						let originDoneCount = 0;
						originFsHandlers.forEach((originFsHandler) => {

							const readStream = originFsHandler.createReadStream(NODE.data.originPath, {
								autoClose: false
							});
							readStream.on('error', (err) => {
								NODE.error(err, state);
							});

							let destinationDoneCount = 0;
							destinationFsHandlers.forEach((destinationFsHandler) => {

								const writeStream = destinationFsHandler.createWriteStream(NODE.data.destinationPath);
								writeStream.on('error', (err) => {
									NODE.error(err, state);
								});

								writeStream.on('close', () => {

									//done for this originFsHandler
									if (++destinationDoneCount === destinationLength) {

										readStream.close();

										//complete done
										if (++originDoneCount === originLength) {

											//close all sftp's
											originFsHandlers.concat(destinationFsHandlers).forEach((handler) => {
												if(typeof handler.end === 'function') {
													handler.end();
												}
											});

											//next
											doneOut.trigger(state);

										}

									}
								});

								//pipe read into write to start the actual transfer of data
								readStream.pipe(writeStream);

							});

						});

					});

			});

	});

};
