function showTegakiReplay(e) {
  e.preventDefault();
  Tegaki.open({
    onCancel: function () {
      Tegaki.destroy();
    },
    onDone: function () {
      Tegaki.destroy();
    },
    replayMode: true,
    replayURL: e.currentTarget.href
  });
  Tegaki.setColorPalette(2);
}

function addReplayListeners(elem) {
  Array.from(elem.getElementsByClassName('replay-tegaki')).forEach((link) => {
    link.addEventListener('click', showTegakiReplay, false);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  addReplayListeners(document);
});

document.addEventListener('contentAdded', () => {
  addReplayListeners(document);
});
