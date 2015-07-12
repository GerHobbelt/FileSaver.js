var FSProto = FileSaver.prototype;
FSProto.abort = fileSaverAbort;
FSProto.INIT = 0;
FSProto.WRITING = 1;
FSProto.DONE = 2;
FSProto.readyState = FSProto.INIT;
FSProto.error = null;
FSProto.onwritestart = null;
FSProto.onprogress = null;
FSProto.onwrite = null;
FSProto.onabort = null;
FSProto.onerror = null;
FSProto.onwriteend = null;


function FileSaver(blob, name) {
  blob = autoBom(blob);

  // First try a.download, then web filesystem, then object URLs
  var filesaver = this;
  var type = blob.type;
  var blobChanged = false;
  var objectUrl;
  var targetView;
  var createIfNotFound = {create: true, exclusive: false};

  filesaver.readyState = filesaver.INIT;
  name = name || 'download';

  if ( canUseSaveLink ) {
    return saveUsingLinkElement();
  }

  fixChromeSaveableType();
  fixWebKitDownload();


  if ( ! reqFs) {
    return saveUsingObjectURLs();
  }

  return saveUsingFyleSystem();


  ////////////////

  function saveUsingLinkElement() {
    objectUrl = getURL().createObjectURL(blob);
    saveLinkElement.href = objectUrl;
    saveLinkElement.download = name;

    setImmediate(function () {
      triggerClickOnSaveLink();
      dispatchAll(filesaver);
      revoke(objectUrl);
      filesaver.readyState = filesaver.DONE;
    }, 0);
  }

  function fixChromeSaveableType() {
    /*
     * Object and web filesystem URLs have a problem saving in Google Chrome when
     * viewed in a tab, so I force save with application/octet-stream
     * http://code.google.com/p/chromium/issues/detail?id=91158
     * Update: Google errantly closed 91158, I submitted it again:
     * https://code.google.com/p/chromium/issues/detail?id=389642
     */
    if (view.chrome && type && type !== forceSaveableType) {
      var slice = blob.slice || blob.webkitSlice;
      blob = slice.call(blob, 0, blob.size, forceSaveableType);
      blobChanged = true;
    }
  }

  function fixWebKitDownload() {
    // Since I can't be sure that the guessed media type will trigger a download
    // in WebKit, I append .download to the filename.
    // https://bugs.webkit.org/show_bug.cgi?id=65440
    if (webkitReqFs && name !== 'download') {
      name += '.download';
    }

    if (type === forceSaveableType || webkitReqFs) {
      targetView = view;
    }
  }


  function saveUsingFyleSystem() {
    fsMinSize += blob.size;

    reqFs(view.TEMPORARY, fsMinSize, abortable(getFyleSystem), saveUsingObjectURLs);

    ////////////

    function getFyleSystem(fs) {
      fs.root.getDirectory('temp', createIfNotFound, abortable(getTempDirectory), saveUsingObjectURLs);
    }

    function getTempDirectory(dir) {
      dir.getFile(name, { create: false }, abortable(getExistentFileForRemove), abortable(existentFileNotFound) );

      /////////////

      function getExistentFileForRemove(file) {
        // delete file if it already exists
        file.remove(function() {
          save();
        });
      }

      function existentFileNotFound(ex) {
        if (ex.name === 'NotFoundError') {
          save();
        } else {
          saveUsingObjectURLs();
        }
      }


      function save() {
        dir.getFile(name, createIfNotFound, abortable(getFileForWrite), saveUsingObjectURLs);
      }

      function getFileForWrite(file) {
        file.createWriter(abortable(createWriter), saveUsingObjectURLs);

        ////////

        function createWriter(writer) {
          writer.onwriteend = onWriterEnd;
          writer.onerror = onError;

          bindEventsToWriter();

          writer.write(blob);
          filesaver.abort = onAbort;
          filesaver.readyState = filesaver.WRITING;

          ////////////

          function onWriterEnd(event) {
            execSave(file.toURL(), file, event);
          }

          function onError() {
            var error = writer.error;
            if (error.code !== error.ABORT_ERR) {
              saveUsingObjectURLs();
            }
          }

          function bindEventsToWriter() {
            'writestart progress write abort'.split(' ').forEach(function (event) {
              writer['on' + event] = filesaver['on' + event];
            });
          }

          function onAbort() {
            writer.abort();
            filesaver.readyState = filesaver.DONE;
          }
        }
      }
    }
  }

  // on any filesys errors revert to saving with object URLs
  function saveUsingObjectURLs() {
    // don't create more object URLs than needed
    if (blobChanged || !objectUrl) {
      objectUrl = getURL().createObjectURL(blob);
    }

    execSave(objectUrl);
  }


  function execSave(objectUrl, file, event) {
    var newTab = view.open(objectUrl, '_blank');
    if ( newTab === undefined ) {
      /*
       * Apple do not allow window.open
       * see http://bit.ly/1kZffRI
       */
      view.location.href = objectUrl;
    }


    filesaver.readyState = filesaver.DONE;
    if( ! event ) {
      dispatchAll(filesaver);
    } else {
      dispatch(filesaver, 'writeend', event);
    }

    revoke(file || objectUrl);
  }


  function abortable(func) {
    return function () {
      if (filesaver.readyState !== filesaver.DONE) {
        return func.apply(this, arguments);
      }
    };
  }

}

function fileSaverAbort() {
  var filesaver = this;
  filesaver.readyState = filesaver.DONE;
  dispatch(filesaver, 'abort');
}


// TODO apply dispatch to FileSaver prototype
function dispatchAll(filesaver) {
  dispatch(filesaver, 'writestart progress write writeend'.split(' '));
}


function dispatch(filesaver, eventTypes, event) {
  eventTypes = [].concat(eventTypes);
  var i = eventTypes.length;
  while (i--) {
    var listener = filesaver['on' + eventTypes[i]];
    if (typeof listener === 'function') {
      try {
        listener.call(filesaver, event || filesaver);
      } catch (ex) {
        throwOutside(ex);
      }
    }
  }
}
