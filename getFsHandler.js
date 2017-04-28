'use strict';

const fs = require('fs');

function getFsHandler(client) {
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

module.exports = getFsHandler;
