'use strict';

module.exports = (NODE) => {
  const micromatch = require('micromatch');
  const parseGlob = require('parse-glob');
  const getFsHandler = require('../getFsHandler');

  const existingDirs = new Map();
  function ensureDir(path, fsHandlers, ignoreCache) {
    if (!ignoreCache && existingDirs.has(path)) {
      return existingDirs.get(path);
    }
    const returnPromise = new Promise((resolve, reject) => {
      const fsHandlerCount = fsHandlers.length;
      let doneCount = 0;
      fsHandlers.forEach((fsHandler) => {
        fsHandler.stat(path, (err, stats) => {
          if (err) {
            if (err.code !== 'ENOENT' && err.code !== 2) {
              reject(err);
              return;
            }
            fsHandler.mkdir(path, (mkdirErr) => {
              if (mkdirErr) {
                if (err.code !== 'ENOENT' && err.code !== 2) {
                  reject(mkdirErr);
                  return;
                }
                ensureDir(path.substring(0, path.lastIndexOf('/')), [fsHandler], true)
                .then(() => ensureDir(path, [fsHandler], true))
                .then(() => {
                  if (++doneCount === fsHandlerCount) {
                    resolve();
                  }
                })
                .catch(ensureErr => reject(ensureErr));
                return;
              }
              if (++doneCount === fsHandlerCount) {
                resolve();
              }
            });
            return;
          }
          if (stats.isDirectory()) {
            if (++doneCount === fsHandlerCount) {
              resolve();
            }
          } else {
            reject(new Error(`Destination path "${path}" exists and is not a directory.`));
          }
        });
      });
    });
    if (!ignoreCache) {
      existingDirs.set(path, returnPromise);
    }
    return returnPromise;
  }

  function copyPath(originFsHandler, destinationFsHandlers, originPath, destinationPath, glob) {
    return new Promise((resolve, reject) => {
      const destinationLength = destinationFsHandlers.length;
      let destinationDoneCount = 0;
      originFsHandler.stat(originPath, (statsErr, stats) => {
        if (statsErr) {
          reject(statsErr);
          return;
        }

        // if originPath is a file, copy just that file
        if (stats.isFile()) {
          if (glob.is.glob && !micromatch.isMatch(originPath, glob.orig)) {
            resolve();
            return;
          }

          const onDirExists = () => {
            const readStream = originFsHandler.createReadStream(originPath, {
              autoClose: false
            });
            readStream.on('error', (err) => {
              reject(err);
            });

            destinationFsHandlers.forEach((destinationFsHandler) => {
              const writeStream = destinationFsHandler.createWriteStream(destinationPath);
              writeStream.on('error', (err) => {
                reject(err);
              });

              writeStream.on('close', () => {
                // done for this originFsHandler
                if (++destinationDoneCount === destinationLength) {
                  readStream.close();
                  resolve();
                }
              });

              // pipe read into write to start the actual transfer of data
              readStream.pipe(writeStream);
            });
          };

          const destinationDirPath = destinationPath.substring(0, destinationPath.lastIndexOf('/'));

          ensureDir(destinationDirPath, destinationFsHandlers)
          .then(onDirExists)
          .catch((err) => {
            reject(err);
          });

        // if originPath is a directory, copy the directory recursively
        } else if (stats.isDirectory()) {
          if (glob.is.glob && micromatch.isMatch(originPath, glob.orig)) {
            glob = { is: false };
          }

          const readDir = () => {
            originFsHandler.readdir(originPath, (readdirErr, files) => {
              if (readdirErr) {
                reject(readdirErr);
                return;
              }

              files = files.map((file) => {
                if (typeof file !== 'string') {
                  file = file.filename;
                }
                return file;
              });

              Promise.all(
                files.map(
                  file => copyPath(originFsHandler, destinationFsHandlers, `${originPath}/${file}`, `${destinationPath}/${file}`, glob)
                )
              )
              .then(() => resolve())
              .catch(err => reject(err));
            });
          };

          if (!glob.is.glob) {
            ensureDir(destinationPath, destinationFsHandlers)
            .then(readDir);
          } else {
            readDir();
          }
        } else {
          reject(new Error(`Path "${NODE.data.originPath}" is not a file or directory.`));
        }
      });
    });
  }

  const doneOut = NODE.getOutputByName('done');
  const originClientsIn = NODE.getInputByName('originclients');
  const destinationClientsIn = NODE.getInputByName('destinationclients');
  const triggerIn = NODE.getInputByName('trigger');
  triggerIn.on('trigger', (conn, state) => {
    Promise.all([originClientsIn.getValues(state), destinationClientsIn.getValues(state)])
    .then(([originClients, destinationClients]) => {
      // get the origin fs handlers
      if (!originClients.length) {
        originClients = ['local'];
      }
      const originPromise = Promise.all(
        originClients.map(client => getFsHandler(client))
      );

      // get the destination fs handlers
      if (!destinationClients.length) {
        destinationClients = ['local'];
      }
      const destinationPromise = Promise.all(
        destinationClients.map(client => getFsHandler(client))
      );

      let originPath = NODE.data.originPath.replace(/\\/g, '/');
      if (originPath.substring(originPath.length - 1) === '/') {
        originPath = originPath.substring(0, originPath.length - 1);
      }

      const glob = parseGlob(originPath);
      if (glob.is.glob) {
        originPath = glob.base;
      }

      let destinationPath = NODE.data.destinationPath.replace(/\\/g, '/');
      if (destinationPath.substring(destinationPath.length - 1) === '/') {
        destinationPath = destinationPath.substring(0, destinationPath.length - 1);
      }
      if (!glob.is.glob) {
        destinationPath += `/${originPath.substring(originPath.lastIndexOf('/') + 1)}`;
      }

      Promise.all([originPromise, destinationPromise])
      .then(([originFsHandlers, destinationFsHandlers]) => {  //eslint-disable-line
        return Promise.all(
          originFsHandlers.map(originFsHandler =>
            copyPath(originFsHandler,
              destinationFsHandlers,
              originPath,
              destinationPath,
              glob
            )
          )
        )
        .then(() => {
          originFsHandlers.concat(destinationFsHandlers).forEach((handler) => {
            if (typeof handler.end === 'function') {
              handler.end();
            }
          });
        });
      })
      .then(() => {
        doneOut.trigger(state);
      })
      .catch((err) => {
        NODE.error(err, state);
      });
    });
  });
};
