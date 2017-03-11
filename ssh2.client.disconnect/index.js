module.exports = function(NODE) {

	let doneOut = NODE.getOutputByName('done');

	let clientIn = NODE.getInputByName('client');
	let triggerIn = NODE.getInputByName('trigger');
	triggerIn.on('trigger', (conn, state) => {

		clientIn.getValues(state).then((clients) => {

			clients.forEach((client) => {
				client.end();
			});

			doneOut.trigger(state);

		})

	});

};
