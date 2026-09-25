function startTegakiDrawing() {
  Tegaki.open({
    saveReplay: true,
    onDone: function () {
      const now = Date.now();
      const replayBlob = Tegaki.replayRecorder && Tegaki.replayRecorder.toBlob();
      Tegaki.flatten().toBlob(function (imageBlob) {
        const files = [
          new File([imageBlob], `${now}-tegaki.png`, {
            type: 'image/png',
            lastModified: now
          })
        ];
        if (replayBlob) {
          files.push(
            new File([replayBlob], `${now}-tegaki.tgkr`, {
              type: 'tegaki/replay',
              lastModified: now
            })
          );
        }
        handleFilesUpload(files);
        setTimeout(() => {
          Tegaki.resetLayers();
          Tegaki.destroy();
        }, 100);
      }, 'image/png');
    },
    onCancel: function () {
      Tegaki.resetLayers();
      Tegaki.destroy();
    },
    width: 500,
    height: 500
  });

  Tegaki.resetLayers();
  Tegaki.setColorPalette(2);
}

document.getElementById('tegaki-btn').addEventListener('click', startTegakiDrawing);
