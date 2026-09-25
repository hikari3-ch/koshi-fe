document.addEventListener('DOMContentLoaded', function () {
  const messageTextarea = document.getElementById('message');
  const qrMessageTextarea = document.getElementById('message-qr');
  const stylingButtons = document.querySelectorAll('details.formatting-details button[data-emote], details.format-summary button[data-emote]');

  function insertText(text) {
    const cursorPos = messageTextarea.selectionStart;
    const textBefore = messageTextarea.value.substring(0, cursorPos);
    const textAfter = messageTextarea.value.substring(cursorPos);

    messageTextarea.value = textBefore + text + textAfter;

    const newCursorPos = cursorPos + text.length;
    messageTextarea.setSelectionRange(newCursorPos, newCursorPos);

    messageTextarea.focus();
  }

  function insertTextQR(text) {
    if (!qrMessageTextarea) return;

    const cursorPos = qrMessageTextarea.selectionStart;
    const textBefore = qrMessageTextarea.value.substring(0, cursorPos);
    const textAfter = qrMessageTextarea.value.substring(cursorPos);

    qrMessageTextarea.value = textBefore + text + textAfter;

    const newCursorPos = cursorPos + text.length;
    qrMessageTextarea.setSelectionRange(newCursorPos, newCursorPos);

    qrMessageTextarea.focus();
  }

  stylingButtons.forEach((button) => {
    button.addEventListener('click', function () {
      const tag = this.getAttribute('data-emote');
      const selectedText = messageTextarea.value.substring(messageTextarea.selectionStart, messageTextarea.selectionEnd);
      const qrSelectedText = qrMessageTextarea
        ? qrMessageTextarea.value.substring(qrMessageTextarea.selectionStart, qrMessageTextarea.selectionEnd)
        : '';

      if (selectedText) {
        const wrappedText = tag.replace('][', ']' + selectedText + '[');
        const start = messageTextarea.selectionStart;
        const end = messageTextarea.selectionEnd;
        messageTextarea.value = messageTextarea.value.substring(0, start) + wrappedText + messageTextarea.value.substring(end);
        if (qrMessageTextarea) {
          qrMessageTextarea.value = messageTextarea.value;
        }
      } else if (qrMessageTextarea && qrSelectedText) {
        const wrappedText = tag.replace('][', ']' + qrSelectedText + '[');
        const start = qrMessageTextarea.selectionStart;
        const end = qrMessageTextarea.selectionEnd;
        qrMessageTextarea.value = qrMessageTextarea.value.substring(0, start) + wrappedText + qrMessageTextarea.value.substring(end);
        messageTextarea.value = qrMessageTextarea.value;
      } else {
        insertText(tag);
        insertTextQR(tag);
      }
    });
  });
});
